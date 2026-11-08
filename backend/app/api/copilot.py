"""
Farmer Action Copilot — POST /api/copilot/chat and GET /api/copilot/status.

Security model:
  - API key lives in backend/.env only.
  - Key is NEVER echoed in responses, error messages or logs.
  - Browser never contacts OpenRouter directly.
  - Inputs are validated and length-capped before forwarding.
"""
from __future__ import annotations

import html
import logging
import re
from typing import Any, Optional

from fastapi import APIRouter, Body, HTTPException
from pydantic import BaseModel, Field, field_validator

from app.core.config import settings
from app.services.openrouter import (
    OpenRouterKeyMissingError,
    OpenRouterUnavailableError,
    is_configured,
    openrouter_chat,
)

router = APIRouter()
logger = logging.getLogger(__name__)

_MAX_Q_LEN = 1000  # hard cap on user input

_FALLBACK_HEADER = (
    "**AGROSCOPE AI Copilot — Fallback Mode**\n\n"
    "*The OpenRouter AI engine is currently unavailable. "
    "The following guidance is generated from the rule-based scientific "
    "pipeline using your NASA POWER field data.*\n"
)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class CopilotChatRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=_MAX_Q_LEN)
    requested_latitude: float = Field(..., ge=-90.0, le=90.0)
    requested_longitude: float = Field(..., ge=-180.0, le=180.0)
    canonical_location_label: Optional[str] = Field(None, max_length=200)
    location_revision: Optional[int] = Field(None, description="Client-side location revision sequence")
    data_latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    data_longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    data_retrieval_timestamp: Optional[str] = Field(None, max_length=50)
    advisor_context: Optional[dict[str, Any]] = Field(
        None,
        description="Structured field data from GET /api/advisor/recommendations",
    )

    @field_validator("question")
    @classmethod
    def sanitise(cls, v: str) -> str:
        v = v.strip()
        v = html.escape(v)
        v = re.sub(r"\s{3,}", "  ", v)
        return v


class CopilotChatResponse(BaseModel):
    reply: str
    model: Optional[str] = None
    ai_powered: bool
    fallback_reason: Optional[str] = None
    mismatch_detected: bool = False
    requested_latitude: float
    requested_longitude: float
    canonical_location_label: Optional[str] = None
    data_latitude: Optional[float] = None
    data_longitude: Optional[float] = None
    location_match: bool = True
    disclaimer: str = (
        "AI-generated recommendation grounded in NASA POWER / MERRA-2 data "
        "where provided. Always verify with local agronomic expertise."
    )


class CopilotStatusResponse(BaseModel):
    ai_powered: bool
    model: Optional[str]
    status: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.get("/status", response_model=CopilotStatusResponse)
async def copilot_status():
    """Return copilot capability status — no credentials exposed."""
    configured = is_configured()
    return CopilotStatusResponse(
        ai_powered=configured,
        model=settings.OPENROUTER_MODEL if configured else None,
        status="ai_active" if configured else "fallback_mode",
    )


@router.post("/chat", response_model=CopilotChatResponse)
async def copilot_chat(body: CopilotChatRequest = Body(...)):
    """
    Farmer Action Copilot with Strict Location-Consistency Verification.

    Validates that any attached environmental telemetry strictly matches the
    user's requested coordinates (within 0.1° / ~11 km bounding tolerance).
    If a location mismatch is detected (e.g. user requested Mumbai but received
    stale Punjab telemetry), the analysis is blocked immediately.
    """
    logger.info(
        "Copilot request | req=(%s, %s, %s) | q_len=%d | ctx=%s",
        body.requested_latitude, body.requested_longitude,
        body.canonical_location_label, len(body.question),
        body.advisor_context is not None,
    )

    # 1. Coordinate Extraction & Mismatch Validation
    data_lat = body.data_latitude
    data_lon = body.data_longitude
    ctx_label = None

    if body.advisor_context and isinstance(body.advisor_context.get("location"), dict):
        ctx_loc = body.advisor_context["location"]
        ctx_label = ctx_loc.get("label")
        if data_lat is None and "latitude" in ctx_loc:
            try:
                data_lat = float(ctx_loc["latitude"])
            except (TypeError, ValueError):
                pass
        if data_lon is None and "longitude" in ctx_loc:
            try:
                data_lon = float(ctx_loc["longitude"])
            except (TypeError, ValueError):
                pass

    COORD_TOLERANCE = 0.1  # ~11 km bounding box

    if data_lat is not None and data_lon is not None:
        lat_diff = abs(body.requested_latitude - data_lat)
        lon_diff = abs(body.requested_longitude - data_lon)
        if lat_diff > COORD_TOLERANCE or lon_diff > COORD_TOLERANCE:
            req_name = body.canonical_location_label or f"{body.requested_latitude:.4f}, {body.requested_longitude:.4f}"
            ctx_name = ctx_label or f"{data_lat:.4f}, {data_lon:.4f}"
            mismatch_reply = (
                f"Your selected location is {req_name} ({body.requested_latitude:.4f}, {body.requested_longitude:.4f}), "
                f"but the available environmental dataset belongs to {ctx_name} ({data_lat:.4f}, {data_lon:.4f}). "
                f"I cannot provide a location-specific analysis until the correct data is retrieved."
            )
            logger.warning(
                "Copilot location mismatch BLOCKED: requested=(%s, %s) vs data=(%s, %s)",
                body.requested_latitude, body.requested_longitude, data_lat, data_lon,
            )
            return CopilotChatResponse(
                reply=mismatch_reply,
                model="Location Integrity Engine",
                ai_powered=False,
                fallback_reason="Location-context mismatch detected. Stale or cross-location telemetry blocked.",
                mismatch_detected=True,
                requested_latitude=body.requested_latitude,
                requested_longitude=body.requested_longitude,
                canonical_location_label=body.canonical_location_label,
                data_latitude=data_lat,
                data_longitude=data_lon,
                location_match=False,
            )

    # 2. Forward to OpenRouter AI or Rule-Based Fallback
    try:
        reply = await openrouter_chat(
            question=body.question,
            advisor_context=body.advisor_context,
            requested_latitude=body.requested_latitude,
            requested_longitude=body.requested_longitude,
            canonical_location_label=body.canonical_location_label,
        )
        return CopilotChatResponse(
            reply=reply,
            model=settings.OPENROUTER_MODEL,
            ai_powered=True,
            requested_latitude=body.requested_latitude,
            requested_longitude=body.requested_longitude,
            canonical_location_label=body.canonical_location_label,
            data_latitude=data_lat,
            data_longitude=data_lon,
            location_match=True,
        )

    except OpenRouterKeyMissingError:
        logger.info("Key not configured — returning rule-based fallback.")
        return CopilotChatResponse(
            reply=_rule_based_fallback(
                question=body.question,
                ctx=body.advisor_context,
                req_lat=body.requested_latitude,
                req_lon=body.requested_longitude,
                req_label=body.canonical_location_label,
            ),
            ai_powered=False,
            fallback_reason="OPENROUTER_API_KEY not configured.",
            requested_latitude=body.requested_latitude,
            requested_longitude=body.requested_longitude,
            canonical_location_label=body.canonical_location_label,
            data_latitude=data_lat,
            data_longitude=data_lon,
            location_match=True,
        )

    except OpenRouterUnavailableError as exc:
        safe_msg = _safe_str(exc)
        logger.warning("OpenRouter unavailable: %s", safe_msg)
        return CopilotChatResponse(
            reply=(
                "**Copilot temporarily unavailable.**\n\n"
                f"*Reason: {safe_msg}*\n\n"
                "Please use the Adaptation Pathways and Evidence panels "
                "in the right column for NASA-grounded recommendations."
            ),
            ai_powered=False,
            fallback_reason=safe_msg,
            requested_latitude=body.requested_latitude,
            requested_longitude=body.requested_longitude,
            canonical_location_label=body.canonical_location_label,
            data_latitude=data_lat,
            data_longitude=data_lon,
            location_match=True,
        )

    except Exception as exc:
        logger.error("Unexpected copilot error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal error. Please try again.") from exc


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _safe_str(exc: Exception) -> str:
    """Return error string with any API key redacted."""
    msg = str(exc)
    key = settings.OPENROUTER_API_KEY
    if key and key in msg:
        msg = "[credential redacted]"
    return msg


def _rule_based_fallback(
    question: str,
    ctx: Optional[dict],
    req_lat: float,
    req_lon: float,
    req_label: Optional[str] = None,
) -> str:
    """
    Generate a structured text reply from NASA field data when AI is off.
    Returns Markdown-formatted text suitable for the chat panel.
    Strictly verifies location matches requested coordinates.
    """
    q = question.lower()
    target_name = req_label or f"{req_lat:.4f}, {req_lon:.4f}"
    lines: list[str] = [_FALLBACK_HEADER]

    if not ctx or not ctx.get("environmental_context"):
        lines.append(f"**Location:** {target_name} ({req_lat:.4f}, {req_lon:.4f})\n")
        lines.append(
            f"⚠️ **Telemetry Notice:** No verified NASA POWER environmental observations are currently loaded for {target_name}.\n\n"
            "Please select and initialize your field location to retrieve real-time satellite and agroclimatological indicators."
        )
        return "\n".join(lines)

    env = ctx.get("environmental_context", {})
    loc = ctx.get("location", {})
    crops = ctx.get("crop_rotation_ranking", [])
    evidence = ctx.get("evidence_summary", [])

    lines.append(f"**Location:** {loc.get('label', target_name)} ({req_lat:.4f}, {req_lon:.4f})\n")

    # Data context
    data_rows = []
    if (v := env.get("temperature_c")) is not None:
        data_rows.append(f"Mean temperature: **{v:.1f} °C** (NASA POWER T2M)")
    if (v := env.get("heat_stress_assessment")) is not None:
        data_rows.append(f"Heat stress assessment: **{v}**")
    else:
        data_rows.append("Heat stress assessment: **Insufficient data to assess heat stress**")
    if (v := env.get("spi_3_recent")) is not None:
        tag = "near-normal" if abs(v) < 1.0 else ("dry" if v < 0 else "wet")
        data_rows.append(f"SPI-3 drought index: **{v:+.2f}** ({tag})")
    if (v := env.get("root_zone_wetness")) is not None:
        data_rows.append(f"Root-zone soil wetness: **{v:.3f}** (GWETROOT dimensionless degree of saturation 0–1; 0.25=operational wilting proxy)")
    if (v := env.get("total_precip_mm")) is not None:
        data_rows.append(f"Total precipitation: **{v:.0f} mm**")
    if (v := env.get("cumulative_gdd")) is not None:
        data_rows.append(f"Cumulative GDD (base 10 °C): **{v:.0f} °C·days**")
    if (v := env.get("precip_trend")) is not None:
        p_disp = env.get("precip_trend_p_display", "")
        data_rows.append(f"Precipitation trend: **{v}** ({p_disp}, OLS mean trend; does not infer extreme storm frequency)")

    if data_rows:
        lines.append("**NASA POWER Data Summary:**")
        for r in data_rows:
            lines.append(f"  • {r}")
        lines.append("")

    if evidence:
        lines.append("**Active alert flags:**")
        for ev in evidence:
            lines.append(f"  ⚠️ {ev}")
        lines.append("")

    # Topic-specific guidance
    if any(kw in q for kw in ["maize","corn","sorghum","wheat","crop","plant","rotation","seed"]):
        if crops:
            top = crops[0]
            lines.append(
                f"**Top crop match (heuristic index):** {top.get('name','?')} "
                f"(heuristic suitability score: {top.get('score',0):.1f}/100)"
            )
            if len(crops) > 1:
                lines.append(
                    f"**Runner-up (heuristic index):** {crops[1].get('name','?')} "
                    f"(heuristic score: {crops[1].get('score',0):.1f}/100)"
                )
            lines.append(
                "\n*Notice: Scores are mathematical heuristic comparisons based on GDD thermal satisfaction (35%), "
                "precipitation balance (35%), and temperature tolerance (20%) — not validated agronomic yield models.*"
            )
        else:
            lines.append(
                "Run the field analysis first to generate crop suitability rankings "
                "for your location."
            )

    elif any(kw in q for kw in ["waterlog", "flood", "drainage"]):
        swet = env.get("root_zone_wetness")
        precip = env.get("total_precip_mm")
        lines.append(
            "**Waterlogging Risk Assessment (Supporting Indicator):**\n"
            f"Precipitation ({precip if precip is not None else 'N/A'} mm) and root-zone wetness ({swet if swet is not None else 'N/A'}) "
            "provide regional supporting context, NOT direct proof of field waterlogging.\n\n"
            "Coarse-grid reanalysis (~50 km) cannot account for field-level micro-topography, surface depressions, "
            "soil infiltration rates (clay vs sandy loam), or existing drainage ditches. "
            "On-site inspection of drainage systems and surface ponding is strictly necessary."
        )

    elif any(kw in q for kw in ["water","irrigat","moisture","drought","dry","rain"]):
        spi = env.get("spi_3_recent")
        swet = env.get("root_zone_wetness")
        if spi is not None and spi < -1.0:
            lines.append(
                "**Water deficit detected.** SPI-3 below −1.0 indicates drought stress. "
                "Prioritise deficit irrigation at critical growth stages. "
                "Consider mulching to reduce surface evaporation."
            )
        elif swet is not None and swet < 0.25:
            lines.append(
                f"**Low root-zone moisture ({swet:.3f}).** Value is below the operational 0.25 threshold "
                "(proxy for permanent wilting point). Consider supplemental irrigation."
            )
        elif swet is not None and 0.40 <= swet <= 0.75:
            lines.append(
                f"**Adequate root-zone soil moisture ({swet:.3f}).** Values between 0.40 and 0.75 represent "
                "favorable plant-available moisture under normal field capacity (not waterlogging or drought)."
            )
        else:
            lines.append(
                "No acute water deficit detected in current NASA POWER data. "
                "Continue routine monitoring of SPI-3 and root-zone wetness."
            )

    elif any(kw in q for kw in ["heat","temperature","hot","warm"]):
        heat_desc = env.get("heat_stress_assessment")
        heat_status = env.get("heat_stress_status")
        days_35 = env.get("heat_stress_days_35c")
        max_t = env.get("max_tmax_c")

        if heat_status == "insufficient_data" or not heat_desc:
            lines.append(
                "**Heat stress assessment:** Insufficient data to assess heat stress. "
                "NASA POWER daily maximum temperature (T2M_MAX) records are required to evaluate thermal threshold exceedances (>= 35°C) and canopy heat shock."
            )
        elif days_35 and days_35 > 0:
            lines.append(
                f"**Heat exposure detected:** {heat_desc} (peak {max_t}°C). "
                "Consider earlier planting to avoid peak heat during flowering, or investigate locally-tested heat-tolerant varieties. "
                "Note: Soil dry-stress days cannot be used to infer atmospheric thermal stress."
            )
        else:
            lines.append(
                f"**Heat stress evaluation:** {heat_desc} (peak {max_t}°C). "
                "Zero days exceeded 35°C critical threshold. Note: Thermal evaluation is decoupled from soil moisture."
            )

    elif any(kw in q for kw in ["soil","compost","organic","nitrogen","legume"]):
        lines.append(
            "**Soil health guidance:** Introduce nitrogen-fixing legumes (soybean, "
            "field pea) to restore soil nitrogen. Consider deep-rooted cover crops "
            "during fallow periods to reduce erosion and improve organic matter. "
            "Consult local agronomists for variety selection."
        )

    else:
        lines.append(
            "Please refer to the **Adaptation Pathways** and **Evidence Context** panels "
            "on the right for NASA-grounded recommendations tailored to your location. "
            "You can also try asking about: crop selection, irrigation, heat stress, "
            "soil health, or drought adaptation."
        )

    lines.append(
        "\n---\n"
        "*To activate the AI-powered Copilot, set `OPENROUTER_API_KEY` in "
        "`backend/.env` and restart the backend.*"
    )
    return "\n".join(lines)
