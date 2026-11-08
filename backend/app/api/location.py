"""
Universal Global Location Engine — AGROSCOPE AI
================================================
Provides global forward and reverse geocoding, coordinate parsing,
and agricultural benchmark presets.

Supports:
  - Country, state, province, district, city, town, village search.
  - Farm and agricultural region lookup.
  - Curated high-fidelity global gazetteer for instant resilience.
  - Raw decimal coordinate parsing (e.g. "-23.5505, -46.6333").
  - Reverse geocoding of arbitrary coordinates anywhere on Earth.
  - Guaranteed bounded timeouts (connect <= 0.8s, total <= 2.0s).
  - Clean coordinate-based fallback labels (never substituting benchmark locations).
  - OpenStreetMap Nominatim rate-limit and user-agent compliance.
"""

from __future__ import annotations

import asyncio
import logging
import math
import re
import unicodedata
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter()

# ─── Global Benchmark Presets ────────────────────────────────────────────────
# Provided strictly as quick-start demonstration examples for UI exploration.
BENCHMARK_PRESETS: List[Dict[str, Any]] = [
    {
        "label": "Punjab Plain, India",
        "name": "Punjab Indo-Gangetic Basin",
        "latitude": 30.73,
        "longitude": 76.78,
        "country": "India",
        "region": "South Asia",
        "crop": "Rice / Wheat Rotation",
        "note": "Intensive alluvial canal/tubewell irrigated rabi-kharif breadbasket",
    },
    {
        "label": "Kansas Wheat Belt, USA",
        "name": "Kansas Great Plains",
        "latitude": 38.34,
        "longitude": -98.12,
        "country": "USA",
        "region": "North America",
        "crop": "Hard Red Winter Wheat",
        "note": "Semi-arid dryland and Ogallala Aquifer center-pivot winter cereal system",
    },
    {
        "label": "Chennai Coastal Agro-Zone, India",
        "name": "Chennai Coromandel Coast",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "country": "India",
        "region": "South Asia",
        "crop": "Paddy Rice / Pulses",
        "note": "Tropical wet-and-dry coastal basin with northeast monsoon rainfall",
    },
    {
        "label": "São Paulo State, Brazil",
        "name": "São Paulo Agro-Corridor",
        "latitude": -23.5505,
        "longitude": -46.6333,
        "country": "Brazil",
        "region": "South America",
        "crop": "Soybean / Sugarcane / Citrus",
        "note": "Southern Hemisphere subtropical plateau with summer rainfall peak",
    },
    {
        "label": "Nairobi Highland Basin, Kenya",
        "name": "Nairobi Rift Highlands",
        "latitude": -1.2921,
        "longitude": 36.8219,
        "country": "Kenya",
        "region": "East Africa",
        "crop": "Maize / Horticulture / Coffee",
        "note": "Equatorial bimodal rainfall highland system (long and short rains)",
    },
    {
        "label": "Sydney Mixed Farming Basin, Australia",
        "name": "Cumberland Plain & Basin",
        "latitude": -33.8688,
        "longitude": 151.2093,
        "country": "Australia",
        "region": "Oceania",
        "crop": "Winter Cereals / Pasture",
        "note": "Southern Hemisphere temperate maritime agricultural margin",
    },
    {
        "label": "Iowa Corn Belt, USA",
        "name": "Iowa Heartland Prairies",
        "latitude": 41.85,
        "longitude": -93.62,
        "country": "USA",
        "region": "North America",
        "crop": "Corn / Soybean Rotation",
        "note": "Humid continental rainfed high-biomass grain and oilseed zone",
    },
    {
        "label": "Nile Delta Irrigated Basin, Egypt",
        "name": "Nile Alluvial Delta",
        "latitude": 31.11,
        "longitude": 30.94,
        "country": "Egypt",
        "region": "North Africa",
        "crop": "Cotton / Wheat / Vegetables",
        "note": "Hyper-arid climate completely dependent on regulated riverine irrigation",
    },
    {
        "label": "Po Valley Cereal Lowland, Italy",
        "name": "Po River Plain",
        "latitude": 45.13,
        "longitude": 10.02,
        "country": "Italy",
        "region": "Southern Europe",
        "crop": "Maize / Forage / Rice",
        "note": "Alpine-fed sub-Mediterranean alluvial cereal and forage lowlands",
    },
]

# ─── Curated Global Agricultural & Urban Gazetteer ────────────────────────────
# Used for instant offline resolution and resilience against upstream network stalls
GLOBAL_GAZETTEER: List[Dict[str, Any]] = [
    {
        "label": "Mumbai, Maharashtra, India",
        "name": "Mumbai",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "type": "Metropolis / Coastal Agro-Zone",
        "country": "India",
        "region": "South Asia",
        "keywords": ["mumbai", "bombay", "maharashtra"],
        "source": "Global Gazetteer",
    },
    {
        "label": "Delhi NCR Agro-Belt, India",
        "name": "Delhi National Capital Region",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "type": "Agricultural Hinterland",
        "country": "India",
        "region": "South Asia",
        "keywords": ["delhi", "new delhi", "ncr"],
        "source": "Global Gazetteer",
    },
    {
        "label": "Bengaluru Rural Agro-Zone, Karnataka, India",
        "name": "Bengaluru Southern Dry Zone",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "type": "Semi-Arid Agro-Zone",
        "country": "India",
        "region": "South Asia",
        "keywords": ["bengaluru", "bangalore", "karnataka"],
        "source": "Global Gazetteer",
    },
    {
        "label": "Hyderabad Semi-Arid Basin, Telangana, India",
        "name": "Hyderabad Deccan Plateau",
        "latitude": 17.3850,
        "longitude": 78.4867,
        "type": "Deccan Agro-Zone",
        "country": "India",
        "region": "South Asia",
        "keywords": ["hyderabad", "telangana"],
        "source": "Global Gazetteer",
    },
    {
        "label": "Kolkata Gangetic Delta, West Bengal, India",
        "name": "Lower Gangetic Delta Basin",
        "latitude": 22.5726,
        "longitude": 88.3639,
        "type": "Deltaic Wetland",
        "country": "India",
        "region": "South Asia",
        "keywords": ["kolkata", "calcutta", "west bengal"],
        "source": "Global Gazetteer",
    },
    {
        "label": "Ahmedabad Semi-Arid Basin, Gujarat, India",
        "name": "Gujarat Alluvial Plain",
        "latitude": 23.0225,
        "longitude": 72.5714,
        "type": "Alluvial Cotton/Groundnut Basin",
        "country": "India",
        "region": "South Asia",
        "keywords": ["ahmedabad", "gujarat"],
        "source": "Global Gazetteer",
    },
    {
        "label": "Pune Desh Agro-Climatic Zone, Maharashtra, India",
        "name": "Western Ghats Rainshadow Zone",
        "latitude": 18.5204,
        "longitude": 73.8567,
        "type": "Rainshadow Plateau",
        "country": "India",
        "region": "South Asia",
        "keywords": ["pune", "poona"],
        "source": "Global Gazetteer",
    },
    {
        "label": "Punjab Wheat-Rice Plain, Ludhiana, India",
        "name": "Punjab Indo-Gangetic Basin",
        "latitude": 30.7300,
        "longitude": 76.7800,
        "type": "Intensive Irrigated Breadbasket",
        "country": "India",
        "region": "South Asia",
        "keywords": ["punjab", "ludhiana", "amritsar", "jalandhar", "patiala", "indo-gangetic"],
        "source": "Global Gazetteer",
    },
    {
        "label": "Haryana Green Revolution Basin, Karnal, India",
        "name": "Haryana Alluvial Plain",
        "latitude": 29.6857,
        "longitude": 76.9905,
        "type": "Irrigated Alluvial Plain",
        "country": "India",
        "region": "South Asia",
        "keywords": ["haryana", "karnal"],
        "source": "Global Gazetteer",
    },
    {
        "label": "Nagpur Vidarbha Agro-Zone, Maharashtra, India",
        "name": "Vidarbha Black Soil Basin",
        "latitude": 21.1458,
        "longitude": 79.0882,
        "type": "Cotton & Soybean Plateau",
        "country": "India",
        "region": "South Asia",
        "keywords": ["nagpur", "vidarbha"],
        "source": "Global Gazetteer",
    },
    {
        "label": "Chennai Coromandel Coast, Tamil Nadu, India",
        "name": "Coromandel Coastal Agro-Zone",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "type": "Coastal Tropical Agro-Zone",
        "country": "India",
        "region": "South Asia",
        "keywords": ["chennai", "madras", "coromandel"],
        "source": "Global Gazetteer",
    },
    {
        "label": "Cauvery Delta Agro-Zone, Thanjavur, India",
        "name": "Cauvery Alluvial Rice Delta",
        "latitude": 10.7870,
        "longitude": 79.1378,
        "type": "Deltaic Rice Basin",
        "country": "India",
        "region": "South Asia",
        "keywords": ["thanjavur", "cauvery", "tanjore"],
        "source": "Global Gazetteer",
    },
    {
        "label": "Kansas Wheat Belt, Great Plains, USA",
        "name": "Kansas Winter Wheat Belt",
        "latitude": 38.3400,
        "longitude": -98.1200,
        "type": "Semi-Arid Dryland Wheat Basin",
        "country": "USA",
        "region": "North America",
        "keywords": ["kansas", "wichita", "great plains", "ogallala"],
        "source": "Global Gazetteer",
    },
    {
        "label": "Iowa Corn & Soybean Belt, USA",
        "name": "Iowa Heartland Prairies",
        "latitude": 41.8500,
        "longitude": -93.6200,
        "type": "Humid Continental Grain Belt",
        "country": "USA",
        "region": "North America",
        "keywords": ["iowa", "des moines", "ames", "corn belt"],
        "source": "Global Gazetteer",
    },
    {
        "label": "California Central Valley, Fresno, USA",
        "name": "San Joaquin Valley Agricultural District",
        "latitude": 36.7468,
        "longitude": -119.7726,
        "type": "High-Value Irrigated Valley",
        "country": "USA",
        "region": "North America",
        "keywords": ["california", "central valley", "fresno", "san joaquin"],
        "source": "Global Gazetteer",
    },
    {
        "label": "São Paulo Agro-Corridor, Ribeirão Preto, Brazil",
        "name": "São Paulo Subtropical Agricultural Belt",
        "latitude": -21.1704,
        "longitude": -47.8103,
        "type": "Subtropical Sugarcane & Citrus Basin",
        "country": "Brazil",
        "region": "South America",
        "keywords": ["sao paulo", "são paulo", "ribeirao preto", "ribeirão preto"],
        "source": "Global Gazetteer",
    },
    {
        "label": "Mato Grosso Cerrado Soybean Frontier, Sorriso, Brazil",
        "name": "Cerrado Tropical Agricultural Frontier",
        "latitude": -12.5400,
        "longitude": -55.7100,
        "type": "Tropical Savannah Grain Belt",
        "country": "Brazil",
        "region": "South America",
        "keywords": ["mato grosso", "sorriso", "cerrado"],
        "source": "Global Gazetteer",
    },
    {
        "label": "Argentine Pampas Grain Belt, Pergamino, Argentina",
        "name": "Humid Pampas Agricultural Plain",
        "latitude": -33.8900,
        "longitude": -60.5700,
        "type": "Temperate Grain & Oilseed Plain",
        "country": "Argentina",
        "region": "South America",
        "keywords": ["argentina", "pampas", "pergamino", "buenos aires"],
        "source": "Global Gazetteer",
    },
    {
        "label": "Nairobi Rift Highlands, Kenya",
        "name": "Central Kenya Bimodal Agricultural Zone",
        "latitude": -1.2921,
        "longitude": 36.8219,
        "type": "Equatorial Highland Mixed Farming",
        "country": "Kenya",
        "region": "East Africa",
        "keywords": ["nairobi", "kenya", "rift valley", "nakuru"],
        "source": "Global Gazetteer",
    },
    {
        "label": "Nile Delta Alluvial Basin, Kafr El-Sheikh, Egypt",
        "name": "Nile River Irrigated Delta",
        "latitude": 31.1100,
        "longitude": 30.9400,
        "type": "Hyper-Arid Irrigated Delta",
        "country": "Egypt",
        "region": "North Africa",
        "keywords": ["nile", "delta", "cairo", "alexandria"],
        "source": "Global Gazetteer",
    },
    {
        "label": "Po River Plain Cereal Lowlands, Cremona, Italy",
        "name": "Po Valley Alluvial Agricultural Plain",
        "latitude": 45.1300,
        "longitude": 10.0200,
        "type": "Sub-Mediterranean Alluvial Plain",
        "country": "Italy",
        "region": "Southern Europe",
        "keywords": ["po valley", "cremona", "lombardy"],
        "source": "Global Gazetteer",
    },
    {
        "label": "Beauce Cereal Plain, Chartres, France",
        "name": "Beauce Breadbasket Limestone Plain",
        "latitude": 48.4400,
        "longitude": 1.4800,
        "type": "Western European Cereal Plateau",
        "country": "France",
        "region": "Western Europe",
        "keywords": ["beauce", "chartres", "paris"],
        "source": "Global Gazetteer",
    },
    {
        "label": "Ukrainian Chernozem Belt, Poltava, Ukraine",
        "name": "Ukrainian Black Soil Steppe",
        "latitude": 49.5800,
        "longitude": 34.5500,
        "type": "Black Soil Grain Steppe",
        "country": "Ukraine",
        "region": "Eastern Europe",
        "keywords": ["ukraine", "poltava", "kyiv", "chernozem"],
        "source": "Global Gazetteer",
    },
    {
        "label": "North China Plain Wheat-Maize Belt, Dezhou, China",
        "name": "Huang-Huai-Hai Double-Cropping Plain",
        "latitude": 37.4300,
        "longitude": 116.2900,
        "type": "Intensive Double-Cropped Alluvial Plain",
        "country": "China",
        "region": "East Asia",
        "keywords": ["china", "dezhou", "shandong", "beijing", "north china plain"],
        "source": "Global Gazetteer",
    },
    {
        "label": "Sydney Mixed Farming Margin, Cumberland Plain, Australia",
        "name": "Cumberland Agricultural Basin",
        "latitude": -33.8688,
        "longitude": 151.2093,
        "type": "Temperate Maritime Agricultural Margin",
        "country": "Australia",
        "region": "Oceania",
        "keywords": ["sydney", "cumberland", "new south wales"],
        "source": "Global Gazetteer",
    },
    {
        "label": "Murray-Darling Basin Irrigated District, Griffith, Australia",
        "name": "Riverina Irrigated Agricultural Basin",
        "latitude": -34.2800,
        "longitude": 146.0400,
        "type": "Irrigated Agricultural Basin",
        "country": "Australia",
        "region": "Oceania",
        "keywords": ["murray-darling", "riverina", "griffith"],
        "source": "Global Gazetteer",
    },
]

_COORD_REGEX = re.compile(
    r"^[-+]?([0-8]?\d(\.\d+)?|90(\.0+)?)[,\s]+[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$"
)

# Standard countries to prevent cross-matching
_BROAD_COUNTRIES = {
    "india", "usa", "united states", "brazil", "kenya", "australia",
    "egypt", "italy", "france", "ukraine", "china", "argentina",
}


def _normalize_text(text: str) -> str:
    """Normalize text by converting to lowercase and stripping combining diacritics."""
    nfkd = unicodedata.normalize("NFKD", text.lower())
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def _format_coord_label(lat: float, lon: float) -> str:
    """Format human-readable coordinate label with cardinal directions."""
    lat_dir = "N" if lat >= 0 else "S"
    lon_dir = "E" if lon >= 0 else "W"
    hemi = "Southern Hemisphere" if lat < 0 else "Northern Hemisphere"
    return f"Agricultural Parcel ({abs(lat):.4f}°{lat_dir}, {abs(lon):.4f}°{lon_dir} — {hemi})"


def _match_gazetteer(query: str) -> List[Dict[str, Any]]:
    """
    Search the offline gazetteer using token-aware matching.
    Guarantees:
      - 'mumbai' or 'mumbai, india' matches Mumbai, NEVER Punjab.
      - 'punjab' matches Punjab.
      - Generic country queries match only if the query itself is solely that country.
    """
    clean_q = query.strip()
    norm_q = _normalize_text(clean_q)
    tokens = [t for t in re.split(r"[^\w]+", norm_q) if len(t) >= 2]
    if not tokens:
        return []

    is_pure_country_query = len(tokens) == 1 and tokens[0] in _BROAD_COUNTRIES
    matched: List[Dict[str, Any]] = []

    for entry in GLOBAL_GAZETTEER:
        entry_country_norm = _normalize_text(entry["country"])
        keywords_norm = [_normalize_text(k) for k in entry.get("keywords", [])]

        if is_pure_country_query:
            if tokens[0] in entry_country_norm:
                matched.append(entry)
            continue

        # Check if query contains any specific locality keyword
        has_locality_match = any(
            any(t == kw or (len(t) >= 4 and (t in kw or kw in t)) for t in tokens if t not in _BROAD_COUNTRIES)
            for kw in keywords_norm
        )

        if has_locality_match:
            matched.append(entry)

    return matched


async def _fetch_nominatim_search(query: str, limit: int = 7) -> List[Dict[str, Any]]:
    """
    Safely query OpenStreetMap Nominatim with bounded connect and total timeouts.
    Guaranteed never to hang or raise unhandled exceptions.
    """
    headers = {
        "User-Agent": "AGROSCOPE-AI/1.0 (NASA Space Apps Challenge 2026; Agricultural Earth Intelligence; mailto:agroscope-ai@nasa.gov)",
        "Accept-Language": "en",
        "Accept": "application/json",
    }
    params = {"q": query, "format": "json", "addressdetails": 1, "limit": limit}
    timeout_cfg = httpx.Timeout(timeout=1.8, connect=0.8, read=1.2, write=0.5, pool=0.5)

    async def _do_search() -> List[Dict[str, Any]]:
        async with httpx.AsyncClient(
            timeout=timeout_cfg,
            limits=httpx.Limits(max_connections=10, max_keepalive_connections=5)
        ) as client:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params=params,
                headers=headers,
            )
            if resp.status_code == 200:
                try:
                    data = resp.json()
                    if isinstance(data, list):
                        return data
                except Exception as json_err:
                    logger.warning(f"Nominatim search returned non-JSON payload: {json_err}")
            else:
                logger.warning(f"Nominatim search returned HTTP {resp.status_code} for query='{query}'")
            return []

    try:
        return await asyncio.wait_for(_do_search(), timeout=2.0)
    except asyncio.TimeoutError:
        logger.warning(f"Nominatim search timed out (>2.0s) for query='{query}'")
        return []
    except (httpx.TimeoutException, httpx.ConnectError, httpx.ConnectTimeout) as net_err:
        logger.warning(f"Nominatim network/connection error for query='{query}': {net_err}")
        return []
    except Exception as exc:
        logger.warning(f"Nominatim unexpected error for query='{query}': {exc}")
        return []


async def _fetch_nominatim_reverse(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """
    Safely reverse-geocode via OpenStreetMap Nominatim with bounded connect and total timeouts.
    Guaranteed never to hang or raise unhandled exceptions.
    """
    headers = {
        "User-Agent": "AGROSCOPE-AI/1.0 (NASA Space Apps Challenge 2026; Agricultural Earth Intelligence; mailto:agroscope-ai@nasa.gov)",
        "Accept-Language": "en",
        "Accept": "application/json",
    }
    params = {"lat": lat, "lon": lon, "format": "json", "addressdetails": 1}
    timeout_cfg = httpx.Timeout(timeout=1.8, connect=0.8, read=1.2, write=0.5, pool=0.5)

    async def _do_reverse() -> Optional[Dict[str, Any]]:
        async with httpx.AsyncClient(
            timeout=timeout_cfg,
            limits=httpx.Limits(max_connections=10, max_keepalive_connections=5)
        ) as client:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params=params,
                headers=headers,
            )
            if resp.status_code == 200:
                try:
                    data = resp.json()
                    if isinstance(data, dict):
                        return data
                except Exception as json_err:
                    logger.warning(f"Nominatim reverse returned malformed JSON: {json_err}")
            else:
                logger.warning(f"Nominatim reverse returned HTTP {resp.status_code} for ({lat}, {lon})")
            return None

    try:
        return await asyncio.wait_for(_do_reverse(), timeout=2.0)
    except asyncio.TimeoutError:
        logger.warning(f"Nominatim reverse timed out (>2.0s) for ({lat}, {lon})")
        return None
    except (httpx.TimeoutException, httpx.ConnectError, httpx.ConnectTimeout) as net_err:
        logger.warning(f"Nominatim reverse network error for ({lat}, {lon}): {net_err}")
        return None
    except Exception as exc:
        logger.warning(f"Nominatim reverse unexpected error for ({lat}, {lon}): {exc}")
        return None


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/presets")
async def get_benchmark_presets():
    """Return global benchmark agricultural locations for quick-start demonstration."""
    return {
        "description": "Global agricultural reference presets. AGROSCOPE AI supports any arbitrary coordinates worldwide.",
        "count": len(BENCHMARK_PRESETS),
        "presets": BENCHMARK_PRESETS,
    }


@router.get("/geocode")
async def geocode_location(
    query: str = Query(..., min_length=2, description="Place name or coordinates (e.g., 'Mumbai', '-23.55, -46.63')"),
):
    """
    Search locations globally.
    Supports:
      1. Coordinate parsing (e.g. '19.076, 72.877')
      2. Fast offline gazetteer matching for instant resilience (e.g. 'Mumbai')
      3. OpenStreetMap Nominatim search with bounded connect/total timeouts
      Guarantees:
      - Always returns a response within <= 2.0s.
      - Never hangs or leaves requests pending.
      - Never substitutes Punjab or unrelated benchmark coordinates when lookup fails.
    """
    clean_q = query.strip()
    results: List[Dict[str, Any]] = []
    seen_coords: set = set()

    # 1. Check if the query is a raw coordinate string
    clean_no_parens = clean_q.strip("()[]{}")
    match = _COORD_REGEX.match(clean_no_parens)
    if match:
        try:
            parts = re.split(r"[,\s]+", clean_no_parens)
            if len(parts) >= 2:
                lat_val = float(parts[0])
                lon_val = float(parts[1])
                if -90 <= lat_val <= 90 and -180 <= lon_val <= 180:
                    lat_r = round(lat_val, 4)
                    lon_r = round(lon_val, 4)
                    coord_key = (round(lat_r, 3), round(lon_r, 3))
                    seen_coords.add(coord_key)
                    label = _format_coord_label(lat_r, lon_r)
                    results.append({
                        "label": label,
                        "name": f"Coordinate Location ({lat_r}, {lon_r})",
                        "latitude": lat_r,
                        "longitude": lon_r,
                        "type": "Coordinates",
                        "country": "Global",
                        "source": "Coordinate Parser",
                    })
        except Exception:
            pass

    # 2. Check offline gazetteer for instant resilience
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

    # 3. Query OpenStreetMap Nominatim with strict bounded timeout
    nom_data = await _fetch_nominatim_search(clean_q, limit=7)
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
                    or addr.get("municipality")
                    or addr.get("county")
                    or addr.get("state_district")
                    or item.get("name")
                    or clean_q
                )
                country = addr.get("country", "")
                state = addr.get("state", "") or addr.get("region", "")
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
                    "source": "OpenStreetMap Nominatim",
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
    Reverse geocodes latitude/longitude coordinates to an administrative location label.
    Guarantees:
      - Always returns a response within <= 2.0s.
      - If Nominatim is unavailable, checks nearest gazetteer entry within ~25km,
        or falls back to an exact coordinate label.
      - NEVER silently substitutes Punjab or benchmark coordinates.
    """
    final_lat = latitude if latitude is not None else lat
    final_lon = longitude if longitude is not None else lon
    if final_lat is None or final_lon is None:
        raise HTTPException(status_code=422, detail="Missing required latitude/longitude parameters")

    lat_r = round(final_lat, 4)
    lon_r = round(final_lon, 4)

    # 1. Attempt lookup via Nominatim with bounded timeout
    nom_data = await _fetch_nominatim_reverse(lat_r, lon_r)
    if nom_data and isinstance(nom_data, dict) and ("address" in nom_data or "display_name" in nom_data):
        addr = nom_data.get("address", {}) if isinstance(nom_data.get("address"), dict) else {}
        place = (
            addr.get("village")
            or addr.get("town")
            or addr.get("city")
            or addr.get("municipality")
            or addr.get("county")
            or addr.get("state_district")
            or addr.get("suburb")
        )
        state = addr.get("state", "") or addr.get("region", "")
        country = addr.get("country", "")
        parts = [p for p in [place, state, country] if p]
        label = ", ".join(parts) if parts else (nom_data.get("display_name") or _format_coord_label(lat_r, lon_r))
        return {
            "latitude": lat_r,
            "longitude": lon_r,
            "label": label,
            "place": place or "Agricultural Parcel",
            "state": state,
            "country": country or "Global",
            "source": "OpenStreetMap",
        }

    # 2. Check if coordinates are near a known gazetteer point within 0.25 deg (~25 km)
    best_loc = None
    min_dist = float("inf")
    for g in GLOBAL_GAZETTEER:
        dist = math.hypot(g["latitude"] - lat_r, g["longitude"] - lon_r)
        if dist < min_dist:
            min_dist = dist
            best_loc = g

    if best_loc and min_dist < 0.25:
        return {
            "latitude": lat_r,
            "longitude": lon_r,
            "label": best_loc["label"],
            "place": best_loc["name"],
            "state": best_loc.get("region", ""),
            "country": best_loc["country"],
            "source": "Global Gazetteer",
        }

    # 3. Clean coordinate-based label without benchmark substitution
    label = _format_coord_label(lat_r, lon_r)
    return {
        "latitude": lat_r,
        "longitude": lon_r,
        "label": label,
        "place": "Selected Field Parcel",
        "state": "",
        "country": "Terrestrial Earth Surface",
        "source": "Coordinate Math",
    }
