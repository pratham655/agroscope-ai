"""
OpenRouter AI service — AGROSCOPE AI Farmer Action Copilot.

All requests to OpenRouter are made server-side only.
API credentials are NEVER forwarded to the browser or included in
any response payload or server logs.
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_CHAT_URL = f"{settings.OPENROUTER_BASE_URL}/chat/completions"

# ---------------------------------------------------------------------------
# System prompt — governs model behaviour
# ---------------------------------------------------------------------------
_SYSTEM_PROMPT = (
    "You are the AGROSCOPE AI Farmer Action Copilot, a specialised agricultural "
    "intelligence assistant grounded in NASA Earth observation science.\n\n"
    "SCIENTIFIC REASONING & ACCURACY RULES (MANDATORY):\n"
    "1. Base ALL recommendations on the NASA POWER / MERRA-2 field data provided "
    "in the user context. Never fabricate measurements, forecasts, yield figures, "
    "or satellite observations not present in the data.\n"
    "2. SEPARATE HEAT STRESS FROM WATER STRESS:\n"
    "   - NEVER use dry-stress days or soil moisture as a proxy for heat stress.\n"
    "   - Dry-stress days measure root-zone soil moisture deficit only (GWETROOT < 0.25).\n"
    "   - Heat stress must be evaluated strictly from temperature metrics (T2M_MAX, days >= 35°C, "
    "temperature anomalies vs. baseline). A field can have 0% dry-stress days while experiencing "
    "severe thermal heat stress.\n"
    "   - Negative or near-normal temperature anomalies do NOT rule out acute heat stress when daily "
    "maximums reach critical physiological thresholds (>= 35°C).\n"
    "   - 35°C is a general screening heuristic for pollen sterility/canopy stress, not an absolute botanical constant.\n"
    "   - If temperature metrics are missing, return: 'Insufficient data to assess heat stress.' "
    "Never conclude absence of heat stress without temperature evidence.\n"
    "3. SEPARATE ATMOSPHERIC DRYNESS (VPD) FROM ROOT-ZONE SOIL MOISTURE:\n"
    "   - Vapor pressure deficit (VPD) measures atmospheric evaporative demand, not soil wetness.\n"
    "   - A location can have adequate soil moisture and simultaneously high evaporative demand (driving severe "
    "crop transpirational pull), or vice-versa.\n"
    "   - NEVER infer low atmospheric evaporative demand solely from zero dry-stress days or soil moisture.\n"
    "   - If relative humidity or required atmospheric moisture variables are missing or not retrieved, state "
    "clearly: 'Insufficient data to assess atmospheric dryness (VPD)'.\n"
    "4. VALIDATE SOIL MOISTURE INTERPRETATION:\n"
    "   - Root-zone soil wetness (GWETROOT) is a dimensionless degree of saturation (0.000 to 1.000 scale) in the MERRA-2 "
    "Catchment Land Surface Model.\n"
    "   - The 0.25 threshold is an operational model heuristic representing the proxy for permanent wilting point.\n"
    "   - Values between 0.400 and 0.750 indicate adequate, favorable plant-available root-zone moisture under "
    "normal field capacity. Do NOT equate 0.60–0.75 with near-saturation, excessive wetness, or waterlogging.\n"
    "   - Distinguish adequate plant-available soil moisture from waterlogging (which requires prolonged saturation approaching 1.0 and hypoxic root conditions).\n"
    "5. WATERLOGGING RISK ASSESSMENT:\n"
    "   - Treat elevated soil moisture and high rainfall as supporting indicators, NOT direct proof of waterlogging.\n"
    "   - Regional reanalysis data (~50 km grid) cannot establish field-scale waterlogging without accounting for "
    "local slope, low-lying depressions, soil percolation/texture (clay vs. sandy loam), and drainage infrastructure.\n"
    "   - Explicitly state that on-site field observation and soil drainage inspection are necessary.\n"
    "6. PRECIPITATION TREND INTERPRETATION:\n"
    "   - Precipitation trends are derived from Ordinary Least Squares (OLS) linear regression of daily/monthly means over the observation period.\n"
    "   - Always format p=0.000 as p < 0.001.\n"
    "   - State the mathematically correct slope units (e.g. mm/day per day or °C/day).\n"
    "   - NEVER infer an increase in extreme rainfall frequency or storm intensity from an increasing average precipitation trend alone. "
    "Mean trends do not measure extreme high-intensity events (>50 mm/day).\n"
    "7. CROP SUITABILITY EXPLANATIONS:\n"
    "   - Explicitly label crop suitability scores as heuristic suitability indices (0–100 scale).\n"
    "   - Never present them as validated agronomic models or yield guarantees.\n"
    "   - Explain the contributing environmental variables: thermal GDD accumulation (35%), water balance (35%), "
    "temperature tolerance around optimal (20%), and environmental stress penalty.\n"
    "8. Clearly label AI-generated recommendations as advisory only. Distinguish: (a) direct observations, "
    "(b) model reanalysis estimates, (c) derived indicators, and (d) heuristic recommendations.\n"
    "9. Vegetation health figures are MERRA-2-derived environmental proxies — NOT direct MODIS NDVI measurements. Never call them NDVI.\n"
    "10. Do NOT provide chemical pesticide doses or precise yield predictions.\n"
    "11. You operate globally for arbitrary valid coordinates worldwide. Respect the local hemisphere: "
    "in the Southern Hemisphere (latitude < 0), seasonal cycles are inverted (summer is Dec–Feb, winter is Jun–Aug).\n"
    "12. NATURAL, HUMAN-READABLE RESPONSE PRESENTATION (MANDATORY):\n"
    "   - Write like an experienced, thoughtful agricultural advisor speaking clearly to a farm operator.\n"
    "   - Use clean, natural paragraphs. Use simple numbered lists (e.g. 1., 2., 3.) when offering step-by-step agronomic recommendations.\n"
    "   - DO NOT use rigid, repetitive boilerplate section headings like 'Evidence from NASA data | Recommendation | Confidence and caveats' or '**Evidence:**' / '**Recommendation:**' on every answer.\n"
    "   - DO NOT output raw internal NASA/model parameter variable names such as GWETROOT, PRECTOTCORR, T2M_MAX, or ALLSKY_SFC_SW_DWN in user responses. Always translate them into plain English concepts: 'root-zone soil wetness fraction', 'daily precipitation', 'daily maximum temperature', 'solar irradiance'.\n"
    "   - Avoid double-escaped asterisks (\\*\\*), raw backslashes, or unparsed HTML tags. Keep responses clean, focused, and under 350 words.\n"
)


# ---------------------------------------------------------------------------
# Public exceptions
# ---------------------------------------------------------------------------
class OpenRouterKeyMissingError(Exception):
    """Raised when OPENROUTER_API_KEY is not configured."""


class OpenRouterUnavailableError(Exception):
    """Raised when OpenRouter is unreachable, times out, or returns non-2xx."""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def is_configured() -> bool:
    """Return True if the API key is set (non-empty string)."""
    return bool(settings.OPENROUTER_API_KEY.strip())


def _build_context_block(
    ctx: dict[str, Any] | None = None,
    req_lat: float | None = None,
    req_lon: float | None = None,
    req_label: str | None = None,
) -> str:
    """Render structured NASA field data as a plain-text context block."""
    lines = ["=== NASA AGROSCOPE FIELD DATA ==="]

    target_lat = req_lat
    target_lon = req_lon
    target_label = req_label

    if ctx:
        loc = ctx.get("location", {})
        if target_lat is None:
            target_lat = loc.get("latitude")
        if target_lon is None:
            target_lon = loc.get("longitude")
        if target_label is None:
            target_label = loc.get("label")

        # Double check coordinates match if both are specified
        if req_lat is not None and loc.get("latitude") is not None:
            if abs(req_lat - float(loc["latitude"])) > 0.1 or abs(req_lon - float(loc["longitude"])) > 0.1:
                raise ValueError(
                    f"Location mismatch in context block: requested ({req_lat}, {req_lon}) vs data ({loc.get('latitude')}, {loc.get('longitude')})"
                )

    if target_lat is not None and target_lon is not None:
        lat_dir = "N" if target_lat >= 0 else "S"
        lon_dir = "E" if target_lon >= 0 else "W"
        hemi = "Southern Hemisphere" if target_lat < 0 else "Northern Hemisphere"
        loc_str = target_label or f"{target_lat:.4f}, {target_lon:.4f}"
        lines.append(f"Target Location : {loc_str} ({abs(target_lat):.4f}°{lat_dir}, {abs(target_lon):.4f}°{lon_dir} — {hemi})")
    elif target_label:
        lines.append(f"Target Location : {target_label}")

    if not ctx:
        lines.append("Telemetry Status: Telemetry pending initialization for this location.")
        lines.append("Instruction: Do NOT fabricate satellite observations from another region.")
        lines.append("=================================")
        return "\n".join(lines)

    crop_target = ctx.get("crop") or ctx.get("selected_crop")
    if crop_target:
        lines.append(f"Target Crop : {crop_target}")

    period = ctx.get("period", {})
    if period.get("start"):
        lines.append(f"Period   : {period['start']} to {period.get('end', '?')}")

    env = ctx.get("environmental_context", {})
    if env:
        lines.append("")
        lines.append("NASA POWER / MERRA-2 Derived Indicators:")
        mapping = [
            ("temperature_c",    "Mean temperature (T2M)",       ".1f", "°C"),
            ("temp_anomaly_c",   "Temperature anomaly",           "+.2f","°C vs period mean"),
            ("total_precip_mm",  "Total precipitation",           ".0f", "mm"),
            ("spi_3_recent",     "SPI-3 drought index",           "+.2f","(<-1=dry, >+1=wet)"),
            ("root_zone_wetness","Root-zone soil wetness fraction",".3f", "(fraction of saturation, 0.0-1.0 scale; values <0.25 indicate water deficit; 0.40–0.75=adequate moisture; not waterlogging)"),
            ("cumulative_gdd",   "Cumulative GDD (base 10 °C)",   ".0f", "°C·days"),
            ("dry_stress_pct",   "Soil dry-stress days (GWETROOT < 0.25)", ".1f", "% of days (measures root-zone moisture deficit only, NOT heat stress)"),
            ("temp_trend",       "Temperature linear trend",      None,  ""),
            ("precip_trend",     "Precipitation linear trend",    None,  ""),
            ("precip_trend_p_display", "Precipitation trend p-value", None, "(OLS regression on mean precipitation; does NOT infer extreme storm frequency)"),
            ("heat_stress_assessment", "Heat stress assessment (T2M_MAX)", None, ""),
            ("heat_stress_days_35c",   "Extreme heat days (T_max >= 35°C)", None, "days"),
            ("max_tmax_c",       "Peak maximum temperature (T_max)", ".1f", "°C"),
            ("mean_vpd_kpa",     "Mean vapor pressure deficit (VPD)", ".2f", "kPa (atmospheric evaporative demand; decoupled from soil moisture)"),
            ("max_vpd_kpa",      "Peak vapor pressure deficit (VPD)", ".2f", "kPa"),
            ("vpd_assessment",   "Atmospheric dryness assessment",   None, ""),
        ]
        for key, label, fmt, unit in mapping:
            val = env.get(key)
            if val is None:
                continue
            if fmt:
                val_str = format(val, fmt)
            else:
                val_str = str(val)
            lines.append(f"  {label}: {val_str} {unit}".rstrip())

    # If heat stress assessment is missing from env context, flag explicitly
    if env and not env.get("heat_stress_assessment"):
        lines.append("  Heat stress assessment: Insufficient data to assess heat stress (T2M_MAX missing)")

    # If atmospheric dryness / VPD assessment is missing from env context, flag explicitly
    if env and not env.get("vpd_assessment") and env.get("mean_vpd_kpa") is None:
        lines.append("  Atmospheric dryness (VPD): Insufficient data to assess atmospheric dryness (VPD) (RH2M missing)")

    crops = ctx.get("crop_rotation_ranking", [])
    if crops:
        lines.append("")
        lines.append("Top crop suitability scores (heuristic matching index 0–100, NOT a validated yield model):")
        for c in crops[:3]:
            factors = c.get("contributing_factors", {})
            factor_str = f" [GDD={factors.get('gdd_satisfaction_score', '?')}%, Water={factors.get('water_balance_score', '?')}%, Temp={factors.get('temperature_tolerance_score', '?')}%]" if factors else ""
            lines.append(f"  {c.get('name','?')}: heuristic score = {c.get('score',0):.1f}/100{factor_str}")

    evidence = ctx.get("evidence_summary", [])
    if evidence:
        lines.append("")
        lines.append("Rule-based evidence flags:")
        for ev in evidence:
            lines.append(f"  - {ev}")

    lines.append("")
    lines.append(
        "CRITICAL SCIENTIFIC INTERPRETATION REMINDERS:\n"
        "- NEVER confuse dry-stress days with heat stress. Dry-stress days measure root-zone soil water deficit (GWETROOT < 0.25). Heat stress is determined strictly by temperature (T_max >= 35°C, thermal anomalies).\n"
        "- Decouple atmospheric dryness (VPD) completely from root-zone soil moisture. If relative humidity is missing, do NOT infer low evaporative demand from 0 dry-stress days; state 'Insufficient data to assess atmospheric dryness (VPD)'.\n"
        "- Root-zone soil wetness (GWETROOT) is a physical dimensionless fraction (0.0 to 1.0). It is NOT a standardized anomaly or z-score. Values around 0.60–0.75 represent adequate plant-available moisture; do NOT claim near-saturation or waterlogging.\n"
        "- Elevated rainfall or soil wetness does NOT prove waterlogging. Waterlogging is a localized phenomenon requiring field-level inspection of topography (depressions), soil texture/percolation, and drainage.\n"
        "- Linear precipitation trends reflect OLS trajectories of mean precipitation (report p=0.000 as p < 0.001; specify slope units). They do NOT measure or infer changes in extreme storm frequency or intensity.\n"
        "- Crop suitability scores are mathematical matching heuristics (0–100), not agronomic yield models."
    )
    lines.append("=================================")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Main async function
# ---------------------------------------------------------------------------
async def openrouter_chat(
    question: str,
    advisor_context: dict[str, Any] | None = None,
    *,
    requested_latitude: float | None = None,
    requested_longitude: float | None = None,
    canonical_location_label: str | None = None,
) -> str:
    """
    Send a sanitised question to OpenRouter and return the reply text.

    Parameters
    ----------
    question : str
        User question (pre-validated and length-capped by the caller).
    advisor_context : dict | None
        Structured field data from the advisor endpoint. Grounds the
        model in real NASA POWER observations.
    requested_latitude : float | None
        User's requested latitude.
    requested_longitude : float | None
        User's requested longitude.
    canonical_location_label : str | None
        User's requested location label.

    Raises
    ------
    OpenRouterKeyMissingError
        When OPENROUTER_API_KEY is not set.
    OpenRouterUnavailableError
        When the API call fails for any reason.
    """
    if not is_configured():
        raise OpenRouterKeyMissingError("OPENROUTER_API_KEY is not configured.")

    messages: list[dict[str, str]] = [
        {"role": "system", "content": _SYSTEM_PROMPT}
    ]

    context_block = _build_context_block(
        ctx=advisor_context,
        req_lat=requested_latitude,
        req_lon=requested_longitude,
        req_label=canonical_location_label,
    )

    messages.append({
        "role": "system",
        "content": (
            "The following is active location context and verified NASA field data:\n\n"
            + context_block
        ),
    })

    messages.append({"role": "user", "content": question})

    payload: dict[str, Any] = {
        "model": settings.OPENROUTER_MODEL,
        "messages": messages,
        "max_tokens": settings.OPENROUTER_MAX_TOKENS,
        "temperature": 0.3,
        "stream": False,
    }

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "HTTP-Referer": "https://agroscope-ai.vercel.app",
        "X-Title": "AGROSCOPE AI",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=settings.OPENROUTER_TIMEOUT_S) as client:
            resp = await client.post(_CHAT_URL, json=payload, headers=headers)
    except httpx.TimeoutException as exc:
        logger.warning("OpenRouter timeout: %s", exc)
        raise OpenRouterUnavailableError("OpenRouter request timed out.") from exc
    except httpx.RequestError as exc:
        logger.warning("OpenRouter network error: %s", exc)
        raise OpenRouterUnavailableError(f"Network error: {exc}") from exc

    if resp.status_code == 401:
        logger.warning("OpenRouter 401 — key may be invalid.")
        raise OpenRouterUnavailableError("OpenRouter authentication failed (401).")
    if resp.status_code == 402:
        logger.warning("OpenRouter 402 — credits exhausted.")
        raise OpenRouterUnavailableError("OpenRouter credits exhausted (402).")
    if resp.status_code == 429:
        logger.warning("OpenRouter 429 — rate limited.")
        raise OpenRouterUnavailableError("OpenRouter rate limit reached (429).")
    if not resp.is_success:
        logger.warning("OpenRouter HTTP %d", resp.status_code)
        raise OpenRouterUnavailableError(f"OpenRouter HTTP {resp.status_code}.")

    try:
        data = resp.json()
        reply: str = data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, ValueError) as exc:
        logger.error("Unexpected OpenRouter response shape: %s", exc)
        raise OpenRouterUnavailableError("Unexpected response format from OpenRouter.") from exc

    # Belt-and-suspenders: strip key if it somehow appears in model output
    key = settings.OPENROUTER_API_KEY
    if key and key in reply:
        logger.error("API key found in model reply — stripping.")
        reply = "[Response redacted for security.]"

    return reply
