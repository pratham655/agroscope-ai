"""
NASA GIBS (Global Imagery Browse Services) client.

Source: https://nasa-gibs.github.io/gibs-api-docs/
Type: WMTS tile service (OGC standard)
Authentication: None required (public service)

Provides satellite imagery layer URLs for integration with
MapLibre GL or Leaflet.js in the frontend.

Key layer IDs for AGROSCOPE AI:
  MODIS_Terra_NDVI_8Day        — 8-day NDVI composite (250m)
  MODIS_Terra_EVI_8Day         — 8-day EVI composite
  MODIS_Terra_SurfaceReflectance_Bands143 — True colour
  MODIS_Terra_Land_Surface_Temp_Day       — Daytime LST
  GPM_3IMERGM_06_precipitationCal        — Monthly precipitation
  SMAP_L3_Passive_Day_Soil_Moisture      — Soil moisture (9km)
"""

from typing import Dict, List, Optional
from datetime import date


GIBS_BASE = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best"

# Layer registry — maps semantic names to GIBS layer IDs and metadata
GIBS_LAYERS: Dict[str, Dict] = {
    "ndvi": {
        "layer_id":    "MODIS_Terra_NDVI_8Day",
        "name":        "NDVI (MODIS Terra, 8-day)",
        "format":      "image/png",
        "tile_matrix": "GoogleMapsCompatible_Level9",
        "date_format": "%Y-%m-%d",
        "description": "Normalized Difference Vegetation Index — 8-day composite at 250m resolution",
        "source":      "Terra/MODIS MOD13Q1",
        "units":       "Dimensionless (-1 to +1)",
        "limitations": "Cloud masking; 8-day composite may include residual cloud artifacts",
    },
    "evi": {
        "layer_id":    "MODIS_Terra_EVI_8Day",
        "name":        "EVI (MODIS Terra, 8-day)",
        "format":      "image/png",
        "tile_matrix": "GoogleMapsCompatible_Level9",
        "date_format": "%Y-%m-%d",
        "description": "Enhanced Vegetation Index — less soil background influence than NDVI",
        "source":      "Terra/MODIS MOD13Q1",
    },
    "true_color": {
        "layer_id":    "MODIS_Terra_SurfaceReflectance_Bands143",
        "name":        "True Colour (MODIS Terra)",
        "format":      "image/jpeg",
        "tile_matrix": "GoogleMapsCompatible_Level9",
        "date_format": "%Y-%m-%d",
        "description": "Natural-colour MODIS composite (bands 1-4-3)",
        "source":      "Terra/MODIS MOD09GA",
    },
    "lst_day": {
        "layer_id":    "MODIS_Terra_Land_Surface_Temp_Day",
        "name":        "Land Surface Temperature (MODIS, Daytime)",
        "format":      "image/png",
        "tile_matrix": "GoogleMapsCompatible_Level9",
        "date_format": "%Y-%m-%d",
        "description": "Daytime land surface temperature",
        "source":      "Terra/MODIS MOD11A1",
        "units":       "Kelvin",
    },
    "precipitation": {
        "layer_id":    "GPM_3IMERGM_06_precipitationCal",
        "name":        "Precipitation (GPM IMERG Monthly)",
        "format":      "image/png",
        "tile_matrix": "GoogleMapsCompatible_Level9",
        "date_format": "%Y-%m-01",
        "description": "Monthly precipitation accumulation from GPM IMERG",
        "source":      "GPM IMERG v06",
        "units":       "mm/hr",
    },
    "soil_moisture": {
        "layer_id":    "SMAP_L3_Passive_Day_Soil_Moisture",
        "name":        "Soil Moisture (SMAP L3, Daily)",
        "format":      "image/png",
        "tile_matrix": "GoogleMapsCompatible_Level9",
        "date_format": "%Y-%m-%d",
        "description": "Near-surface soil moisture from SMAP L-band radiometer",
        "source":      "SMAP SPL3SMP",
        "units":       "m³/m³",
        "limitations": "9 km spatial resolution; gaps at high latitudes",
    },
}


def get_tile_url(layer_key: str, observation_date: Optional[date] = None) -> Dict:
    """
    Build a GIBS WMTS tile URL template for use with Leaflet / MapLibre.

    Returns tile URL template and layer metadata.
    observation_date: specific date for time-enabled layers (use latest if None)
    """
    if layer_key not in GIBS_LAYERS:
        raise ValueError(f"Unknown GIBS layer: {layer_key}. Valid: {list(GIBS_LAYERS.keys())}")

    meta   = GIBS_LAYERS[layer_key]
    layer  = meta["layer_id"]
    fmt    = meta["format"]
    matrix = meta["tile_matrix"]

    if observation_date:
        date_str = observation_date.strftime(meta.get("date_format", "%Y-%m-%d"))
    else:
        date_str = "default"

    tile_url = (
        f"{GIBS_BASE}/{layer}/default/{date_str}/{matrix}/{{z}}/{{y}}/{{x}}"
        f".{'jpg' if 'jpeg' in fmt else 'png'}"
    )

    return {
        "tile_url":    tile_url,
        "layer_id":    layer,
        "name":        meta["name"],
        "format":      fmt,
        "description": meta.get("description", ""),
        "source":      meta.get("source", "NASA GIBS"),
        "units":       meta.get("units", ""),
        "limitations": meta.get("limitations", ""),
        "date":        date_str,
        "attribution": "Imagery provided by NASA GIBS (https://earthdata.nasa.gov/gibs)",
    }


def get_all_layer_metadata() -> List[Dict]:
    """Return metadata for all registered GIBS layers."""
    return [
        {
            "key":         key,
            "layer_id":    meta["layer_id"],
            "name":        meta["name"],
            "description": meta.get("description", ""),
            "source":      meta.get("source", ""),
            "units":       meta.get("units", ""),
            "limitations": meta.get("limitations", ""),
        }
        for key, meta in GIBS_LAYERS.items()
    ]
