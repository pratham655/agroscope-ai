"""Soil moisture router — POWER GWET parameters + analysis."""

from fastapi import APIRouter, Query, HTTPException
from datetime import date
import logging

from app.services.nasa_power import fetch_daily_power
from app.services.science import analyze_soil_moisture, linear_trend

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/")
async def get_soil_moisture(
    latitude:   float = Query(..., ge=-90,  le=90),
    longitude:  float = Query(..., ge=-180, le=180),
    start_date: date  = Query(...),
    end_date:   date  = Query(...),
):
    """
    Soil moisture estimates from NASA POWER (MERRA-2 land surface model).

    Parameters returned:
      GWETTOP  — Surface soil wetness (0–5 cm depth), fraction 0–1
      GWETROOT — Root-zone soil wetness (~0–100 cm), fraction 0–1
      GWETPROF — Profile soil wetness (~0–200 cm), fraction 0–1

    ⚠️ IMPORTANT DISTINCTION:
    These are model-derived estimates from the MERRA-2 land surface model,
    NOT direct satellite soil moisture observations.
    For satellite-derived soil moisture, SMAP L3 (SPL3SMP at 9 km)
    is the recommended product but requires NASA Earthdata authentication.

    Dry threshold: GWETROOT < 0.25 indicates potential root-zone water stress.
    """
    try:
        raw = await fetch_daily_power(latitude, longitude, start_date, end_date)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    params  = raw.get("properties", {}).get("parameter", {})
    is_demo = raw.get("_demo", False)

    def extract(key: str) -> dict:
        if key not in params:
            return {}
        items  = params[key]
        dates  = sorted(items.keys())
        values = [items[d] for d in dates]
        return {"dates": dates, "values": values}

    gwettop  = extract("GWETTOP")
    gwetroot = extract("GWETROOT")
    gwetprof = extract("GWETPROF")

    analysis = {}
    if gwettop and gwetroot:
        analysis = analyze_soil_moisture(
            gwettop["values"], gwetroot["values"]
        )

    trend_root = linear_trend(gwetroot.get("values", [])) if gwetroot else {}

    return {
        "location":  {"latitude": latitude, "longitude": longitude},
        "period":    {"start": str(start_date), "end": str(end_date)},
        "is_demo":   is_demo,
        "surface_soil_wetness": {
            **gwettop,
            "unit": "fraction (0–1)",
            "name": "Surface Soil Wetness (0–5 cm)",
            "source": "NASA POWER GWETTOP",
        },
        "rootzone_soil_wetness": {
            **gwetroot,
            "unit": "fraction (0–1)",
            "name": "Root-Zone Soil Wetness (~0–100 cm)",
            "source": "NASA POWER GWETROOT",
        },
        "profile_soil_wetness": {
            **gwetprof,
            "unit": "fraction (0–1)",
            "name": "Profile Soil Wetness (~0–200 cm)",
            "source": "NASA POWER GWETPROF",
        },
        "analysis":   analysis,
        "root_zone_trend": trend_root,
        "data_type":  "Model-derived estimate (NASA POWER MERRA-2 land surface model)",
        "data_source": {
            "name": "NASA POWER Agroclimatology / MERRA-2",
            "url":  "https://power.larc.nasa.gov/",
            "smap_note": (
                "For higher-resolution satellite soil moisture, access SMAP SPL3SMP "
                "at https://nsidc.org/data/smap (requires free NASA Earthdata login)."
            ),
        },
        "limitations": (
            "MERRA-2 land surface model resolution is ~55 km — unable to resolve "
            "field-scale spatial variability. Not equivalent to in-situ soil moisture probes. "
            "Values represent grid-cell averages, not point measurements."
        ),
    }
