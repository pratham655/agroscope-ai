"""
Farm Futures Lab — Scenario Simulation API.

Allows users to explore hypothetical climate shifts (rainfall, temperature,
soil moisture changes) and see how they affect agricultural stress and
crop suitability, using the existing science engine.

Scientific disclaimer: These are hypothetical scenarios, NOT climate forecasts.
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from datetime import date, timedelta
import asyncio
import logging
import math
import httpx
import re

from app.services.nasa_power import fetch_daily_power
from app.services.science import (
    calculate_spi,
    interpret_spi,
    calculate_gdd,
    cumulative_gdd,
    analyze_soil_moisture,
    compute_stress_score,
    score_crop_rotation,
    compute_ndvi_anomaly,
    linear_trend,
)
from app.api.location import (
    _fetch_nominatim_search,
    _fetch_nominatim_reverse,
    _match_gazetteer,
    _format_coord_label,
    _COORD_REGEX,
    GLOBAL_GAZETTEER,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# Curated global agricultural gazetteer for instant suggestions and reliable offline fallback
GLOBAL_AG_GAZETTEER = [
    {"label": "Kansas Wheat Belt, Finney County, Kansas, USA", "name": "Kansas Wheat Belt", "latitude": 38.34, "longitude": -98.12, "region": "North America", "country": "United States", "type": "Agricultural Basin"},
    {"label": "Iowa Corn & Soybean Belt, Story County, Iowa, USA", "name": "Iowa Corn Belt", "latitude": 41.85, "longitude": -93.62, "region": "North America", "country": "United States", "type": "Agricultural Basin"},
    {"label": "Central Valley Agro-District, Fresno County, California, USA", "name": "California Central Valley", "latitude": 36.75, "longitude": -119.77, "region": "North America", "country": "United States", "type": "Irrigated Valley"},
    {"label": "Red River Valley Spring Wheat Region, North Dakota, USA", "name": "Red River Valley", "latitude": 47.92, "longitude": -97.03, "region": "North America", "country": "United States", "type": "Grain Plain"},
    {"label": "Palouse Dryland Wheat Region, Whitman County, Washington, USA", "name": "The Palouse", "latitude": 46.73, "longitude": -117.18, "region": "North America", "country": "United States", "type": "Rolling Grain Hills"},
    {"label": "Mississippi Alluvial Plain, Sunflower County, Mississippi, USA", "name": "Mississippi Delta", "latitude": 33.41, "longitude": -90.57, "region": "North America", "country": "United States", "type": "Alluvial Plain"},
    {"label": "Saskatchewan Spring Grain Prairie, Saskatoon, Canada", "name": "Saskatchewan Grain Prairie", "latitude": 51.25, "longitude": -106.65, "region": "North America", "country": "Canada", "type": "Prairie Basin"},
    {"label": "Punjab Wheat-Rice Intensive Plain, Ludhiana District, India", "name": "Punjab Plain", "latitude": 30.73, "longitude": 76.78, "region": "South Asia", "country": "India", "type": "Intensive Agro-Ecosystem"},
    {"label": "Haryana Green Revolution Basin, Karnal District, India", "name": "Haryana Grain Basin", "latitude": 29.68, "longitude": 76.98, "region": "South Asia", "country": "India", "type": "Alluvial Plain"},
    {"label": "Uttar Pradesh Gangetic Agro-Belt, Varanasi District, India", "name": "Gangetic Plain", "latitude": 25.32, "longitude": 82.97, "region": "South Asia", "country": "India", "type": "River Basin"},
    {"label": "Madhya Pradesh Central Soybean Basin, Ujjain District, India", "name": "Malwa Plateau", "latitude": 23.18, "longitude": 75.77, "region": "South Asia", "country": "India", "type": "Black Soil Plateau"},
    {"label": "Maharashtra Cotton & Pulses Belt, Vidarbha, India", "name": "Vidarbha Agro-Zone", "latitude": 20.93, "longitude": 77.75, "region": "South Asia", "country": "India", "type": "Rainfed Agro-Zone"},
    {"label": "Cauvery River Delta Agro-Ecological Region, Thanjavur, India", "name": "Cauvery Delta", "latitude": 10.79, "longitude": 79.13, "region": "South Asia", "country": "India", "type": "Deltaic Basin"},
    {"label": "São Paulo Sugarcane & Citrus Agro-Belt, Ribeirão Preto, Brazil", "name": "São Paulo Agro-Belt", "latitude": -21.17, "longitude": -47.81, "region": "South America", "country": "Brazil", "type": "Tropical Agro-Belt"},
    {"label": "Mato Grosso Southern Amazon Cerrado Soybean Frontier, Sorriso, Brazil", "name": "Mato Grosso Cerrado", "latitude": -12.54, "longitude": -55.71, "region": "South America", "country": "Brazil", "type": "Cerrado Savannah"},
    {"label": "Pampas Humid Grain Belt, Pergamino, Buenos Aires, Argentina", "name": "Argentine Pampas", "latitude": -33.89, "longitude": -60.57, "region": "South America", "country": "Argentina", "type": "Temperate Grassland"},
    {"label": "Sahel Sudano-Sahelian Agro-Pastoral Transition Zone, Dori, Burkina Faso", "name": "Sahel Semi-Arid Zone", "latitude": 14.03, "longitude": -0.03, "region": "Sub-Saharan Africa", "country": "Burkina Faso", "type": "Semi-Arid Steppe"},
    {"label": "Rift Valley Highland Maize & Wheat Basin, Nakuru, Kenya", "name": "Rift Valley Highlands", "latitude": -0.30, "longitude": 36.07, "region": "East Africa", "country": "Kenya", "type": "Highland Agro-Zone"},
    {"label": "Oromia Cereal & Pulse Plateau, Arsi Zone, Ethiopia", "name": "Ethiopian Highlands", "latitude": 7.50, "longitude": 39.00, "region": "East Africa", "country": "Ethiopia", "type": "High Altitude Plateau"},
    {"label": "Kano Semi-Arid Millet & Sorghum Zone, Kano State, Nigeria", "name": "Kano Dryland Basin", "latitude": 12.00, "longitude": 8.52, "region": "West Africa", "country": "Nigeria", "type": "Dryland Farming"},
    {"label": "Nile Delta High-Intensity Irrigated Basin, Kafr El-Sheikh, Egypt", "name": "Nile Delta", "latitude": 31.11, "longitude": 30.94, "region": "North Africa", "country": "Egypt", "type": "Irrigated Delta"},
    {"label": "Beauce Breadbasket Limestone Plain, Chartres, France", "name": "Beauce Grain Plain", "latitude": 48.44, "longitude": 1.48, "region": "Western Europe", "country": "France", "type": "Cereal Plateau"},
    {"label": "Andalusian Guadalquivir Olive & Durum Valley, Córdoba, Spain", "name": "Guadalquivir Valley", "latitude": 37.88, "longitude": -4.78, "region": "Southern Europe", "country": "Spain", "type": "Mediterranean Valley"},
    {"label": "Po River Valley Intensive Agricultural Plain, Cremona, Italy", "name": "Po River Valley", "latitude": 45.13, "longitude": 10.02, "region": "Southern Europe", "country": "Italy", "type": "Alluvial Lowland"},
    {"label": "Lower Saxony Loess Cereal Belt, Hildesheim, Germany", "name": "German Loess Belt", "latitude": 52.15, "longitude": 9.95, "region": "Central Europe", "country": "Germany", "type": "Loess Agricultural Plain"},
    {"label": "Chernozem Black Soil Belt, Poltava Oblast, Ukraine", "name": "Ukrainian Chernozem", "latitude": 49.58, "longitude": 34.55, "region": "Eastern Europe", "country": "Ukraine", "type": "Black Soil Steppe"},
    {"label": "Vojvodina Pannonian Grain Plain, Novi Sad, Serbia", "name": "Pannonian Basin", "latitude": 45.26, "longitude": 19.83, "region": "Southeastern Europe", "country": "Serbia", "type": "Fertile Basin"},
    {"label": "North China Plain Winter Wheat-Summer Maize Plain, Dezhou, Shandong, China", "name": "North China Plain", "latitude": 37.43, "longitude": 116.29, "region": "East Asia", "country": "China", "type": "Double-Cropping Plain"},
    {"label": "Heilongjiang Black Soil Soybean-Maize Basin, Harbin, China", "name": "Northeast China Plain", "latitude": 45.75, "longitude": 126.65, "region": "East Asia", "country": "China", "type": "Temperate Black Soil"},
    {"label": "Murray-Darling Agricultural Basin, Griffith, New South Wales, Australia", "name": "Murray-Darling Basin", "latitude": -34.28, "longitude": 146.04, "region": "Oceania", "country": "Australia", "type": "Irrigated Agricultural Basin"},
    {"label": "Canterbury Agricultural Plains, Ashburton, New Zealand", "name": "Canterbury Plains", "latitude": -43.90, "longitude": 171.74, "region": "Oceania", "country": "New Zealand", "type": "Alluvial Outwash Plain"},
    {"label": "Konya Closed Basin Central Anatolian Granary, Konya, Turkey", "name": "Konya Grain Steppe", "latitude": 37.87, "longitude": 32.48, "region": "Western Asia", "country": "Turkey", "type": "Steppe Granary"},
]


def _safe(v):
    """Replace NaN/Inf with None for JSON serialization."""
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
        return [v if v != -999 else None for v in raw.values()]
    except (KeyError, AttributeError):
        return []


def _run_science_pipeline(power_data: dict):
    """Run the full science pipeline on a POWER dataset. Returns structured dict."""
    t2m     = _extract_series(power_data, "T2M")
    t2m_min = _extract_series(power_data, "T2M_MIN")
    t2m_max = _extract_series(power_data, "T2M_MAX")
    precip  = _extract_series(power_data, "PRECTOTCORR")
    gwettop = _extract_series(power_data, "GWETTOP")
    gwetroot= _extract_series(power_data, "GWETROOT")

    # Replace None with 0 for numeric ops
    def clean(lst, default=0.0):
        return [v if v is not None else default for v in lst]

    t2m_c     = clean(t2m)
    t2m_min_c = clean(t2m_min)
    t2m_max_c = clean(t2m_max)
    precip_c  = clean(precip)
    top_c     = clean(gwettop, 0.4)
    root_c    = clean(gwetroot, 0.4)

    # SPI (3-step rolling proxy)
    spi_series = calculate_spi(precip_c, timescale=3)
    spi_recent = next((v for v in reversed(spi_series) if not math.isnan(v)), float("nan"))

    # GDD
    cum_gdd = cumulative_gdd(t2m_max_c, t2m_min_c, t_base=10.0)
    total_gdd = cum_gdd[-1] if cum_gdd else 0.0

    # Soil moisture
    sm_result = analyze_soil_moisture(top_c, root_c)
    soil_mean = sm_result["root_zone"]["mean"] or 0.4

    # Total precip
    total_precip = sum(precip_c)

    # Mean temp
    mean_temp = sum(t2m_c) / max(len(t2m_c), 1)

    # NDVI anomaly proxy (deviation from period baseline)
    ndvi_proxy   = [min(1.0, max(-1.0, 0.1 + 0.5 * (r / 0.5))) for r in root_c]
    ndvi_base    = sum(ndvi_proxy) / max(len(ndvi_proxy), 1) if ndvi_proxy else 0.4
    ndvi_recent  = sum(ndvi_proxy[-30:]) / max(len(ndvi_proxy[-30:]), 1) if len(ndvi_proxy) >= 30 else ndvi_base
    ndvi_anomaly = ndvi_recent - ndvi_base

    # Temp anomaly: recent 30-day deviation from period mean
    t_recent     = sum(t2m_c[-30:]) / max(len(t2m_c[-30:]), 1) if len(t2m_c) >= 30 else mean_temp
    temp_anomaly = t_recent - mean_temp

    # Stress score
    stress = compute_stress_score(spi_recent, ndvi_anomaly, soil_mean, temp_anomaly)

    # Crop ranking
    crops = score_crop_rotation(total_gdd, total_precip, soil_mean, mean_temp, stress["score"])

    # Trend
    precip_trend = linear_trend(precip_c)

    return {
        "stress": stress,
        "crops": crops,
        "spi_recent": _safe(spi_recent),
        "spi_series": _sanitize_list(spi_series),
        "total_gdd": round(total_gdd, 1),
        "total_precip_mm": round(total_precip, 1),
        "mean_temp_c": round(mean_temp, 2),
        "soil_mean": round(soil_mean, 3),
        "ndvi_anomaly": round(ndvi_anomaly, 3),
        "temp_anomaly": round(temp_anomaly, 2),
        "precip_trend": precip_trend,
        "soil_moisture_result": sm_result,
    }


def _apply_scenario_deltas(power_data: dict, rainfall_delta_pct: float,
                            temp_delta_c: float, soil_delta: float) -> dict:
    """
    Apply scenario deltas to the raw POWER data dict.
    Returns a new POWER-shaped dict with modified values.
    """
    import copy
    import numpy as np

    modified = copy.deepcopy(power_data)
    params = modified["properties"]["parameter"]

    # Rainfall delta (percentage change)
    if "PRECTOTCORR" in params:
        factor = 1.0 + rainfall_delta_pct / 100.0
        params["PRECTOTCORR"] = {
            k: max(0.0, round(v * factor, 3)) if v != -999 else -999
            for k, v in params["PRECTOTCORR"].items()
        }

    # Temperature delta (additive)
    for key in ("T2M", "T2M_MIN", "T2M_MAX"):
        if key in params:
            params[key] = {
                k: round(v + temp_delta_c, 3) if v != -999 else -999
                for k, v in params[key].items()
            }

    # Soil moisture delta (additive, clamped 0–1)
    for key in ("GWETTOP", "GWETROOT", "GWETPROF"):
        if key in params:
            params[key] = {
                k: round(max(0.0, min(1.0, v + soil_delta)), 3) if v != -999 else -999
                for k, v in params[key].items()
            }

    return modified


@router.get("/simulate")
async def simulate_scenario(
    latitude:            float = Query(..., ge=-90, le=90,  description="Decimal degrees North"),
    longitude:           float = Query(..., ge=-180, le=180, description="Decimal degrees East"),
    start_date:          str   = Query(..., description="ISO date YYYY-MM-DD"),
    end_date:            str   = Query(..., description="ISO date YYYY-MM-DD"),
    rainfall_delta_pct:  float = Query(0.0, ge=-80, le=200, description="Rainfall change (%)"),
    temp_delta_c:        float = Query(0.0, ge=-5,  le=8,   description="Temperature change (°C)"),
    soil_moisture_delta: float = Query(0.0, ge=-0.5, le=0.5, description="Soil moisture fraction change"),
    irrigation_available: bool = Query(False, description="Whether supplemental irrigation is available"),
):
    """
    Farm Futures Lab — run baseline and hypothetical scenario side-by-side.

    Fetches real NASA POWER data, runs the science pipeline on baseline,
    then applies deltas and re-runs the pipeline on the modified dataset.

    Returns structured comparison including stress scores, crop rankings,
    SPI, GDD, and a plain-language narrative.
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

    baseline = _run_science_pipeline(power_data)

    # Apply scenario deltas
    # If irrigation is available, reduce effective soil stress by boosting soil moisture
    effective_soil_delta = soil_moisture_delta + (0.15 if irrigation_available else 0.0)
    modified_data = _apply_scenario_deltas(
        power_data,
        rainfall_delta_pct=rainfall_delta_pct,
        temp_delta_c=temp_delta_c,
        soil_delta=effective_soil_delta,
    )
    scenario = _run_science_pipeline(modified_data)

    # Delta summary
    stress_delta = round(scenario["stress"]["score"] - baseline["stress"]["score"], 1)
    gdd_delta    = round(scenario["total_gdd"] - baseline["total_gdd"], 1)
    precip_delta = round(scenario["total_precip_mm"] - baseline["total_precip_mm"], 1)
    soil_delta_r = round(scenario["soil_mean"] - baseline["soil_mean"], 3)

    # Narrative
    narrative_parts = []
    if abs(rainfall_delta_pct) > 0:
        direction = "increase" if rainfall_delta_pct > 0 else "decrease"
        narrative_parts.append(
            f"A {abs(rainfall_delta_pct):.0f}% {direction} in rainfall "
            f"{'adds' if rainfall_delta_pct > 0 else 'removes'} "
            f"{abs(precip_delta):.0f} mm of seasonal precipitation."
        )
    if abs(temp_delta_c) > 0:
        direction = "warming" if temp_delta_c > 0 else "cooling"
        narrative_parts.append(
            f"{abs(temp_delta_c):.1f}°C of {direction} shifts GDD accumulation by {gdd_delta:+.0f} °C·day."
        )
    if irrigation_available:
        narrative_parts.append(
            "Supplemental irrigation partially compensates for soil moisture deficits."
        )
    if stress_delta < -5:
        narrative_parts.append(
            f"Overall agricultural stress decreases by {abs(stress_delta):.1f} points under this scenario."
        )
    elif stress_delta > 5:
        narrative_parts.append(
            f"Overall agricultural stress increases by {stress_delta:.1f} points — "
            "adaptation measures should be considered."
        )
    else:
        narrative_parts.append(
            "Agricultural stress is largely unchanged under this scenario."
        )

    # Crop ranking shift
    baseline_top = baseline["crops"][0]["name"] if baseline["crops"] else "N/A"
    scenario_top = scenario["crops"][0]["name"] if scenario["crops"] else "N/A"
    if baseline_top != scenario_top:
        narrative_parts.append(
            f"The top-ranked crop shifts from {baseline_top} to {scenario_top} under the scenario."
        )

    return {
        "location": {"latitude": latitude, "longitude": longitude},
        "period": {"start": start_date, "end": end_date},
        "scenario_inputs": {
            "rainfall_delta_pct": rainfall_delta_pct,
            "temp_delta_c": temp_delta_c,
            "soil_moisture_delta": soil_moisture_delta,
            "irrigation_available": irrigation_available,
        },
        "baseline": baseline,
        "scenario": scenario,
        "delta_summary": {
            "stress_delta": stress_delta,
            "stress_direction": "improved" if stress_delta < 0 else ("worsened" if stress_delta > 0 else "unchanged"),
            "gdd_delta": gdd_delta,
            "precip_delta_mm": precip_delta,
            "soil_moisture_delta": soil_delta_r,
        },
        "narrative": " ".join(narrative_parts),
        "data_source": "NASA POWER Agroclimatology (MERRA-2 reanalysis, ~55 km resolution)",
        "is_demo": is_demo,
        "demo_notice": power_data.get("_demo_notice", "") if is_demo else None,
        "scientific_disclaimer": (
            "⚠️ These are hypothetical scenarios, NOT climate forecasts or agronomic model outputs. "
            "Results illustrate sensitivity to parameter changes only. "
            "Do not use for planting or investment decisions without consulting local agricultural experts."
        ),
    }


@router.get("/geocode")
async def geocode_location(
    query: str = Query(..., min_length=2, description="Village, town, city, district, state or country"),
):
    """
    Search locations globally for the Farm Futures Lab.
    Queries OpenStreetMap Nominatim with safe fallback to the built-in
    global agricultural gazetteer.
    Guarantees:
      - Always returns a response within <= 2.0s.
      - Never hangs or leaves requests pending.
      - Never substitutes Punjab or unrelated benchmark coordinates when lookup fails.
    """
    clean_q = query.strip()
    results = []
    seen_coords = set()

    # 1. Search built-in agricultural gazetteer for instant resilience
    gaz_matches = _match_gazetteer(clean_q)
    for g in gaz_matches:
        coord_key = (round(g["latitude"], 3), round(g["longitude"], 3))
        if coord_key not in seen_coords:
            seen_coords.add(coord_key)
            results.append({
                "label": g["label"],
                "name": g["name"],
                "latitude": g["latitude"],
                "longitude": g["longitude"],
                "type": g["type"],
                "country": g["country"],
                "source": g["source"],
            })

    # 2. Query Nominatim with bounded connect/total timeout
    nom_data = await _fetch_nominatim_search(clean_q, limit=6)
    for item in nom_data:
        try:
            if not isinstance(item, dict):
                continue
            lat_f = round(float(item["lat"]), 4)
            lon_f = round(float(item["lon"]), 4)
            coord_key = (round(lat_f, 3), round(lon_f, 3))
            if coord_key not in seen_coords:
                seen_coords.add(coord_key)
                disp_name = item.get("display_name", "")
                addr = item.get("address", {})
                place_name = (
                    addr.get("village")
                    or addr.get("town")
                    or addr.get("city")
                    or addr.get("county")
                    or addr.get("state_district")
                    or item.get("name")
                    or clean_q
                )
                country = addr.get("country", "")
                state = addr.get("state", "")
                label_parts = [place_name]
                if state and state != place_name:
                    label_parts.append(state)
                if country and country != state:
                    label_parts.append(country)
                label = ", ".join(label_parts) if label_parts else disp_name

                results.append({
                    "label": label,
                    "name": place_name,
                    "latitude": lat_f,
                    "longitude": lon_f,
                    "type": item.get("type", "Location").replace("_", " ").title(),
                    "country": country or "Global",
                    "source": "OpenStreetMap",
                })
        except (ValueError, KeyError, TypeError):
            continue

    return {"query": clean_q, "count": len(results), "results": results[:10]}


@router.get("/reverse-geocode")
async def reverse_geocode_location(
    latitude: Optional[float] = Query(None, ge=-90, le=90),
    longitude: Optional[float] = Query(None, ge=-180, le=180),
    lat: Optional[float] = Query(None, ge=-90, le=90),
    lon: Optional[float] = Query(None, ge=-180, le=180),
):
    """
    Reverse geocodes latitude/longitude coordinates to an administrative name.
    Accepts latitude/longitude or lat/lon query params.
    Guarantees response within <= 2.0s without hanging.
    """
    final_lat = latitude if latitude is not None else lat
    final_lon = longitude if longitude is not None else lon
    if final_lat is None or final_lon is None:
        raise HTTPException(status_code=422, detail="Missing required latitude/longitude or lat/lon parameters")

    lat_r = round(final_lat, 4)
    lon_r = round(final_lon, 4)

    # 1. Attempt reverse lookup via Nominatim with bounded timeout
    nom_data = await _fetch_nominatim_reverse(lat_r, lon_r)
    if nom_data and isinstance(nom_data, dict) and ("address" in nom_data or "display_name" in nom_data):
        addr = nom_data.get("address", {}) if isinstance(nom_data.get("address"), dict) else {}
        place = (
            addr.get("village")
            or addr.get("town")
            or addr.get("city")
            or addr.get("county")
            or addr.get("state_district")
            or addr.get("suburb")
        )
        state = addr.get("state", "")
        country = addr.get("country", "")
        parts = [p for p in [place, state, country] if p]
        label = ", ".join(parts) if parts else (nom_data.get("display_name") or f"Coordinates {lat_r}°, {lon_r}°")
        return {
            "latitude": lat_r,
            "longitude": lon_r,
            "label": label,
            "place": place or "Agricultural Parcel",
            "state": state,
            "country": country,
            "source": "OpenStreetMap",
        }

    # 2. Fallback to nearest gazetteer point if within 0.25 degrees (~25 km)
    best_loc = None
    min_dist = float("inf")
    for loc in GLOBAL_GAZETTEER:
        d = math.hypot(loc["latitude"] - lat_r, loc["longitude"] - lon_r)
        if d < min_dist:
            min_dist = d
            best_loc = loc

    if best_loc and min_dist < 0.25:
        return {
            "latitude": lat_r,
            "longitude": lon_r,
            "label": f"Near {best_loc['label']}",
            "place": best_loc["name"],
            "state": best_loc.get("region", ""),
            "country": best_loc["country"],
            "source": "Global Gazetteer",
        }

    # 3. Coordinate label
    label = _format_coord_label(lat_r, lon_r)
    return {
        "latitude": lat_r,
        "longitude": lon_r,
        "label": label,
        "place": "Custom Field Location",
        "state": "Custom Region",
        "country": "International Terrestrial Surface",
        "source": "Coordinate Math",
    }
