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
    Farmer Action Copilot.

    When OPENROUTER_API_KEY is set:
      Sends sanitised question + NASA field context to OpenRouter and
      returns a grounded, explainable response.

    When the key is missing or the API is unavailable:
      Returns a structured rule-based fallback grounded in available
      NASA POWER observations.

    The API key is never included in any response payload.
    """
    logger.info(
        "Copilot request | ai=%s | q_len=%d | ctx=%s",
        is_configured(), len(body.question), body.advisor_context is not None,
    )

    try:
        reply = await openrouter_chat(
            question=body.question,
            advisor_context=body.advisor_context,
        )
        return CopilotChatResponse(
            reply=reply,
            model=settings.OPENROUTER_MODEL,
            ai_powered=True,
        )

    except OpenRouterKeyMissingError:
        logger.info("Key not configured — returning rule-based fallback.")
        return CopilotChatResponse(
            reply=_rule_based_fallback(body.question, body.advisor_context),
            ai_powered=False,
            fallback_reason="OPENROUTER_API_KEY not configured.",
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


def _rule_based_fallback(question: str, ctx: Optional[dict]) -> str:
    """
    Generate a structured text reply from NASA field data when AI is off.
    Returns Markdown-formatted text suitable for the chat panel.
    """
    q = question.lower()
    env = (ctx or {}).get("environmental_context", {})
    loc = (ctx or {}).get("location", {})
    crops = (ctx or {}).get("crop_rotation_ranking", [])
    evidence = (ctx or {}).get("evidence_summary", [])

    lines: list[str] = [_FALLBACK_HEADER]

    if loc.get("label"):
        lines.append(f"**Location:** {loc['label']}\n")

    # Data context
    data_rows = []
    if (v := env.get("temperature_c")) is not None:
        data_rows.append(f"Mean temperature: **{v:.1f} °C** (NASA POWER T2M)")
    if (v := env.get("spi_3_recent")) is not None:
        tag = "near-normal" if abs(v) < 1.0 else ("dry" if v < 0 else "wet")
        data_rows.append(f"SPI-3 drought index: **{v:+.2f}** ({tag})")
    if (v := env.get("root_zone_wetness")) is not None:
        data_rows.append(f"Root-zone soil wetness: **{v:.3f}** (MERRA-2 proxy, 0–1 scale)")
    if (v := env.get("total_precip_mm")) is not None:
        data_rows.append(f"Total precipitation: **{v:.0f} mm**")
    if (v := env.get("cumulative_gdd")) is not None:
        data_rows.append(f"Cumulative GDD (base 10 °C): **{v:.0f} °C·days**")

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
                f"**Top crop match:** {top.get('name','?')} "
                f"(suitability score: {top.get('score',0):.2f})"
            )
            if len(crops) > 1:
                lines.append(
                    f"**Runner-up:** {crops[1].get('name','?')} "
                    f"(score: {crops[1].get('score',0):.2f})"
                )
            lines.append(
                "\n*Scores are heuristic comparisons based on GDD, "
                "precipitation and soil wetness thresholds — not validated crop models.*"
            )
        else:
            lines.append(
                "Run the field analysis first to generate crop suitability rankings "
                "for your location."
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
                "**Low root-zone moisture.** MERRA-2 soil wetness below 0.25. "
                "Consider supplemental irrigation and monitor crop water stress closely."
            )
        else:
            lines.append(
                "No acute water deficit detected in current NASA POWER data. "
                "Continue routine monitoring of SPI-3 and root-zone wetness."
            )

    elif any(kw in q for kw in ["heat","temperature","hot","warm"]):
        anom = env.get("temp_anomaly_c")
        if anom is not None and anom > 1.5:
            lines.append(
                f"**Heat signal present.** Temperature is {anom:+.1f} °C above the period mean. "
                "Consider earlier planting to avoid peak heat during flowering, "
                "or investigate locally-tested heat-tolerant varieties."
            )
        else:
            lines.append(
                "No significant heat anomaly detected in current NASA POWER data. "
                "Monitor growing-degree-day accumulation to track crop development."
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
