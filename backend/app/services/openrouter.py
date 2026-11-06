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
    "Rules you must follow:\n"
    "1. Base ALL recommendations on the NASA POWER / MERRA-2 field data provided "
    "in the user context. Never fabricate measurements, forecasts, yield figures, "
    "or satellite observations not present in the data.\n"
    "2. Clearly label AI-generated recommendations as advisory only.\n"
    "3. Distinguish between: (a) direct NASA observations, (b) model-derived "
    "estimates, and (c) your own analytical reasoning.\n"
    "4. Always state confidence limitations and recommend local agronomic expertise.\n"
    "5. Vegetation health figures are MERRA-2-derived environmental proxies — "
    "NOT direct MODIS NDVI measurements. Never call them NDVI.\n"
    "6. Do NOT provide pesticide doses, medical advice, or precise yield predictions.\n"
    "7. Keep responses concise and practical (max ~350 words).\n"
    "8. Structure each response as: Evidence from NASA data | Recommendation | "
    "Confidence and caveats.\n"
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


def _build_context_block(ctx: dict[str, Any]) -> str:
    """Render structured NASA field data as a plain-text context block."""
    lines = ["=== NASA AGROSCOPE FIELD DATA ==="]

    loc = ctx.get("location", {})
    if loc.get("label"):
        lines.append(
            f"Location : {loc['label']} "
            f"({loc.get('latitude', '?')}N, {loc.get('longitude', '?')}E)"
        )

    period = ctx.get("period", {})
    if period.get("start"):
        lines.append(f"Period   : {period['start']} to {period.get('end', '?')}")

    env = ctx.get("environmental_context", {})
    if env:
        lines.append("")
        lines.append("NASA POWER / MERRA-2 Derived Indicators:")
        mapping = [
            ("temperature_c",    "Mean temperature (T2M)",       ".1f", "degC"),
            ("temp_anomaly_c",   "Temperature anomaly",           "+.2f","degC vs period mean"),
            ("total_precip_mm",  "Total precipitation",           ".0f", "mm"),
            ("spi_3_recent",     "SPI-3 drought index",           "+.2f","(<-1=dry, >+1=wet)"),
            ("root_zone_wetness","Root-zone soil wetness fraction",".3f", "(fraction of saturation, 0.0-1.0 scale; values <0.25 indicate water deficit)"),
            ("cumulative_gdd",   "Cumulative GDD (base 10 degC)", ".0f", "degC-days"),
            ("dry_stress_pct",   "Dry-stress days",               ".1f", "%"),
            ("temp_trend",       "Multi-year temp trend",         None,  ""),
            ("precip_trend",     "Multi-year precip trend",       None,  ""),
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

    crops = ctx.get("crop_rotation_ranking", [])
    if crops:
        lines.append("")
        lines.append("Top crop suitability scores (heuristic, not validated model):")
        for c in crops[:3]:
            lines.append(f"  {c.get('name','?')}: score={c.get('score',0):.2f}")

    evidence = ctx.get("evidence_summary", [])
    if evidence:
        lines.append("")
        lines.append("Rule-based evidence flags:")
        for ev in evidence:
            lines.append(f"  - {ev}")

    lines.append("")
    lines.append(
        "IMPORTANT SCIENTIFIC INTERPRETATION RULES:\n"
        "- Root-zone soil wetness (GWETROOT) is a physical dimensionless fraction of "
        "saturation ranging strictly from 0.000 to 1.000 (0 = completely dry, 1 = saturated). "
        "It is NOT a standardized anomaly or z-score. A value < 0.25 indicates root-zone water stress.\n"
        "- Vegetation health figures are MERRA-2-derived environmental proxies, NOT direct MODIS NDVI measurements."
    )
    lines.append("=================================")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Main async function
# ---------------------------------------------------------------------------
async def openrouter_chat(
    question: str,
    advisor_context: dict[str, Any] | None = None,
) -> str:
    """
    Send a sanitised question to OpenRouter and return the reply text.

    Parameters
    ----------
    question : str
        User question (pre-validated and length-capped by the caller).
    advisor_context : dict | None
        Structured field data from the advisor endpoint.  Grounds the
        model in real NASA POWER observations.

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

    if advisor_context:
        messages.append({
            "role": "system",
            "content": (
                "The following is real NASA field data for the user's location:\n\n"
                + _build_context_block(advisor_context)
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
