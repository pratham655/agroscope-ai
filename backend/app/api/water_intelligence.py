"""
Smart Water Intelligence — Comprehensive Soil Moisture & Water Dashboard API.

Provides detailed water/moisture analysis using NASA POWER MERRA-2 data,
including surface and root-zone wetness, precipitation series, SPI proxy,
a water stress index, seasonal comparison, and trend analysis.

Data source: NASA POWER MERRA-2 land surface model (model-derived, NOT direct observation).
"""

from fastapi import APIRouter, Query, HTTPException
from datetime import date, timedelta
import logging
import math

from app.services.nasa_power import fetch_daily_power
from app.services.science import (
    calculate_spi,
    interpret_spi,
    analyze_soil_moisture,
    linear_trend,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _safe(v):
    if v is None:
        return None
    try:
        if math.isnan(v) or math.isinf(v):
            return None
    except (TypeError, ValueError):
        pass
    return v


def _sanitize_list(lst):
    return [_safe(v) for v in lst]


def _extract_series(power_data: dict, param: str):
    try:
        raw = power_data["properties"]["parameter"][param]
        dates = list(raw.keys())
        vals  = [v if v != -999 else None for v in raw.values()]
        return dates, vals
    except (KeyError, AttributeError):
        return [], []


def _water_stress_index(gwetroot_series: list, precip_series: list) -> dict:
    """
    Compute a simple Water Stress Index (WSI) as a heuristic composite:
      WSI = (1 - mean_gwetroot) * 0.6 + (1 - min(1, total_precip/200)) * 0.4
    Range: 0 (no stress) → 1 (extreme stress).
    This is a heuristic indicator, NOT a validated index such as PDSI or SPEI.
    """
    root = [v for v in gwetroot_series if v is not None]
    prec = [v for v in precip_series  if v is not None]

    mean_root    = sum(root) / len(root) if root else 0.4
    total_precip = sum(prec)
    precip_norm  = min(1.0, total_precip / 200.0)  # normalise to ~200 mm

    wsi = (1.0 - mean_root) * 0.6 + (1.0 - precip_norm) * 0.4
    wsi = round(max(0.0, min(1.0, wsi)), 3)

    if wsi < 0.2:
        level, color = "Low",      "#22c55e"
    elif wsi < 0.4:
        level, color = "Moderate", "#86efac"
    elif wsi < 0.6:
        level, color = "Elevated", "#fcd34d"
    elif wsi < 0.8:
        level, color = "High",     "#f97316"
    else:
        level, color = "Severe",   "#dc2626"

    return {
        "wsi": wsi,
        "level": level,
        "color": color,
        "note": (
            "Water Stress Index is a simplified heuristic combining root-zone "
            "soil wetness and precipitation normalisation. It is NOT a validated "
            "drought index. Do not equate with PDSI, SPEI, or USDM classifications."
        ),
    }


@router.get("/analysis")
async def water_analysis(
    latitude:   float = Query(..., ge=-90,  le=90,  description="Decimal degrees North"),
    longitude:  float = Query(..., ge=-180, le=180, description="Decimal degrees East"),
    start_date: str   = Query(..., description="ISO date YYYY-MM-DD"),
    end_date:   str   = Query(..., description="ISO date YYYY-MM-DD"),
):
    """
    Comprehensive soil moisture and water dashboard.

    Returns surface and root-zone wetness time series, precipitation series,
    SPI proxy, water stress index, trend analysis, and seasonal comparison.

    All moisture values are from NASA POWER MERRA-2 (model-derived, ~55 km).
    """
    try:
        start = date.fromisoformat(start_date)
        end   = date.fromisoformat(end_date)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid date: {exc}")

    if start >= end:
        raise HTTPException(status_code=422, detail="start_date must be before end_date")
    if (end - start).days > 730:
        raise HTTPException(status_code=422, detail="Date range must not exceed 730 days")

    power_data = await fetch_daily_power(latitude, longitude, start, end)
    is_demo    = power_data.get("_demo", False)

    # Extract all water-related series
    dates_top, gwettop   = _extract_series(power_data, "GWETTOP")
    dates_root, gwetroot = _extract_series(power_data, "GWETROOT")
    dates_prof, gwetprof = _extract_series(power_data, "GWETPROF")
    dates_prec, precip   = _extract_series(power_data, "PRECTOTCORR")
    dates_evap, evap     = _extract_series(power_data, "EVLAND") if "EVLAND" in (
        power_data.get("properties", {}).get("parameter", {})) else ([], [])

    # Use dates from precip (should all be same)
    all_dates = dates_prec or dates_top or []

    # Soil moisture full analysis
    top_clean  = [v if v is not None else 0.4 for v in gwettop]
    root_clean = [v if v is not None else 0.4 for v in gwetroot]
    prec_clean = [v if v is not None else 0.0 for v in precip]

    sm_result = analyze_soil_moisture(top_clean, root_clean)

    # SPI proxy (3-step)
    spi_series = calculate_spi(prec_clean, timescale=3)
    spi_recent = next((v for v in reversed(spi_series) if not math.isnan(v)), float("nan"))
    spi_interp = interpret_spi(spi_recent)

    # Water stress index
    wsi = _water_stress_index(root_clean, prec_clean)

    # Trends
    gwettop_trend  = linear_trend(top_clean)
    gwetroot_trend = linear_trend(root_clean)
    precip_trend   = linear_trend(prec_clean)

    # Seasonal comparison: split into two halves
    n = len(prec_clean)
    half = n // 2
    season1_prec = prec_clean[:half]
    season2_prec = prec_clean[half:]
    season1_root = root_clean[:half]
    season2_root = root_clean[half:]

    def period_label(idx_start, idx_end, all_dates):
        if not all_dates:
            return f"Period {idx_start+1}–{idx_end}"
        s = all_dates[idx_start] if idx_start < len(all_dates) else ""
        e = all_dates[min(idx_end, len(all_dates)-1)] if all_dates else ""
        return f"{s[:6]}–{e[:6]}"

    seasonal_comparison = [
        {
            "label":          period_label(0, half, all_dates),
            "total_precip_mm": round(sum(season1_prec), 1),
            "mean_root_wetness": round(sum(season1_root)/max(len(season1_root),1), 3),
        },
        {
            "label":          period_label(half, n, all_dates),
            "total_precip_mm": round(sum(season2_prec), 1),
            "mean_root_wetness": round(sum(season2_root)/max(len(season2_root),1), 3),
        },
    ]

    # Evaporation proxy (scale kg/m²/s → mm/day: multiply by 86400)
    evap_mmday = []
    if evap:
        evap_mmday = [round(v * 86400, 2) if v is not None else None for v in evap]

    # Cumulative precipitation
    cum_precip = []
    running = 0.0
    for v in prec_clean:
        running += v
        cum_precip.append(round(running, 1))

    # Dry-spell detection: consecutive days with precip < 1 mm
    dry_spells = []
    spell_start = None
    for i, v in enumerate(prec_clean):
        if v < 1.0:
            if spell_start is None:
                spell_start = i
        else:
            if spell_start is not None and (i - spell_start) >= 5:
                dry_spells.append({
                    "start_idx": spell_start,
                    "end_idx":   i - 1,
                    "length_days": i - spell_start,
                    "start_date": all_dates[spell_start] if spell_start < len(all_dates) else None,
                    "end_date":   all_dates[i-1] if i-1 < len(all_dates) else None,
                })
            spell_start = None
    # Close any open spell
    if spell_start is not None and (len(prec_clean) - spell_start) >= 5:
        dry_spells.append({
            "start_idx":   spell_start,
            "end_idx":     len(prec_clean) - 1,
            "length_days": len(prec_clean) - spell_start,
            "start_date":  all_dates[spell_start] if spell_start < len(all_dates) else None,
            "end_date":    all_dates[-1] if all_dates else None,
        })

    return {
        "location": {"latitude": latitude, "longitude": longitude},
        "period": {"start": start_date, "end": end_date},

        # Time series (parallel arrays)
        "dates":           all_dates,
        "gwettop_series":  _sanitize_list(gwettop),
        "gwetroot_series": _sanitize_list(gwetroot),
        "gwetprof_series": _sanitize_list(gwetprof) if gwetprof else [],
        "precip_series":   _sanitize_list(precip),
        "spi_series":      _sanitize_list(spi_series),
        "evap_mmday":      _sanitize_list(evap_mmday),
        "cumulative_precip": cum_precip,

        # Summary stats
        "soil_moisture_analysis": sm_result,
        "water_stress_index": wsi,
        "spi_recent":   _safe(spi_recent),
        "spi_category": spi_interp["category"],
        "spi_color":    spi_interp["color"],
        "total_precip_mm": round(sum(prec_clean), 1),

        # Trends
        "gwettop_trend":  gwettop_trend,
        "gwetroot_trend": gwetroot_trend,
        "precip_trend":   precip_trend,

        # Seasonal
        "seasonal_comparison": seasonal_comparison,

        # Dry spells
        "dry_spells": dry_spells[:10],  # cap at 10 for payload size

        "is_demo":    is_demo,
        "demo_notice": power_data.get("_demo_notice", "") if is_demo else None,
        "data_source": "NASA POWER MERRA-2 land surface model",
        "scientific_note": (
            "Soil wetness values (GWETTOP, GWETROOT) are MERRA-2 model outputs, "
            "NOT direct satellite soil moisture measurements (e.g., SMAP). "
            "The Water Stress Index is a heuristic indicator and does not replace "
            "validated indices such as PDSI or SPEI. "
            "EVLAND represents land surface evaporation from the MERRA-2 model."
        ),
    }
