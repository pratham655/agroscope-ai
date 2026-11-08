"""AI Agricultural Advisor — rule-based expert recommendations."""

from fastapi import APIRouter, Query, HTTPException, Body
from datetime import date
from typing import Optional, List
import numpy as np
import logging

from app.services.nasa_power import fetch_daily_power
from app.services.science import (
    calculate_spi, analyze_soil_moisture, linear_trend,
    score_crop_rotation, cumulative_gdd, analyze_heat_stress,
)

router = APIRouter()
logger = logging.getLogger(__name__)

# ─── Adaptation strategy knowledge base ──────────────────────────────────────

ADAPTATION_STRATEGIES: dict = {
    "water_deficit": {
        "title":  "Water Conservation Strategies",
        "strategies": [
            "Investigate deficit-irrigation scheduling — apply water only at critical crop growth stages.",
            "Explore mulching to reduce soil evaporation between crop rows.",
            "Consider drip or micro-irrigation if surface evaporation losses are high.",
            "Assess rainwater harvesting feasibility for supplemental irrigation.",
            "Monitor soil moisture regularly (in-situ probes or satellite products like SMAP).",
        ],
        "data_basis": "SPI-3 below −1.0 or root-zone wetness below 0.25 critical threshold",
    },
    "heat_stress": {
        "title":  "Heat Stress Adaptation",
        "strategies": [
            "Explore earlier planting dates to avoid peak summer heat during flowering.",
            "Investigate heat-tolerant crop varieties suited to local conditions.",
            "Consider cover crops during fallow periods to reduce soil surface temperature.",
            "Monitor GDD accumulation to optimize harvest timing.",
        ],
        "data_basis": "Recent temperature significantly above seasonal average",
    },
    "soil_health": {
        "title":  "Soil Health and Rotation",
        "strategies": [
            "Introduce nitrogen-fixing legumes (soybean, legume cover crop) to restore soil nitrogen.",
            "Consider deep-rooted crops (sunflower, sorghum) to break compaction and improve drainage.",
            "Maintain fallow periods with cover crops rather than bare soil to reduce erosion.",
            "Test soil organic matter and pH before major crop rotation changes.",
        ],
        "data_basis": "Multi-year soil wetness patterns and crop rotation scoring",
    },
    "precipitation_variability": {
        "title":  "Managing Precipitation Variability",
        "strategies": [
            "Diversify crop types to spread climate risk across the season.",
            "Explore drought-resilient varieties with shorter growing seasons.",
            "Maintain SPI-3 monitoring to track drought onset early.",
            "Invest in on-farm water storage where feasible.",
        ],
        "data_basis": "Increasing precipitation variability detected in trend analysis",
    },
    "general_monitoring": {
        "title":  "Ongoing Environmental Monitoring",
        "strategies": [
            "Monitor NDVI trends via NASA GIBS satellite imagery throughout the growing season.",
            "Track root-zone soil moisture to guide irrigation decisions.",
            "Compare growing-season precipitation to historical baselines each year.",
            "Review annual GDD accumulation to evaluate changing growing season length.",
        ],
        "data_basis": "Baseline recommendation for all locations",
    },
}


@router.get("/recommendations")
async def get_recommendations(
    latitude:   float = Query(..., ge=-90,  le=90),
    longitude:  float = Query(..., ge=-180, le=180),
    start_date: date  = Query(default=None),
    end_date:   date  = Query(default=None),
    label:      str   = Query(default="Selected Location"),
):
    """
    Evidence-grounded agricultural adaptation recommendations.

    Recommendations are generated from observed NASA POWER environmental
    conditions and are general guidance only.

    ⚠️ Important limitations:
      - Does not account for local soil type, topography, or market conditions.
      - Does not specify crop varieties, seeding rates, fertilizer quantities,
        or irrigation volumes without additional local data.
      - Every recommendation should be verified with local agronomic expertise.
      - AI-generated guidance is not a substitute for professional agricultural advice.
    """
    today = date.today()
    if end_date is None:
        end_date = today
    if start_date is None:
        start_date = date(today.year - 1, today.month, today.day)

    try:
        raw = await fetch_daily_power(latitude, longitude, start_date, end_date)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    params  = raw.get("properties", {}).get("parameter", {})
    is_demo = raw.get("_demo", False)

    def vals(key: str) -> list:
        if key not in params:
            return []
        items = params[key]
        return [items[d] for d in sorted(items.keys()) if items[d] is not None and items[d] > -900]

    t2m    = vals("T2M")
    precip = vals("PRECTOTCORR")
    gwttop = vals("GWETTOP")
    gwtroot= vals("GWETROOT")
    t2m_max= vals("T2M_MAX")
    t2m_min= vals("T2M_MIN")

    # ── Indicators ─────────────────────────────────────────────────────────────
    spi3 = calculate_spi(precip, timescale=3) if len(precip) >= 3 else []
    spi3_recent = float(np.nanmean([v for v in spi3[-30:] if v and not np.isnan(v)])) \
                  if spi3 else float("nan")

    mean_soil = float(np.nanmean(gwtroot)) if gwtroot else 0.4
    soil_anal = analyze_soil_moisture(gwttop, gwtroot) if gwttop and gwtroot else {}

    t_mean    = float(np.nanmean(t2m)) if t2m else 18.0
    t_recent  = float(np.nanmean(t2m[-30:])) if len(t2m) >= 30 else t_mean
    t_anomaly = t_recent - t_mean

    heat_anal = analyze_heat_stress(t2m_max, t2m)

    gdd_cum_vals = cumulative_gdd(t2m_max, t2m_min) if t2m_max and t2m_min else []
    total_gdd    = gdd_cum_vals[-1] if gdd_cum_vals else 0.0
    total_precip = float(np.sum(precip)) if precip else 0.0

    t_trend = linear_trend(t2m, unit_name="°C")
    p_trend = linear_trend(precip, unit_name="mm")

    # ── Select applicable strategies ──────────────────────────────────────────
    active_strategies: List[dict] = []
    evidence: List[str] = []

    # Always include monitoring
    active_strategies.append(ADAPTATION_STRATEGIES["general_monitoring"])

    # Water deficit (strictly decoupled from heat stress)
    if (not np.isnan(spi3_recent) and spi3_recent < -1.0) or \
       (soil_anal and soil_anal.get("dry_stress_pct", 0) > 15):
        active_strategies.append(ADAPTATION_STRATEGIES["water_deficit"])
        evidence.append(
            f"Water deficit signal: SPI-3 = {spi3_recent:+.2f}, "
            f"root-zone soil water deficit days = {soil_anal.get('dry_stress_days', 'N/A')} "
            f"(GWETROOT < 0.25 operational wilting proxy; measures soil moisture only, not heat)."
        )

    # Waterlogging risk: evaluated as supporting condition, NOT direct proof
    if total_precip > 1200 or (not np.isnan(spi3_recent) and spi3_recent > 1.5) or mean_soil > 0.75:
        evidence.append(
            f"Elevated moisture context: Total rainfall {total_precip:.0f} mm, "
            f"mean root-zone wetness {mean_soil:.3f}. Supporting indicator for potential waterlogging risk; "
            f"field-level verification of drainage and topography required."
        )

    # Heat stress: evaluated strictly from temperature data (T2M_MAX / T2M)
    if heat_anal.get("status") == "evaluated" and heat_anal.get("is_heat_stressed"):
        active_strategies.append(ADAPTATION_STRATEGIES["heat_stress"])
        evidence.append(
            f"Heat exposure signal: {heat_anal.get('heat_stress_days_35c', 0)} days >= 35°C "
            f"(peak {heat_anal.get('max_tmax_c')}°C, anomaly {t_anomaly:+.1f}°C vs. period mean). "
            f"Independent thermal assessment (decoupled from soil moisture)."
        )
    elif heat_anal.get("status") == "insufficient_data":
        evidence.append("Heat stress assessment: Insufficient data to assess heat stress.")

    # Precipitation variability
    if p_trend.get("significant"):
        active_strategies.append(ADAPTATION_STRATEGIES["precipitation_variability"])
        p_disp = p_trend.get("p_display", f"p={p_trend.get('p_value', 0):.3f}")
        evidence.append(
            f"Precipitation trend: {p_trend['direction']} "
            f"(slope={p_trend['slope']:.4f} mm/day per day, {p_disp}, OLS mean trend). "
            f"Does not infer changes in extreme rainfall event frequency."
        )

    # Soil health always relevant for crop rotation context
    active_strategies.append(ADAPTATION_STRATEGIES["soil_health"])

    # ── Crop rotation scores ────────────────────────────────────────────────
    crop_scores = score_crop_rotation(
        cumulative_gdd    = total_gdd,
        total_precip_mm   = total_precip,
        mean_soil_wetness = mean_soil,
        mean_temp_c       = t_mean,
        stress_score      = min(100, max(0, (-spi3_recent * 20 + 50) if not np.isnan(spi3_recent) else 50)),
    )

    # ── Environmental context summary ──────────────────────────────────────────
    context = {
        "temperature_c":        round(t_mean, 1),
        "temp_anomaly_c":       round(t_anomaly, 2),
        "total_precip_mm":      round(total_precip, 1),
        "spi_3_recent":         round(spi3_recent, 2) if not np.isnan(spi3_recent) else None,
        "root_zone_wetness":    round(mean_soil, 3),
        "cumulative_gdd":       round(total_gdd, 0),
        "dry_stress_pct":       soil_anal.get("dry_stress_pct"),
        "temp_trend":           t_trend.get("direction"),
        "precip_trend":         p_trend.get("direction"),
        "precip_trend_p_display": p_trend.get("p_display"),
        "precip_trend_slope":   p_trend.get("slope"),
        "heat_stress_assessment": heat_anal.get("assessment"),
        "heat_stress_status":   heat_anal.get("status"),
        "heat_stress_days_35c": heat_anal.get("heat_stress_days_35c"),
        "max_tmax_c":           heat_anal.get("max_tmax_c"),
    }

    return {
        "location":     {"latitude": latitude, "longitude": longitude, "label": label},
        "period":       {"start": str(start_date), "end": str(end_date)},
        "is_demo":      is_demo,
        "environmental_context": context,
        "evidence_summary": evidence,
        "adaptation_strategies": [
            {
                "title":      s["title"],
                "strategies": s["strategies"],
                "data_basis": s["data_basis"],
            }
            for s in active_strategies
        ],
        "crop_rotation_ranking": crop_scores[:5],
        "key_caveats": [
            "These recommendations are generated from gridded model data (~55 km resolution).",
            "Local soil type, slope, drainage, pest pressure, and market conditions are not included.",
            "Do not act on these recommendations without consulting local agronomic expertise.",
            "Crop rotation scores are simplified heuristics, not validated crop models.",
            "Climate observations from one or two years are insufficient for robust trend conclusions.",
        ],
        "data_sources": [
            "NASA POWER Agroclimatology (https://power.larc.nasa.gov/)",
            "SPI calculation: McKee et al. (1993)",
            "GDD: McMaster & Wilhelm (1997)",
        ],
    }
