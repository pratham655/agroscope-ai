"""
Crop Phenology Tracker — Seasonal Vegetation Curves API.

Derives proxy seasonal NDVI curves from NASA POWER soil moisture and solar
radiation data for multiple years, estimating phenological events (green-up,
peak, senescence) and computing anomalies vs. the multi-year baseline.

Scientific note: This uses a proxy vegetation index derived from MERRA-2
soil moisture and solar radiation — NOT direct MODIS NDVI observations.
For authoritative phenology, use MODIS MOD13 or VIIRS VNP13 products.
"""

from fastapi import APIRouter, Query, HTTPException
from datetime import date, timedelta
import logging
import math
from typing import List

from app.services.nasa_power import fetch_daily_power
from app.services.science import (
    smooth_ndvi_series,
    calculate_gdd,
    linear_trend,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# Growing Degree Day thresholds for phenological events (McMaster & Wilhelm, 1997)
PHENOLOGY_GDD: dict = {
    "maize":   {"green_up": 50,  "peak": 700,  "senescence": 1200},
    "wheat":   {"green_up": 50,  "peak": 500,  "senescence": 800},
    "soybean": {"green_up": 50,  "peak": 600,  "senescence": 1000},
}


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


def _doy_from_yyyyddd(yyyymmdd: str) -> int:
    """Convert YYYYMMDD string to day-of-year."""
    try:
        d = date(int(yyyymmdd[:4]), int(yyyymmdd[4:6]), int(yyyymmdd[6:8]))
        return d.timetuple().tm_yday
    except Exception:
        return 0


def _compute_ndvi_proxy(gwetroot_series: list, solar_series: list) -> list:
    """
    Proxy vegetation index from MERRA-2 outputs.

    Formula (heuristic):
      NDVI_proxy = clip(0.05 + 0.6 * GWETROOT * sqrt(ALLSKY / 25), 0, 1)

    Rationale:
      - Root-zone wetness drives water availability for plant growth.
      - Solar irradiance (ALLSKY) drives photosynthetically active radiation.
      - Combined, they provide a coarse proxy for vegetation greenness.
      - This is NOT equivalent to MODIS NDVI and should not be compared with it.

    Reference for proxy approach: similar in spirit to soil-moisture-based
    vegetation proxies used in land surface model evaluation (Seneviratne et al., 2010).
    """
    proxies = []
    for gw, sol in zip(gwetroot_series, solar_series):
        gw  = gw  if gw  is not None else 0.4
        sol = sol if sol is not None else 15.0
        sol = max(0.0, sol)
        proxy = 0.05 + 0.6 * gw * math.sqrt(sol / 25.0)
        proxies.append(round(min(1.0, max(0.0, proxy)), 4))
    return proxies


def _find_phenological_events(doy_list: list, ndvi_proxy: list) -> dict:
    """
    Estimate phenological events from proxy NDVI curve.

    Green-up: first DOY where NDVI_proxy exceeds 0.25
    Peak:     DOY of maximum NDVI_proxy
    Senescence: first DOY after peak where NDVI_proxy drops below 0.25
    """
    green_up   = None
    peak_doy   = None
    senescence = None

    if not ndvi_proxy or not doy_list:
        return {"green_up_doy": None, "peak_doy": None, "senescence_doy": None}

    peak_idx = ndvi_proxy.index(max(ndvi_proxy))
    peak_doy = doy_list[peak_idx]

    for i, (doy, val) in enumerate(zip(doy_list, ndvi_proxy)):
        if val >= 0.25 and green_up is None:
            green_up = doy
        if i > peak_idx and val < 0.25 and senescence is None:
            senescence = doy

    return {
        "green_up_doy":   green_up,
        "peak_doy":       peak_doy,
        "senescence_doy": senescence,
    }


def _gdd_thresholds_for_year(gdd_cumulative: list, doy_list: list,
                              crop: str) -> dict:
    """Find DOY when cumulative GDD crosses phenological thresholds for a crop."""
    thresholds = PHENOLOGY_GDD.get(crop, {})
    result = {}
    for event, gdd_target in thresholds.items():
        found = None
        for i, (gdd, doy) in enumerate(zip(gdd_cumulative, doy_list)):
            if gdd >= gdd_target:
                found = doy
                break
        result[event] = found
    return result


@router.get("/seasonal")
async def seasonal_phenology(
    latitude:  float = Query(..., ge=-90,  le=90,  description="Decimal degrees North"),
    longitude: float = Query(..., ge=-180, le=180, description="Decimal degrees East"),
    years:     str   = Query("2020,2021,2022,2023,2024",
                              description="Comma-separated list of years (max 5)"),
):
    """
    Retrieve proxy NDVI seasonal curves for multiple years.

    For each year, fetches daily NASA POWER data (Jan–Dec), computes a proxy
    vegetation index, applies Savitzky-Golay smoothing, and detects
    phenological events (green-up, peak, senescence).

    Also computes multi-year mean and anomaly for the most recent year.

    ⚠️ Proxy NDVI is derived from MERRA-2 soil moisture and solar radiation —
    NOT from MODIS or any direct satellite vegetation index observation.
    """
    # Parse years
    try:
        year_list = [int(y.strip()) for y in years.split(",")]
    except ValueError:
        raise HTTPException(status_code=422, detail="years must be comma-separated integers")

    year_list = sorted(set(year_list))
    if len(year_list) > 5:
        raise HTTPException(status_code=422, detail="Maximum 5 years allowed")
    if len(year_list) < 1:
        raise HTTPException(status_code=422, detail="At least 1 year required")

    current_year = date.today().year
    for yr in year_list:
        if yr < 1981 or yr > current_year:
            raise HTTPException(status_code=422, detail=f"Year {yr} out of range (1981–{current_year})")

    yearly_curves = []
    is_demo = False

    for yr in year_list:
        start = date(yr, 1, 1)
        end   = date(yr, 12, 31)
        if end > date.today():
            end = date.today() - timedelta(days=1)
        if start > end:
            continue

        power_data = await fetch_daily_power(latitude, longitude, start, end)
        if power_data.get("_demo"):
            is_demo = True

        params = power_data.get("properties", {}).get("parameter", {})

        # Extract data
        gwetroot_raw = params.get("GWETROOT", {})
        solar_raw    = params.get("ALLSKY_SFC_SW_DWN", {})
        t2m_max_raw  = params.get("T2M_MAX", {})
        t2m_min_raw  = params.get("T2M_MIN", {})

        all_keys = sorted(gwetroot_raw.keys())

        gwetroot = [gwetroot_raw.get(k, 0.4) for k in all_keys]
        solar    = [solar_raw.get(k, 15.0)   for k in all_keys]
        t2m_max  = [t2m_max_raw.get(k, 25.0) for k in all_keys]
        t2m_min  = [t2m_min_raw.get(k, 10.0) for k in all_keys]

        # Replace -999 fill values
        gwetroot = [0.4   if v == -999 else v for v in gwetroot]
        solar    = [15.0  if v == -999 else v for v in solar]
        t2m_max  = [25.0  if v == -999 else v for v in t2m_max]
        t2m_min  = [10.0  if v == -999 else v for v in t2m_min]

        # DOY series
        doy_list = [_doy_from_yyyyddd(k) for k in all_keys]

        # Proxy NDVI
        ndvi_proxy = _compute_ndvi_proxy(gwetroot, solar)
        ndvi_smooth = smooth_ndvi_series(ndvi_proxy, window=7)

        # Phenological events
        events = _find_phenological_events(doy_list, ndvi_smooth)

        # Cumulative GDD (base 10)
        gdds = [calculate_gdd(mx, mn, t_base=10.0) for mx, mn in zip(t2m_max, t2m_min)]
        cum_gdd = []
        acc = 0.0
        for g in gdds:
            acc += g
            cum_gdd.append(round(acc, 1))

        # GDD-based phenological thresholds per crop
        gdd_events = {}
        for crop in ("maize", "wheat", "soybean"):
            gdd_events[crop] = _gdd_thresholds_for_year(cum_gdd, doy_list, crop)

        yearly_curves.append({
            "year":          yr,
            "doy":           doy_list,
            "ndvi_proxy":    _sanitize_list(ndvi_proxy),
            "ndvi_smooth":   _sanitize_list(ndvi_smooth),
            "cumulative_gdd": cum_gdd,
            "phenological_events": events,
            "gdd_crop_thresholds": gdd_events,
            "n_days":        len(doy_list),
        })

    if not yearly_curves:
        raise HTTPException(status_code=422, detail="No data available for requested years")

    # Multi-year mean anomaly (compare last year vs. mean of all others)
    anomaly = None
    if len(yearly_curves) >= 2:
        # Build DOY → mean across all years except last
        from collections import defaultdict
        doy_values: dict = defaultdict(list)
        for curve in yearly_curves[:-1]:
            for doy, val in zip(curve["doy"], curve["ndvi_smooth"]):
                if val is not None:
                    doy_values[doy].append(val)

        baseline_mean = {doy: sum(vals) / len(vals) for doy, vals in doy_values.items()}

        last = yearly_curves[-1]
        anomaly_vals = []
        for doy, val in zip(last["doy"], last["ndvi_smooth"]):
            base = baseline_mean.get(doy)
            if base is not None and val is not None:
                anomaly_vals.append(round(val - base, 4))
            else:
                anomaly_vals.append(None)

        anomaly = {
            "year": last["year"],
            "baseline_years": [c["year"] for c in yearly_curves[:-1]],
            "anomaly_series": anomaly_vals,
            "doy": last["doy"],
            "mean_anomaly": round(
                sum(v for v in anomaly_vals if v is not None) /
                max(1, sum(1 for v in anomaly_vals if v is not None)), 4
            ),
        }

    # Trend in peak NDVI across years
    peak_ndvi_per_year = []
    peak_doy_per_year  = []
    for curve in yearly_curves:
        valid = [v for v in curve["ndvi_smooth"] if v is not None]
        peak_ndvi_per_year.append(max(valid) if valid else None)
        peak_doy_per_year.append(curve["phenological_events"].get("peak_doy"))

    peak_trend = linear_trend([v for v in peak_ndvi_per_year if v is not None])

    return {
        "location": {"latitude": latitude, "longitude": longitude},
        "years":    year_list,
        "curves":   yearly_curves,
        "anomaly":  anomaly,
        "inter_annual_trend": {
            "peak_ndvi_per_year": _sanitize_list(peak_ndvi_per_year),
            "peak_doy_per_year":  peak_doy_per_year,
            "trend": peak_trend,
        },
        "is_demo":    is_demo,
        "data_source": "NASA POWER MERRA-2 (proxy — not MODIS NDVI)",
        "scientific_disclaimer": (
            "⚠️ Proxy Vegetation Index: These curves are derived from MERRA-2 soil wetness "
            "and solar radiation, NOT from direct satellite NDVI measurements (e.g., MODIS MOD13). "
            "Phenological event dates are estimates based on proxy thresholds and GDD accumulation. "
            "For research-grade phenology, use MODIS Land Product Subsets or VIIRS VNP13."
        ),
    }
