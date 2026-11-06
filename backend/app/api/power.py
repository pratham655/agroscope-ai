"""NASA POWER climate data router."""

from fastapi import APIRouter, HTTPException, Query
from datetime import date
from typing import Optional
import logging
import numpy as np

from app.services.nasa_power import fetch_daily_power, fetch_monthly_power, CLIMATE_PARAMS, SOIL_PARAMS
from app.services.science import linear_trend, calculate_spi, calculate_gdd
from app.models.schemas import TimeSeries

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/daily")
async def get_daily_climate(
    latitude:   float = Query(..., ge=-90,  le=90,  description="Decimal degrees"),
    longitude:  float = Query(..., ge=-180, le=180, description="Decimal degrees"),
    start_date: date  = Query(..., description="Start date (YYYY-MM-DD), earliest 1981-01-01"),
    end_date:   date  = Query(..., description="End date (YYYY-MM-DD)"),
):
    """
    Fetch daily agroclimatic data from NASA POWER for a geographic point.

    Returns temperature, precipitation, humidity, solar radiation,
    and soil wetness time series.

    Data type: Model-reanalysis product (NASA POWER / MERRA-2).
    Not direct satellite observation.
    """
    try:
        raw = await fetch_daily_power(latitude, longitude, start_date, end_date)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    params = raw.get("properties", {}).get("parameter", {})
    is_demo = raw.get("_demo", False)

    def extract_series(param_key: str, unit: str, name: str) -> Optional[dict]:
        if param_key not in params:
            return None
        items = params[param_key]
        dates  = sorted(items.keys())
        values = [items[d] for d in dates]
        return {
            "dates":     dates,
            "values":    values,
            "unit":      unit,
            "parameter": name,
            "source":    "NASA POWER (MERRA-2 reanalysis)" if not is_demo else "DEMO DATA",
            "is_demo":   is_demo,
        }

    result = {
        "location":    {"latitude": latitude, "longitude": longitude},
        "period":      {"start": str(start_date), "end": str(end_date)},
        "is_demo":     is_demo,
        "demo_notice": raw.get("_demo_notice", ""),
        "temperature": {
            "mean": extract_series("T2M",     "°C", "Mean Temperature at 2m"),
            "min":  extract_series("T2M_MIN", "°C", "Min Temperature at 2m"),
            "max":  extract_series("T2M_MAX", "°C", "Max Temperature at 2m"),
        },
        "precipitation":    extract_series("PRECTOTCORR", "mm/day", "Precipitation (bias-corrected)"),
        "humidity":         extract_series("RH2M",        "%",      "Relative Humidity at 2m"),
        "solar_radiation":  extract_series("ALLSKY_SFC_SW_DWN", "MJ/m²/day", "Downward Solar Irradiance"),
        "soil_moisture": {
            "surface":   extract_series("GWETTOP",   "fraction (0-1)", "Surface Soil Wetness (0-5cm)"),
            "root_zone": extract_series("GWETROOT",  "fraction (0-1)", "Root-Zone Soil Wetness"),
            "profile":   extract_series("GWETPROF",  "fraction (0-1)", "Profile Soil Wetness"),
        },
        "data_source": {
            "name": "NASA POWER Agroclimatology",
            "url":  "https://power.larc.nasa.gov/",
            "type": "Model reanalysis (MERRA-2 / GMAO)",
            "resolution": "~0.5° × 0.625° (~55 km)",
            "note": (
                "POWER provides model-derived estimates, not direct satellite "
                "surface measurements. Values represent spatial averages over the grid cell."
            ),
        },
    }

    # Compute SPI-3 if precipitation available
    precip_series = extract_series("PRECTOTCORR", "mm/day", "Precip")
    if precip_series and len(precip_series["values"]) >= 3:
        spi_vals = calculate_spi(precip_series["values"], timescale=3)
        clean_spi = [round(v, 3) if (v is not None and not np.isnan(v)) else None for v in spi_vals]
        result["spi_3"] = {
            "dates":     precip_series["dates"],
            "values":    clean_spi,
            "unit":      "standard deviations",
            "parameter": "Precipitation Anomaly Index (3-day rolling SPI proxy, NOT standard monthly SPI-3)",
            "source":    "Calculated from NASA POWER PRECTOTCORR daily data",
            "is_demo":   is_demo,
            "reference": "SPI method: McKee et al. (1993). IMPORTANT: standard SPI-3 uses 3-month "
                         "accumulations; this implementation uses 3-day daily rolling sums from POWER "
                         "data. Values are directionally consistent with SPI interpretation but are "
                         "NOT equivalent to the published monthly SPI-3 drought index.",
        }

    return result


@router.get("/monthly")
async def get_monthly_climate(
    latitude:   float = Query(..., ge=-90,  le=90),
    longitude:  float = Query(..., ge=-180, le=180),
    start_year: int   = Query(2015, ge=1981, le=2030),
    end_year:   int   = Query(2024, ge=1981, le=2030),
):
    """Monthly climate aggregates and trend analysis."""
    try:
        raw = await fetch_monthly_power(latitude, longitude, start_year, end_year)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    params  = raw.get("properties", {}).get("parameter", {})
    is_demo = raw.get("_demo", False)

    def extract(key: str, unit: str, name: str):
        if key not in params:
            return None
        items  = params[key]
        dates  = sorted(items.keys())
        values = [items[d] for d in dates]
        trend  = linear_trend(values)
        return {
            "dates": dates, "values": values,
            "unit": unit, "parameter": name,
            "trend": trend,
            "source": "NASA POWER Monthly" if not is_demo else "DEMO",
            "is_demo": is_demo,
        }

    return {
        "location":    {"latitude": latitude, "longitude": longitude},
        "period":      {"start_year": start_year, "end_year": end_year},
        "is_demo":     is_demo,
        "temperature": extract("T2M",           "°C",      "Monthly Mean Temperature"),
        "precipitation":extract("PRECTOTCORR",  "mm/month","Monthly Precipitation"),
        "humidity":     extract("RH2M",          "%",      "Monthly Relative Humidity"),
    }
