"""
AGROSCOPE AI -- HTTP Integration Tests
=======================================
Tests every API endpoint over real HTTP using httpx + FastAPI TestClient.
No external network calls required -- NASA POWER falls back to demo mode.

Run: cd backend && python -m pytest tests/test_integration.py -v
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

KANSAS_LAT  =  38.34
KANSAS_LON  = -98.12
START_DATE  = "2023-01-01"
END_DATE    = "2023-03-31"   # 3-month window keeps demo fast


# ── Health ──────────────────────────────────────────────────────────────────

def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") == "ok"


# ── Field Intelligence ────────────────────────────────────────────────────────

def test_analyze_field_valid():
    r = client.get("/api/field-intelligence/analyze", params={
        "latitude":   KANSAS_LAT,
        "longitude":  KANSAS_LON,
        "start_date": START_DATE,
        "end_date":   END_DATE,
        "label":      "Test Kansas",
    })
    assert r.status_code == 200, r.text
    data = r.json()
    # Structure
    assert "location"    in data
    assert "period"      in data
    assert "climate"     in data
    assert "stress"      in data
    assert "crop_recommendations" in data
    assert "key_findings" in data
    assert "is_demo"     in data
    # Location echoed back correctly
    assert abs(data["location"]["latitude"]  - KANSAS_LAT) < 1e-6
    assert abs(data["location"]["longitude"] - KANSAS_LON) < 1e-6
    # Stress score in valid range
    assert 0 <= data["stress"]["score"] <= 100
    # At least some findings
    assert len(data["key_findings"]) >= 2
    # Crop recommendations: up to 6
    assert 1 <= len(data["crop_recommendations"]) <= 6
    # SPI proxy notice must be present (scientific accuracy fix)
    spi = data["climate"].get("spi_3", {})
    assert "proxy_notice" in spi, "SPI proxy_notice field missing"


def test_analyze_field_invalid_lat():
    r = client.get("/api/field-intelligence/analyze", params={
        "latitude": 999, "longitude": 0,
    })
    assert r.status_code == 422


def test_analyze_field_invalid_lon():
    r = client.get("/api/field-intelligence/analyze", params={
        "latitude": 0, "longitude": 999,
    })
    assert r.status_code == 422


def test_analyze_field_start_after_end():
    r = client.get("/api/field-intelligence/analyze", params={
        "latitude":   KANSAS_LAT,
        "longitude":  KANSAS_LON,
        "start_date": "2023-12-31",
        "end_date":   "2023-01-01",
    })
    assert r.status_code == 422


def test_analyze_field_missing_lat():
    r = client.get("/api/field-intelligence/analyze", params={"longitude": 0})
    assert r.status_code == 422


# ── Power ─────────────────────────────────────────────────────────────────────

def test_power_daily_valid():
    r = client.get("/api/power/daily", params={
        "latitude":   KANSAS_LAT,
        "longitude":  KANSAS_LON,
        "start_date": START_DATE,
        "end_date":   END_DATE,
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert "temperature"  in data
    assert "precipitation" in data
    assert "is_demo"      in data
    # demo_notice must be populated when is_demo=True
    if data["is_demo"]:
        assert data["demo_notice"], "demo_notice should be non-empty in demo mode"


def test_power_daily_invalid_lat():
    r = client.get("/api/power/daily", params={
        "latitude": -999, "longitude": 0,
        "start_date": START_DATE, "end_date": END_DATE,
    })
    assert r.status_code == 422


def test_power_monthly_valid():
    r = client.get("/api/power/monthly", params={
        "latitude":   KANSAS_LAT,
        "longitude":  KANSAS_LON,
        "start_year": 2020,
        "end_year":   2023,
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert "temperature" in data
    assert "is_demo"     in data


# ── Vegetation ────────────────────────────────────────────────────────────────

def test_gibs_layers():
    r = client.get("/api/vegetation/gibs-layers")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "layers" in data
    assert len(data["layers"]) >= 1
    for layer in data["layers"]:
        assert "key"  in layer
        assert "name" in layer
        assert "tile_url" in layer


def test_ndvi_proxy_valid():
    r = client.get("/api/vegetation/ndvi-proxy", params={
        "latitude":   KANSAS_LAT,
        "longitude":  KANSAS_LON,
        "start_date": START_DATE,
        "end_date":   END_DATE,
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert "ndvi_proxy" in data
    assert "is_proxy" in data
    assert data["is_proxy"] is True


# ── Soil Moisture ─────────────────────────────────────────────────────────────

def test_soil_moisture_valid():
    r = client.get("/api/soil-moisture/", params={
        "latitude":   KANSAS_LAT,
        "longitude":  KANSAS_LON,
        "start_date": START_DATE,
        "end_date":   END_DATE,
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert "analysis" in data or "surface_soil_wetness" in data


# ── Advisor ───────────────────────────────────────────────────────────────────

def test_advisor_recommendations():
    r = client.get("/api/advisor/recommendations", params={
        "latitude":  KANSAS_LAT,
        "longitude": KANSAS_LON,
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert "adaptation_strategies" in data or "crop_rotation_ranking" in data


# ── Reports ───────────────────────────────────────────────────────────────────

def test_field_report_markdown():
    r = client.get("/api/reports/field-report", params={
        "latitude":   KANSAS_LAT,
        "longitude":  KANSAS_LON,
        "start_date": START_DATE,
        "end_date":   END_DATE,
        "format":     "markdown",
    })
    assert r.status_code == 200, r.text
    # Should be text content or JSON with report string
    assert len(r.text) > 100  # non-trivial content


# ── CORS headers ─────────────────────────────────────────────────────────────

def test_cors_preflight():
    r = client.options("/api/health", headers={
        "Origin":                         "http://localhost:3000",
        "Access-Control-Request-Method":  "GET",
        "Access-Control-Request-Headers": "content-type",
    })
    # FastAPI CORS middleware returns 200 for OPTIONS preflight
    assert r.status_code in (200, 204)
    # ACAO header must be set
    acao = r.headers.get("access-control-allow-origin", "")
    assert acao in ("*", "http://localhost:3000"), f"ACAO={acao!r}"


# ── Farm Futures Lab ──────────────────────────────────────────────────────────

def test_scenarios_simulate():
    r = client.get("/api/scenarios/simulate", params={
        "latitude":           KANSAS_LAT,
        "longitude":          KANSAS_LON,
        "start_date":         START_DATE,
        "end_date":           END_DATE,
        "rainfall_delta_pct": -20.0,
        "temp_delta_c":        2.0,
        "soil_moisture_delta": -0.05,
        "irrigation_available": True,
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert "baseline" in data
    assert "scenario" in data
    assert "delta_summary" in data
    assert "narrative" in data
    assert "scientific_disclaimer" in data


# ── Satellite Change Detective ────────────────────────────────────────────────

def test_change_detection_compare():
    r = client.get("/api/change-detection/compare", params={
        "latitude":    KANSAS_LAT,
        "longitude":   KANSAS_LON,
        "date1":       "2022-07-01",
        "date2":       "2023-07-01",
        "window_days": 15,
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert "period1" in data
    assert "period2" in data
    assert "comparison_table" in data
    assert "imagery" in data
    assert "narrative" in data


# ── Smart Water Intelligence ──────────────────────────────────────────────────

def test_water_intelligence_analysis():
    r = client.get("/api/water/analysis", params={
        "latitude":   KANSAS_LAT,
        "longitude":  KANSAS_LON,
        "start_date": START_DATE,
        "end_date":   END_DATE,
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert "gwetroot_series" in data
    assert "water_stress_index" in data
    assert "seasonal_comparison" in data
    assert "dry_spells" in data


# ── Crop Phenology Tracker ────────────────────────────────────────────────────

def test_phenology_seasonal():
    r = client.get("/api/phenology/seasonal", params={
        "latitude":  KANSAS_LAT,
        "longitude": KANSAS_LON,
        "years":     "2022,2023",
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert "curves" in data
    assert len(data["curves"]) == 2
    assert "phenological_events" in data["curves"][0]
    assert "anomaly" in data


# ── Regional Risk Radar ───────────────────────────────────────────────────────

def test_risk_radar_regional():
    r = client.get("/api/risk/regional", params={
        "start_date":  START_DATE,
        "end_date":    END_DATE,
        "use_presets": True,
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert "locations" in data
    assert len(data["locations"]) > 0
    assert "summary" in data
    assert "mean_stress" in data["summary"]


# ── Field Boundary Intelligence ───────────────────────────────────────────────

def test_field_boundary_polygon():
    polygon_payload = {
        "field_name": "Kansas Test Farm",
        "start_date": START_DATE,
        "end_date":   END_DATE,
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [KANSAS_LON - 0.02, KANSAS_LAT - 0.02],
                [KANSAS_LON + 0.02, KANSAS_LAT - 0.02],
                [KANSAS_LON + 0.02, KANSAS_LAT + 0.02],
                [KANSAS_LON - 0.02, KANSAS_LAT + 0.02],
                [KANSAS_LON - 0.02, KANSAS_LAT - 0.02],
            ]
        }
    }
    r = client.post("/api/field/analyze-boundary", json=polygon_payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "boundary_metrics" in data
    assert data["boundary_metrics"]["area_hectares"] > 0
    assert "centroid" in data["boundary_metrics"]
    assert "analysis" in data
    assert "spatial_resolution_disclaimer" in data

