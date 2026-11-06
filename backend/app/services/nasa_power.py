"""
NASA POWER API client.

Dataset: NASA POWER (Prediction Of Worldwide Energy Resources)
Source: https://power.larc.nasa.gov/
Community: AG (Agroclimatology)
Spatial Resolution: ~0.5° × 0.625° (~55 km)
Temporal Resolution: Daily, Monthly, Climatology
Authentication: None required
Coverage: Global, 1981–present

Key Parameters used by AGROSCOPE AI:
  T2M           – Temperature at 2m (°C)
  T2M_MIN       – Minimum temperature at 2m (°C)
  T2M_MAX       – Maximum temperature at 2m (°C)
  PRECTOTCORR   – Precipitation (bias-corrected) (mm/day)
  RH2M          – Relative humidity at 2m (%)
  ALLSKY_SFC_SW_DWN – Solar irradiance, all-sky (MJ/m²/day)
  WS2M          – Wind speed at 2m (m/s)
  EVLAND        – Land evaporation (kg/m²/s)
  GWETTOP       – Surface soil wetness (fraction, 0–1)
  GWETROOT      – Root-zone soil wetness (fraction, 0–1)
  GWETPROF      – Profile soil wetness (fraction, 0–1)

Scientific limitations:
  - Grid-based model product (reanalysis), NOT direct satellite observation.
  - Spatial resolution (~55 km) cannot resolve sub-field variations.
  - Precipitation is bias-corrected model output, not rain-gauge measurement.
"""

import httpx
import logging
from datetime import date, timedelta
from typing import Optional, Dict, Any
from cachetools import TTLCache

from app.core.config import settings

logger = logging.getLogger(__name__)

# ─── Cache ───────────────────────────────────────────────────────────────────
_cache: TTLCache = TTLCache(maxsize=256, ttl=settings.CACHE_TTL_SECONDS)

# ─── Parameter groups ────────────────────────────────────────────────────────
CLIMATE_PARAMS = "T2M,T2M_MIN,T2M_MAX,PRECTOTCORR,RH2M,ALLSKY_SFC_SW_DWN,WS2M"
SOIL_PARAMS    = "GWETTOP,GWETROOT,GWETPROF"
ALL_AG_PARAMS  = f"{CLIMATE_PARAMS},{SOIL_PARAMS}"


async def fetch_daily_power(
    latitude: float,
    longitude: float,
    start: date,
    end: date,
    parameters: str = ALL_AG_PARAMS,
) -> Dict[str, Any]:
    """
    Fetch daily data from the NASA POWER Agroclimatology API.

    Returns raw JSON from POWER or a clearly labelled demo dataset
    when the API is unavailable.

    Raises ValueError for invalid coordinates or date ranges.
    """
    _validate_coords(latitude, longitude)
    _validate_dates(start, end)

    lat_r = round(latitude, 4)
    lon_r = round(longitude, 4)
    cache_key = f"daily|{lat_r}|{lon_r}|{start}|{end}|{parameters}"
    if cache_key in _cache:
        logger.info("POWER cache hit: %s", cache_key)
        return _cache[cache_key]

    url = (
        f"{settings.NASA_POWER_BASE_URL}/temporal/daily/point"
        f"?parameters={parameters}"
        f"&community=AG"
        f"&longitude={longitude}"
        f"&latitude={latitude}"
        f"&start={start.strftime('%Y%m%d')}"
        f"&end={end.strftime('%Y%m%d')}"
        f"&format=JSON"
    )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            # Clean missing/fill values (-999.0) in parameter series
            params = data.get("properties", {}).get("parameter", {})
            for param_key, series_dict in params.items():
                if isinstance(series_dict, dict):
                    params[param_key] = {
                        k: (None if v is None or v <= -900 else v)
                        for k, v in series_dict.items()
                    }
            _cache[cache_key] = data
            logger.info("POWER fetch OK: lat=%s lon=%s %s→%s", latitude, longitude, start, end)
            return data

    except httpx.TimeoutException:
        logger.warning("POWER API timeout — falling back to demo data")
        return _demo_daily_data(latitude, longitude, start, end)
    except httpx.HTTPStatusError as exc:
        logger.warning("POWER HTTP %s — falling back to demo data", exc.response.status_code)
        return _demo_daily_data(latitude, longitude, start, end)
    except Exception as exc:
        logger.error("POWER unexpected error: %s", exc)
        return _demo_daily_data(latitude, longitude, start, end)


async def fetch_monthly_power(
    latitude: float,
    longitude: float,
    start_year: int,
    end_year: int,
    parameters: str = CLIMATE_PARAMS,
) -> Dict[str, Any]:
    """Fetch monthly climatology data from NASA POWER."""
    _validate_coords(latitude, longitude)

    lat_r = round(latitude, 4)
    lon_r = round(longitude, 4)
    cache_key = f"monthly|{lat_r}|{lon_r}|{start_year}|{end_year}|{parameters}"
    if cache_key in _cache:
        return _cache[cache_key]

    start = date(start_year, 1, 1)
    end   = date(end_year, 12, 31)

    url = (
        f"{settings.NASA_POWER_BASE_URL}/temporal/monthly/point"
        f"?parameters={parameters}"
        f"&community=AG"
        f"&longitude={longitude}"
        f"&latitude={latitude}"
        f"&start={start.strftime('%Y%m%d')}"
        f"&end={end.strftime('%Y%m%d')}"
        f"&format=JSON"
    )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            # Clean missing/fill values (-999.0) in parameter series
            params = data.get("properties", {}).get("parameter", {})
            for param_key, series_dict in params.items():
                if isinstance(series_dict, dict):
                    params[param_key] = {
                        k: (None if v is None or v <= -900 else v)
                        for k, v in series_dict.items()
                    }
            _cache[cache_key] = data
            return data
    except Exception as exc:
        logger.warning("POWER monthly fetch failed (%s) — demo fallback", exc)
        return _demo_monthly_data(latitude, longitude, start_year, end_year)


# ─── Validation helpers ──────────────────────────────────────────────────────

def _validate_coords(lat: float, lon: float) -> None:
    if not (-90 <= lat <= 90):
        raise ValueError(f"Latitude must be between -90 and 90; got {lat}")
    if not (-180 <= lon <= 180):
        raise ValueError(f"Longitude must be between -180 and 180; got {lon}")


def _validate_dates(start: date, end: date) -> None:
    if start > end:
        raise ValueError(f"start ({start}) must be before end ({end})")
    min_date = date(1981, 1, 1)
    if start < min_date:
        raise ValueError(f"POWER data starts {min_date}; requested {start}")
    if end > date.today():
        raise ValueError(f"end ({end}) cannot be in the future")


# ─── Demo data ───────────────────────────────────────────────────────────────

def _demo_daily_data(lat: float, lon: float, start: date, end: date) -> Dict[str, Any]:
    """
    Clearly labelled demonstration dataset.
    Used when the live NASA POWER API is unavailable.
    Values are climatologically plausible for mid-latitude agricultural zones
    but are NOT real observations.
    """
    import numpy as np
    rng = np.random.default_rng(seed=int(abs(lat * 100) + abs(lon * 100)))
    days = (end - start).days + 1
    dates_list = [(start + timedelta(days=i)).strftime("%Y%m%d") for i in range(days)]

    # Seasonal temperature signal adjusted for hemisphere & latitude
    doy_arr = np.array([(start + timedelta(days=i)).timetuple().tm_yday for i in range(days)])
    phase_shift = 80 if lat >= 0 else 262  # Invert seasonal phase for Southern Hemisphere
    amplitude = 10.0 if abs(lat) > 23.5 else 4.0
    base_mean = 15.0 if abs(lat) > 23.5 else 26.0
    temp_base = base_mean + amplitude * np.sin((doy_arr - phase_shift) * 2 * np.pi / 365)
    noise     = rng.normal(0, 2, days)

    t2m      = (temp_base + noise).tolist()
    t2m_min  = (temp_base + noise - 5).tolist()
    t2m_max  = (temp_base + noise + 5).tolist()
    prec     = np.clip(rng.exponential(2.0, days), 0, 60).tolist()
    rh       = np.clip(rng.normal(65, 15, days), 20, 100).tolist()
    sol      = np.clip(12 + 6 * np.sin((doy_arr - phase_shift) * 2 * np.pi / 365) + rng.normal(0, 2, days), 2, 30).tolist()
    gwettop  = np.clip(0.40 + rng.normal(0, 0.08, days), 0.05, 0.95).tolist()
    gwetroot = np.clip(0.38 + rng.normal(0, 0.06, days), 0.08, 0.95).tolist()
    gwetprof = np.clip(0.42 + rng.normal(0, 0.05, days), 0.10, 0.95).tolist()

    param_data: Dict[str, Any] = {}
    for key, vals in [
        ("T2M", t2m), ("T2M_MIN", t2m_min), ("T2M_MAX", t2m_max),
        ("PRECTOTCORR", prec), ("RH2M", rh),
        ("ALLSKY_SFC_SW_DWN", sol),
        ("GWETTOP", gwettop),
        ("GWETROOT", gwetroot),
        ("GWETPROF", gwetprof),
    ]:
        param_data[key] = {d: round(v, 3) for d, v in zip(dates_list, vals)}

    return {
        "_demo": True,
        "_demo_notice": (
            "⚠️ DEMONSTRATION DATA — NASA POWER API was unavailable. "
            "Values are statistically realistic but are NOT real satellite observations."
        ),
        "properties": {
            "parameter": param_data,
        },
        "geometry": {"coordinates": [lon, lat], "type": "Point"},
        "header": {
            "title": "NASA/POWER CERES/MERRA2 Native Resolution Daily Data (DEMO)",
            "sources": ["DEMO"],
        },
    }


def _demo_monthly_data(lat: float, lon: float, start_year: int, end_year: int) -> Dict[str, Any]:
    """Monthly demo fallback."""
    import numpy as np
    rng = np.random.default_rng(seed=int(abs(lat * 100) + abs(lon * 100)) + 1)
    param_data: Dict[str, Any] = {"T2M": {}, "PRECTOTCORR": {}, "RH2M": {}}
    months = list(range(1, 13))
    temp_seasonal = [2, 4, 8, 13, 18, 22, 24, 23, 19, 13, 7, 3]
    prec_seasonal = [40, 35, 45, 55, 70, 60, 45, 50, 55, 65, 55, 45]

    for year in range(start_year, end_year + 1):
        for m in months:
            key = f"{year}{m:02d}"
            param_data["T2M"][key]        = round(temp_seasonal[m-1] + rng.normal(0, 1.5), 2)
            param_data["PRECTOTCORR"][key]= round(prec_seasonal[m-1] + rng.normal(0, 8), 2)
            param_data["RH2M"][key]       = round(65 + rng.normal(0, 8), 2)

    return {
        "_demo": True,
        "_demo_notice": (
            "⚠️ DEMONSTRATION DATA — Monthly NASA POWER values are simulated."
        ),
        "properties": {"parameter": param_data},
        "geometry": {"coordinates": [lon, lat], "type": "Point"},
    }
