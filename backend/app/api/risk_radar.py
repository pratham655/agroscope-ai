"""
Regional Agricultural Risk Radar — Multi-Location Risk Comparison API.

Accepts a list of geographic locations, fetches NASA POWER data for each,
runs the full science pipeline, and returns ranked composite risk scores
for comparison across regions.

Useful for comparing agricultural vulnerability across regions.
"""

from fastapi import APIRouter, Query, HTTPException, Body
from datetime import date, timedelta
import logging
import math
import asyncio
from typing import List, Optional
import json

from app.services.nasa_power import fetch_daily_power
from app.services.science import (
    calculate_spi,
    interpret_spi,
    analyze_soil_moisture,
    compute_stress_score,
    score_crop_rotation,
    cumulative_gdd,
    linear_trend,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# Pre-configured global agricultural regions
PRESET_LOCATIONS = [
    {"lat": 41.85, "lon": -93.62, "label": "Iowa Corn Belt, USA"},
    {"lat": 51.52, "lon": 10.45,  "label": "German Agricultural Plain"},
    {"lat": -23.5, "lon": -46.6,  "label": "São Paulo State, Brazil"},
    {"lat": 30.5,  "lon": 77.0,   "label": "Punjab, India"},
    {"lat": -32.0, "lon": 147.0,  "label": "New South Wales, Australia"},
    {"lat": 48.5,  "lon": 35.5,   "label": "Dnipro Region, Ukraine"},
    {"lat": 36.0,  "lon": 103.0,  "label": "Gansu Province, China"},
    {"lat": 12.0,  "lon": 2.5,    "label": "Sahel Zone, Burkina Faso"},
]


def _safe(v):
    if v is None:
        return None
    try:
        if math.isnan(v) or math.isinf(v):
            return None
    except (TypeError, ValueError):
        pass
    return v


def _extract_series(power_data: dict, param: str):
    try:
        raw = power_data["properties"]["parameter"][param]
        return [v if v != -999 else None for v in raw.values()]
    except (KeyError, AttributeError):
        return []


async def _analyze_location(lat: float, lon: float, label: str,
                             start: date, end: date) -> dict:
    """Run full science pipeline for one location."""
    try:
        power_data = await fetch_daily_power(lat, lon, start, end)
    except Exception as exc:
        logger.error("POWER fetch failed for %s: %s", label, exc)
        return {
            "label": label, "latitude": lat, "longitude": lon,
            "error": str(exc), "is_demo": False,
        }

    is_demo = power_data.get("_demo", False)

    def clean(lst, default=0.0):
        return [v if v is not None else default for v in lst]

    t2m     = clean(_extract_series(power_data, "T2M"))
    t2m_min = clean(_extract_series(power_data, "T2M_MIN"))
    t2m_max = clean(_extract_series(power_data, "T2M_MAX"))
    precip  = clean(_extract_series(power_data, "PRECTOTCORR"))
    gwettop = clean(_extract_series(power_data, "GWETTOP"), 0.4)
    gwetroot= clean(_extract_series(power_data, "GWETROOT"), 0.4)

    spi_series  = calculate_spi(precip, timescale=3)
    spi_recent  = next((v for v in reversed(spi_series) if not math.isnan(v)), float("nan"))
    spi_interp  = interpret_spi(spi_recent)

    cum_gdd_list = cumulative_gdd(t2m_max, t2m_min, t_base=10.0)
    total_gdd    = cum_gdd_list[-1] if cum_gdd_list else 0.0
    total_precip = sum(precip)
    mean_temp    = sum(t2m) / max(len(t2m), 1)

    sm_result  = analyze_soil_moisture(gwettop, gwetroot)
    soil_mean  = sm_result["root_zone"]["mean"] or 0.4

    ndvi_proxy   = [min(1.0, max(0.0, 0.1 + 0.5 * (r / 0.5))) for r in gwetroot]
    ndvi_anomaly = sum(ndvi_proxy) / len(ndvi_proxy) - 0.45 if ndvi_proxy else 0.0
    temp_anomaly = mean_temp - 15.0

    stress = compute_stress_score(spi_recent, ndvi_anomaly, soil_mean, temp_anomaly)

    top_crops = score_crop_rotation(total_gdd, total_precip, soil_mean, mean_temp, stress["score"])[:3]

    precip_trend = linear_trend(precip)

    return {
        "label":     label,
        "latitude":  lat,
        "longitude": lon,
        "stress_score": stress["score"],
        "stress_level": stress["level"],
        "stress_color": stress["color"],
        "stress_indicators": stress["indicators"],
        "spi_recent":    _safe(spi_recent),
        "spi_category":  spi_interp["category"],
        "spi_color":     spi_interp["color"],
        "total_precip_mm": round(total_precip, 1),
        "mean_temp_c":   round(mean_temp, 2),
        "soil_mean":     round(soil_mean, 3),
        "total_gdd":     round(total_gdd, 1),
        "ndvi_anomaly":  round(ndvi_anomaly, 3),
        "top_crops":     top_crops,
        "precip_trend":  precip_trend,
        "dry_stress_pct": sm_result.get("dry_stress_pct", 0),
        "is_demo":       is_demo,
        "error":         None,
    }


@router.get("/regional")
async def regional_risk(
    locations:  Optional[str] = Query(None, description='JSON array of {"lat":..,"lon":..,"label":..} objects'),
    start_date: str = Query(..., description="ISO date YYYY-MM-DD"),
    end_date:   str = Query(..., description="ISO date YYYY-MM-DD"),
    use_presets: bool = Query(True, description="Include pre-configured agricultural regions"),
):
    """
    Regional Agricultural Risk Radar.

    Analyzes multiple locations simultaneously and returns composite risk
    rankings. Optionally includes pre-configured global agricultural regions.

    Fetches NASA POWER for each location and runs the full science pipeline.
    All requests are made concurrently for performance.
    """
    try:
        start = date.fromisoformat(start_date)
        end   = date.fromisoformat(end_date)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid date: {exc}")

    if start >= end:
        raise HTTPException(status_code=422, detail="start_date must be before end_date")
    if (end - start).days > 365:
        raise HTTPException(status_code=422, detail="Date range must not exceed 365 days")

    # Build location list
    location_list = []

    if use_presets:
        location_list.extend(PRESET_LOCATIONS)

    if locations:
        try:
            custom = json.loads(locations)
            if not isinstance(custom, list):
                raise ValueError("locations must be a JSON array")
            for loc in custom:
                if not all(k in loc for k in ("lat", "lon", "label")):
                    raise ValueError("Each location must have lat, lon, label")
                if not (-90 <= loc["lat"] <= 90):
                    raise ValueError(f"Invalid latitude: {loc['lat']}")
                if not (-180 <= loc["lon"] <= 180):
                    raise ValueError(f"Invalid longitude: {loc['lon']}")
            location_list.extend(custom)
        except (json.JSONDecodeError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=f"Invalid locations: {exc}")

    if not location_list:
        raise HTTPException(status_code=422, detail="No locations provided")
    if len(location_list) > 15:
        raise HTTPException(status_code=422, detail="Maximum 15 locations per request")

    # Deduplicate
    seen = set()
    unique_locations = []
    for loc in location_list:
        key = (round(loc["lat"], 2), round(loc["lon"], 2))
        if key not in seen:
            seen.add(key)
            unique_locations.append(loc)

    # Concurrent analysis
    tasks = [
        _analyze_location(loc["lat"], loc["lon"], loc["label"], start, end)
        for loc in unique_locations
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Handle exceptions from gather
    processed = []
    for loc, result in zip(unique_locations, results):
        if isinstance(result, Exception):
            processed.append({
                "label": loc["label"],
                "latitude": loc["lat"],
                "longitude": loc["lon"],
                "error": str(result),
                "stress_score": None,
            })
        else:
            processed.append(result)

    # Rank by stress score (highest stress first)
    ranked = sorted(
        processed,
        key=lambda x: x.get("stress_score") or 0,
        reverse=True,
    )

    # Global summary stats
    valid_scores = [r["stress_score"] for r in ranked if r.get("stress_score") is not None]
    summary = {
        "n_locations":   len(ranked),
        "n_successful":  len(valid_scores),
        "mean_stress":   round(sum(valid_scores) / len(valid_scores), 1) if valid_scores else None,
        "max_stress":    max(valid_scores, default=None),
        "min_stress":    min(valid_scores, default=None),
        "highest_risk_location": ranked[0]["label"] if ranked else None,
        "lowest_risk_location":  ranked[-1]["label"] if ranked else None,
    }

    any_demo = any(r.get("is_demo") for r in processed)

    return {
        "period":    {"start": start_date, "end": end_date},
        "locations": ranked,
        "summary":   summary,
        "preset_locations": PRESET_LOCATIONS,
        "is_demo":   any_demo,
        "data_source": "NASA POWER MERRA-2 reanalysis (~55 km) — concurrent multi-location analysis",
        "scientific_note": (
            "Composite stress scores are heuristic multi-indicator summaries. "
            "Regional comparisons should account for climate zone, crop type, "
            "and local agricultural practices. Not suitable for policy decisions "
            "without additional expert analysis."
        ),
    }
