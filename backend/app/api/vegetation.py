"""Vegetation intelligence router — NDVI analysis + GIBS layer URLs."""

from fastapi import APIRouter, Query
from datetime import date
from typing import Optional
import numpy as np
import logging

from app.services.science import (
    interpret_ndvi, smooth_ndvi_series, compute_ndvi_anomaly, linear_trend
)
from app.services.nasa_gibs import get_tile_url, get_all_layer_metadata
from app.services.nasa_power import fetch_daily_power

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/ndvi-proxy")
async def get_ndvi_proxy(
    latitude:   float = Query(..., ge=-90,  le=90),
    longitude:  float = Query(..., ge=-180, le=180),
    start_date: date  = Query(...),
    end_date:   date  = Query(...),
):
    """
    NDVI proxy derived from NASA POWER solar radiation + soil moisture.

    ⚠️ This is a proxy indicator, NOT actual MODIS NDVI.
    True NDVI requires MODIS surface reflectance bands (NIR, Red).
    This proxy is used when MODIS HDF access is unavailable.

    Proxy method: Vegetation response estimated from PAR × soil wetness.
    This is a simplified heuristic and should be treated as illustrative only.

    For authoritative NDVI, use the GIBS WMTS layers in the Earth Explorer,
    or access MODIS MOD13Q1 via NASA Earthdata.
    """
    raw = await fetch_daily_power(latitude, longitude, start_date, end_date)
    params   = raw.get("properties", {}).get("parameter", {})
    is_demo  = raw.get("_demo", False)

    sol_data  = params.get("ALLSKY_SFC_SW_DWN", {})
    gwet_data = params.get("GWETTOP", {})

    if not sol_data or not gwet_data:
        return {"error": "Insufficient POWER data for NDVI proxy calculation"}

    dates      = sorted(set(sol_data.keys()) & set(gwet_data.keys()))
    sol_vals   = [sol_data[d]  for d in dates]
    gwet_vals  = [gwet_data[d] for d in dates]

    # Proxy formula: scale normalized PAR × soil wetness to [0.1, 0.85]
    sol_arr  = np.array(sol_vals,  dtype=float)
    gwet_arr = np.array(gwet_vals, dtype=float)
    sol_max  = np.nanmax(sol_arr) or 1.0

    ndvi_proxy = 0.1 + 0.75 * (sol_arr / sol_max) * np.clip(gwet_arr, 0, 1)
    ndvi_proxy = np.clip(ndvi_proxy, 0.05, 0.90)
    smoothed   = smooth_ndvi_series(ndvi_proxy.tolist(), window=7)

    # Simple anomaly vs. mean
    baseline_mean = np.nanmean(smoothed)
    anomaly = (np.array(smoothed) - baseline_mean).tolist()
    trend   = linear_trend(smoothed)

    # Interpretation of most recent value
    latest_ndvi = smoothed[-1] if smoothed else float("nan")
    interp      = interpret_ndvi(latest_ndvi)

    return {
        "dates":         dates,
        "ndvi_proxy":    [round(v, 4) for v in smoothed],
        "anomaly":       [round(v, 4) for v in anomaly],
        "current_ndvi":  round(latest_ndvi, 4),
        "interpretation":interp,
        "trend":         trend,
        "is_proxy":      True,
        "is_demo":       is_demo,
        "proxy_notice": (
            "⚠️ PROXY INDICATOR: This NDVI estimate is derived from POWER solar radiation "
            "and soil wetness data — it is NOT actual MODIS NDVI. "
            "Use the GIBS map layers for authentic satellite vegetation imagery."
        ),
        "methodology":   "Proxy = 0.1 + 0.75 × (PAR_norm × soil_wetness); Savitzky-Golay smoothed",
        "source":        "NASA POWER ALLSKY_SFC_SW_DWN + GWETTOP",
        "gibs_reference":"Use MODIS_Terra_NDVI_8Day via GIBS for authentic NDVI imagery",
    }


@router.get("/gibs-layers")
async def get_gibs_layers(
    layer_key:  Optional[str] = Query(None, description="Specific layer key, or all if omitted"),
    obs_date:   Optional[date] = Query(None, description="Date for time-enabled layers"),
):
    """
    Get NASA GIBS WMTS tile URL(s) for integration with MapLibre / Leaflet.

    Returns tile URL templates and metadata for satellite imagery layers.
    These layers are public, require no authentication, and stream
    directly from NASA GIBS servers.
    """
    if layer_key:
        try:
            return get_tile_url(layer_key, obs_date)
        except ValueError as exc:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail=str(exc))

    # Return all layers with URLs for today
    layers = []
    for meta in get_all_layer_metadata():
        try:
            url_info = get_tile_url(meta["key"], obs_date)
            layers.append({**meta, "tile_url": url_info["tile_url"]})
        except Exception:
            pass
    return {"layers": layers}
