"""Reports router — generate downloadable field intelligence reports."""

from fastapi import APIRouter, Query, Response
from datetime import date, datetime
import json
import logging

from app.api.field_intelligence import analyze_field

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/field-report")
async def generate_field_report(
    latitude:   float = Query(..., ge=-90,  le=90),
    longitude:  float = Query(..., ge=-180, le=180),
    start_date: date  = Query(default=None),
    end_date:   date  = Query(default=None),
    label:      str   = Query(default="Selected Location"),
    format:     str   = Query(default="json", description="Output format: json | markdown"),
):
    """
    Generate a downloadable Field Intelligence Report.

    Runs the full analysis pipeline and returns structured or
    markdown-formatted output suitable for download or sharing.
    """
    report_data = await analyze_field(
        latitude=latitude, longitude=longitude,
        start_date=start_date, end_date=end_date, label=label,
    )

    if format == "markdown":
        md = _render_markdown(report_data)
        return Response(
            content=md,
            media_type="text/markdown",
            headers={
                "Content-Disposition": f'attachment; filename="agroscope-report-{label.replace(" ", "_")}.md"'
            },
        )

    return report_data


def _render_markdown(data: dict) -> str:
    loc    = data.get("location", {})
    period = data.get("period", {})
    stress = data.get("stress", {})
    crops  = data.get("crop_recommendations", [])
    findings = data.get("key_findings", [])
    is_demo  = data.get("is_demo", False)

    lines = [
        "# AGROSCOPE AI — Field Intelligence Report",
        f"**Generated:** {data.get('generated_at', '')}",
        f"**NASA Space Apps Challenge 2026 — Field Shift**",
        "",
    ]

    if is_demo:
        lines += [
            "> ⚠️ **DEMONSTRATION DATA**",
            "> The NASA POWER API was unavailable. Data shown is statistically realistic",
            "> demonstration data — NOT real satellite observations.",
            "",
        ]

    lines += [
        "## Location",
        f"- **Label:** {loc.get('label', 'N/A')}",
        f"- **Latitude:** {loc.get('latitude', 'N/A')}°",
        f"- **Longitude:** {loc.get('longitude', 'N/A')}°",
        f"- **Analysis Period:** {period.get('start')} → {period.get('end')} ({period.get('days', '?')} days)",
        "",
        "## Key Findings",
    ]
    for f in findings:
        lines.append(f"- {f}")

    lines += [
        "",
        "## Agricultural Stress Assessment",
        f"- **Composite Score:** {stress.get('score', 'N/A')}/100",
        f"- **Level:** {stress.get('level', 'N/A')}",
        f"- **Confidence:** {stress.get('confidence', 'N/A')}",
        f"- *{stress.get('note', '')}*",
        "",
        "## Crop Rotation Recommendations",
        "| Crop | Score | GDD Available/Required | Water Available/Required |",
        "|------|-------|------------------------|--------------------------|",
    ]
    for c in crops[:5]:
        lines.append(
            f"| {c['name']} | {c['score']:.0f} | "
            f"{c['gdd_available']:.0f} / {c['gdd_required']} °C·day | "
            f"{c['precip_mm']:.0f} / {c['water_need_mm']} mm |"
        )

    lines += [
        "",
        "## Data Sources",
    ]
    for ds in data.get("data_sources", []):
        lines.append(f"- **{ds['name']}** ({ds['type']}) — [{ds['url']}]({ds['url']})")

    lines += [
        "",
        "## Methodology",
        data.get("methodology", ""),
        "",
        "## Limitations",
        data.get("limitations", ""),
        "",
        "---",
        "*AGROSCOPE AI — Earth Intelligence for Smarter Agriculture*",
        "*NASA Space Apps Challenge 2026 | Field Shift*",
    ]

    return "\n".join(lines)
