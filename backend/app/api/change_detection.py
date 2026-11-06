"""
Satellite Change Detective — Before/After Climate & Vegetation Comparison.

Compares two time periods at the same location, computing changes in key
agricultural indicators derived from NASA POWER data and providing
GIBS tile URLs for visual satellite imagery comparison.
"""

from fastapi import APIRouter, Query, HTTPException
from datetime import date, timedelta
import logging
import math

from app.services.nasa_power import fetch_daily_power
from app.services.science import (
    calculate_spi,
    interpret_spi,
    calculate_gdd,
    cumulative_gdd,
    analyze_soil_moisture,
    compute_stress_score,
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


def _extract_series(power_data: dict, param: str):
    try:
        raw = power_data["properties"]["parameter"][param]
        return [v if v != -999 else None for v in raw.values()]
    except (KeyError, AttributeError):
        return []


def _period_stats(power_data: dict, label: str, start: date, end: date) -> dict:
    """Compute a summary stats dict for a given POWER dataset."""
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

    sm_result    = analyze_soil_moisture(gwettop, gwetroot)
    soil_mean    = sm_result["root_zone"]["mean"] or 0.4

    ndvi_proxy = [min(1.0, max(-1.0, 0.1 + 0.5 * (r / 0.5))) for r in gwetroot]
    ndvi_mean  = sum(ndvi_proxy) / len(ndvi_proxy) if ndvi_proxy else 0.45
    ndvi_anomaly = ndvi_mean - 0.45
    temp_anomaly = mean_temp - 15.0

    stress = compute_stress_score(spi_recent, ndvi_anomaly, soil_mean, temp_anomaly)

    return {
        "label": label,
        "period_start": start.isoformat(),
        "period_end":   end.isoformat(),
        "mean_temp_c":    round(mean_temp, 2),
        "total_precip_mm": round(total_precip, 1),
        "mean_soil_wetness": round(soil_mean, 3),
        "ndvi_proxy_mean":   round(ndvi_mean, 3),
        "spi_recent":  _safe(spi_recent),
        "spi_category": spi_interp["category"],
        "spi_color":    spi_interp["color"],
        "total_gdd":   round(total_gdd, 1),
        "stress_score": stress["score"],
        "stress_level": stress["level"],
        "stress_color": stress["color"],
        "is_demo": power_data.get("_demo", False),
    }


def _gibs_tile_url(layer: str, date_str: str, zoom: int, x: int, y: int) -> str:
    """Build a GIBS WMTS tile URL."""
    return (
        f"https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/{layer}/default"
        f"/{date_str}/250m/{zoom}/{y}/{x}.jpg"
    )


def _gibs_wms_url(layer: str, date_str: str, lat: float, lon: float, size_deg: float = 2.0) -> str:
    """Build a GIBS WMS URL for a bounding box centred on the location."""
    minx = round(lon - size_deg / 2, 4)
    miny = round(lat - size_deg / 2, 4)
    maxx = round(lon + size_deg / 2, 4)
    maxy = round(lat + size_deg / 2, 4)
    bbox = f"{minx},{miny},{maxx},{maxy}"
    return (
        f"https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"
        f"?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0"
        f"&LAYERS={layer}"
        f"&CRS=EPSG:4326&BBOX={bbox}"
        f"&WIDTH=512&HEIGHT=512&FORMAT=image/png"
        f"&TIME={date_str}"
    )


@router.get("/compare")
async def compare_periods(
    latitude:   float = Query(..., ge=-90,  le=90,  description="Decimal degrees North"),
    longitude:  float = Query(..., ge=-180, le=180, description="Decimal degrees East"),
    date1:      str   = Query(..., description="Centre date of period 1 (YYYY-MM-DD)"),
    date2:      str   = Query(..., description="Centre date of period 2 (YYYY-MM-DD)"),
    window_days: int  = Query(30, ge=7, le=90, description="Days on each side of each centre date"),
):
    """
    Compare agricultural conditions between two time periods at the same location.

    Fetches NASA POWER data for 30-day windows around each date, computes
    NDVI proxy, SPI, soil moisture, temperature and stress for both periods,
    and returns deltas with GIBS imagery URLs for visual comparison.
    """
    try:
        d1 = date.fromisoformat(date1)
        d2 = date.fromisoformat(date2)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid date: {exc}")

    if d1 == d2:
        raise HTTPException(status_code=422, detail="date1 and date2 must be different")

    today = date.today()
    half = timedelta(days=window_days)

    def clamp_dates(centre: date):
        s = max(date(1981, 1, 1), centre - half)
        e = min(today - timedelta(days=1), centre + half)
        return s, e

    s1, e1 = clamp_dates(d1)
    s2, e2 = clamp_dates(d2)

    # Fetch both periods
    data1, data2 = await fetch_daily_power(latitude, longitude, s1, e1), \
                   await fetch_daily_power(latitude, longitude, s2, e2)

    period1 = _period_stats(data1, "Period 1", s1, e1)
    period2 = _period_stats(data2, "Period 2", s2, e2)

    # Compute deltas
    def delta(key):
        a = period1.get(key)
        b = period2.get(key)
        if a is None or b is None:
            return None
        return round(b - a, 3)

    indicators = ["mean_temp_c", "total_precip_mm", "mean_soil_wetness",
                  "ndvi_proxy_mean", "spi_recent", "total_gdd", "stress_score"]
    deltas = {k: delta(k) for k in indicators}

    # Arrow/direction helpers
    def direction(d_val, higher_is_better: bool):
        if d_val is None:
            return "—"
        if abs(d_val) < 0.01:
            return "→ No change"
        improved = (d_val > 0) == higher_is_better
        arrow    = "↑" if d_val > 0 else "↓"
        return f"{arrow} {'Improved' if improved else 'Worsened'}"

    indicator_meta = {
        "mean_temp_c":       {"label": "Mean Temperature (°C)",    "higher_is_better": False},
        "total_precip_mm":   {"label": "Total Precipitation (mm)",  "higher_is_better": True},
        "mean_soil_wetness": {"label": "Root-zone Soil Wetness",    "higher_is_better": True},
        "ndvi_proxy_mean":   {"label": "NDVI Proxy (Vegetation)",   "higher_is_better": True},
        "spi_recent":        {"label": "Precipitation Anomaly (SPI proxy)", "higher_is_better": True},
        "total_gdd":         {"label": "Growing Degree Days",       "higher_is_better": True},
        "stress_score":      {"label": "Agricultural Stress Score", "higher_is_better": False},
    }

    comparison_table = []
    for k, meta in indicator_meta.items():
        d_val = deltas.get(k)
        comparison_table.append({
            "indicator":    meta["label"],
            "period1_value": period1.get(k),
            "period2_value": period2.get(k),
            "delta":         d_val,
            "direction":     direction(d_val, meta["higher_is_better"]),
        })

    # GIBS imagery URLs (True Colour from MODIS Terra)
    gibs_layer = "MODIS_Terra_CorrectedReflectance_TrueColor"
    imagery = {
        "period1": {
            "layer":   gibs_layer,
            "date":    d1.isoformat(),
            "wms_url": _gibs_wms_url(gibs_layer, d1.isoformat(), latitude, longitude),
            "note":    "MODIS Terra True Colour — nearest available overpass",
        },
        "period2": {
            "layer":   gibs_layer,
            "date":    d2.isoformat(),
            "wms_url": _gibs_wms_url(gibs_layer, d2.isoformat(), latitude, longitude),
            "note":    "MODIS Terra True Colour — nearest available overpass",
        },
    }

    # Narrative
    stress_change = deltas.get("stress_score", 0) or 0
    precip_change = deltas.get("total_precip_mm", 0) or 0
    ndvi_change   = deltas.get("ndvi_proxy_mean", 0) or 0

    narrative_parts = []
    if abs(precip_change) > 20:
        direction_str = "wetter" if precip_change > 0 else "drier"
        narrative_parts.append(
            f"Period 2 was notably {direction_str} ({precip_change:+.0f} mm precipitation change)."
        )
    if abs(ndvi_change) > 0.05:
        veg_dir = "improved" if ndvi_change > 0 else "declined"
        narrative_parts.append(f"Vegetation cover {veg_dir} between the two periods.")
    if stress_change > 5:
        narrative_parts.append(
            f"Agricultural stress increased by {stress_change:.1f} points — conditions worsened."
        )
    elif stress_change < -5:
        narrative_parts.append(
            f"Agricultural stress decreased by {abs(stress_change):.1f} points — conditions improved."
        )
    else:
        narrative_parts.append("Overall agricultural conditions were relatively stable between periods.")

    narrative_parts.append(
        "Note: Climate indicators are derived from NASA POWER reanalysis (~55 km resolution). "
        "GIBS imagery provides visual context from MODIS satellite observations."
    )

    is_demo = data1.get("_demo", False) or data2.get("_demo", False)

    return {
        "location":       {"latitude": latitude, "longitude": longitude},
        "period1":        period1,
        "period2":        period2,
        "comparison_table": comparison_table,
        "imagery":        imagery,
        "narrative":      " ".join(narrative_parts),
        "is_demo":        is_demo,
        "demo_notice":    (data1.get("_demo_notice") or data2.get("_demo_notice")) if is_demo else None,
        "data_source":    "NASA POWER MERRA-2 reanalysis + NASA GIBS MODIS imagery",
        "scientific_note": (
            "Climate indicators use ~55 km POWER reanalysis data. "
            "NDVI values are proxy estimates from soil wetness, not direct satellite NDVI observations. "
            "For true NDVI, consult MODIS MOD13 or VIIRS VNP13 products."
        ),
    }
