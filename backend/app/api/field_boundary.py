"""
Field Boundary Intelligence — Polygon-based Field Analysis API.

Allows farmers and agronomists to delineate field polygons (GeoJSON),
calculates approximate local-planar properties (centroid, bounding box, perimeter, area in hectares),
and executes the Field Intelligence analysis at the centroid.

Scientific resolution disclaimer:
NASA POWER provides ~0.5° × 0.625° (~55 km) grid-cell observations from MERRA-2.
Field-scale polygons smaller than the grid cell reflect regional agroclimatology
and atmospheric forcing rather than sub-field microvariability.
"""

from fastapi import APIRouter, HTTPException, Body
from datetime import date, timedelta
from typing import Dict, Any, List, Optional
import math
import logging

from app.api.field_intelligence import analyze_field

logger = logging.getLogger(__name__)
router = APIRouter()


def _polygon_centroid_and_area(coordinates: List[List[float]]) -> Dict[str, Any]:
    """
    Computes a planar centroid and local-scale area/perimeter approximation for one polygon ring.
    Coordinates format: [[lon1, lat1], [lon2, lat2], ...] (GeoJSON standard).
    """
    if len(coordinates) < 4:
        raise ValueError("Polygon ring must have at least 4 coordinate pairs (first and last identical).")

    # Ensure closed ring
    if coordinates[0] != coordinates[-1]:
        coordinates.append(coordinates[0])

    n = len(coordinates) - 1
    # Check valid range
    for lon, lat in coordinates:
        if not (-180 <= lon <= 180 and -90 <= lat <= 90):
            raise ValueError(f"Coordinate ({lon}, {lat}) is outside valid WGS84 range.")

    # Planar Shoelace approximation for centroid and spherical area conversion
    pts = coordinates[:-1]
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]

    min_lon, max_lon = min(xs), max(xs)
    min_lat, max_lat = min(ys), max(ys)

    # Centroid formula for polygon
    signed_area = 0.0
    cx = 0.0
    cy = 0.0

    for i in range(len(coordinates) - 1):
        x0, y0 = coordinates[i]
        x1, y1 = coordinates[i + 1]
        cross = (x0 * y1) - (x1 * y0)
        signed_area += cross
        cx += (x0 + x1) * cross
        cy += (y0 + y1) * cross

    signed_area *= 0.5
    if abs(signed_area) < 1e-9:
        # Fallback to bounding box center if points are collinear or self-cancelling
        centroid_lon = sum(xs) / len(xs)
        centroid_lat = sum(ys) / len(ys)
        area_m2 = 0.0
    else:
        cx = cx / (6.0 * signed_area)
        cy = cy / (6.0 * signed_area)
        centroid_lon = cx
        centroid_lat = cy

        # Local equirectangular approximation; not an ellipsoidal geodesic calculation.
        # 1 deg lat ~ 111,320 m; 1 deg lon ~ 111,320 * cos(mid_lat) m
        mean_lat_rad = math.radians((min_lat + max_lat) / 2.0)
        m_per_deg_lat = 111320.0
        m_per_deg_lon = 111320.0 * math.cos(mean_lat_rad)
        area_m2 = abs(signed_area) * m_per_deg_lat * m_per_deg_lon

    # Compute perimeter in km
    perimeter_m = 0.0
    mean_lat_rad = math.radians(centroid_lat)
    m_per_deg_lat = 111320.0
    m_per_deg_lon = 111320.0 * math.cos(mean_lat_rad)
    for i in range(len(coordinates) - 1):
        dx = (coordinates[i+1][0] - coordinates[i][0]) * m_per_deg_lon
        dy = (coordinates[i+1][1] - coordinates[i][1]) * m_per_deg_lat
        perimeter_m += math.sqrt(dx*dx + dy*dy)

    area_ha = round(area_m2 / 10000.0, 2)
    area_km2 = round(area_m2 / 1000000.0, 3)
    perimeter_km = round(perimeter_m / 1000.0, 2)

    return {
        "centroid": {"latitude": round(centroid_lat, 5), "longitude": round(centroid_lon, 5)},
        "bbox": {
            "min_lon": round(min_lon, 5),
            "min_lat": round(min_lat, 5),
            "max_lon": round(max_lon, 5),
            "max_lat": round(max_lat, 5),
        },
        "area_hectares": area_ha,
        "area_km2": area_km2,
        "perimeter_km": perimeter_km,
        "vertex_count": len(coordinates) - 1,
    }


@router.post("/analyze-boundary")
async def analyze_field_boundary(
    payload: Dict[str, Any] = Body(
        ...,
        example={
            "field_name": "North Field Valley",
            "start_date": "2023-01-01",
            "end_date": "2023-12-31",
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [-93.65, 41.85],
                    [-93.60, 41.85],
                    [-93.60, 41.88],
                    [-93.65, 41.88],
                    [-93.65, 41.85]
                ]
            }
        }
    )
):
    """
    Ingests GeoJSON Polygon boundary, validates geometry, computes land metrics,
    and returns comprehensive Field Intelligence for the polygon centroid.
    """
    field_name = payload.get("field_name", "Custom Field Polygon")
    geom = payload.get("geometry", {})
    start_date_str = payload.get("start_date")
    end_date_str = payload.get("end_date")

    # Support GeoJSON Feature or direct Polygon
    if geom.get("type") == "Feature":
        geom = geom.get("geometry", {})

    geom_type = geom.get("type")
    raw_coords = geom.get("coordinates")

    if geom_type != "Polygon" or not raw_coords:
        raise HTTPException(status_code=422, detail="Geometry must be a GeoJSON Polygon with valid coordinates.")

    try:
        # GeoJSON Polygon coordinates are List[List[List[float]]] (rings)
        outer_ring = raw_coords[0] if isinstance(raw_coords[0][0], list) else raw_coords
        metrics = _polygon_centroid_and_area(outer_ring)
    except Exception as exc:
        logger.error(f"Failed to process polygon coordinates: {exc}")
        raise HTTPException(status_code=422, detail=f"Polygon parsing error: {exc}")

    # Maximum area threshold check (e.g., 500,000 ha)
    if metrics["area_hectares"] > 500000:
        raise HTTPException(status_code=400, detail="Polygon area exceeds maximum limit of 500,000 hectares.")

    # Dates
    start_d = date.fromisoformat(start_date_str) if start_date_str else None
    end_d = date.fromisoformat(end_date_str) if end_date_str else None

    # Run field analysis on centroid
    analysis_res = await analyze_field(
        latitude=metrics["centroid"]["latitude"],
        longitude=metrics["centroid"]["longitude"],
        start_date=start_d,
        end_date=end_d,
        label=field_name,
    )

    return {
        "field_name": field_name,
        "boundary_metrics": metrics,
        "input_geometry": geom,
        "analysis": analysis_res,
        "spatial_resolution_disclaimer": (
            "⚠️ Boundary intelligence calculates exact perimeter, centroid, and area for the user-drawn field. "
            "These geometry metrics are not survey-grade geodesics. Meteorological and agroclimatological indicators originate from NASA POWER / MERRA-2 "
            "reanalysis at ~55 km (0.5° × 0.625°) spatial resolution. Sub-field soil variations and microtopography "
            "are not resolved by NASA POWER gridded data."
        )
    }
