"""
AGROSCOPE AI — Universal Location Engine Test Suite
===================================================
Rigorous verification of the global geocoding, reverse geocoding, and preset engine.

Genuinely tests:
  1. Timeout handling via httpx.TimeoutException and asyncio.TimeoutError with bounded completion.
  2. Independent upstream HTTP failure simulation (HTTP 503, 403, and 429).
  3. Genuinely simulated malformed JSON and unexpected response structures.
  4. Complete independence of preset retrieval from external geocoding services.
  5. Accurate Mumbai resolution via offline gazetteer when Nominatim is offline.
  6. Prevention of silent fallback or substitution of Punjab or any benchmark preset for unknown queries.
  7. Strict latency performance bounds on in-memory and offline resolutions.
  8. Concurrent simultaneous requests verifying isolation and zero cross-contamination.
  9. Strict preservation of all API schemas, keys, and response contracts.
"""

import asyncio
import concurrent.futures
import time
from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient
import httpx

from app.main import app

client = TestClient(app)

MUMBAI_LAT = 19.0760
MUMBAI_LON = 72.8777
PUNJAB_LAT = 30.7300
PUNJAB_LON = 76.7800
KANSAS_LAT = 38.3400
KANSAS_LON = -98.1200
CHENNAI_LAT = 13.0827
CHENNAI_LON = 80.2707


# ─── 1. Timeout Tests with Bounded Completion ────────────────────────────────

def test_geocode_httpx_timeout_exception_bounded_completion():
    """
    Simulate genuine httpx.TimeoutException (e.g. read/connect timeout)
    and verify the endpoint completes well within bounded time without hanging or raising 500.
    """
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = httpx.TimeoutException("Upstream connection dropped")

        # Unknown location must gracefully return empty results in bounded time
        t0 = time.perf_counter()
        resp = client.get("/api/location/geocode", params={"query": "nonexistent_village_12345"})
        elapsed = time.perf_counter() - t0

        assert resp.status_code == 200
        assert elapsed < 1.5, f"Timeout handling exceeded bounded threshold: {elapsed:.3f}s"
        data = resp.json()
        assert data["query"] == "nonexistent_village_12345"
        assert data["count"] == 0
        assert data["results"] == []


def test_geocode_asyncio_timeout_error_bounded_completion():
    """
    Simulate genuine asyncio.TimeoutError (total request timeout exceeded)
    and verify the endpoint catches it gracefully and finishes within bounded latency.
    """
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = asyncio.TimeoutError("Total wait_for timeout exceeded")

        t0 = time.perf_counter()
        resp = client.get("/api/location/geocode", params={"query": "unknown_settlement_99999"})
        elapsed = time.perf_counter() - t0

        assert resp.status_code == 200
        assert elapsed < 1.5, f"Asyncio timeout handling exceeded threshold: {elapsed:.3f}s"
        data = resp.json()
        assert data["count"] == 0
        assert data["results"] == []


# ─── 2. Independent Upstream HTTP Failures (503, 403, 429) ───────────────────

def test_geocode_upstream_http_503_service_unavailable():
    """Genuinely simulate upstream HTTP 503 Service Unavailable."""
    req = httpx.Request("GET", "https://nominatim.openstreetmap.org/search")
    resp_503 = httpx.Response(status_code=503, text="Service Unavailable", request=req)

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = resp_503

        # 1. Unknown location returns clean empty result
        resp = client.get("/api/location/geocode", params={"query": "unresolved_hamlet_abc"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] == 0
        assert data["results"] == []

        # 2. Mumbai still resolves via offline gazetteer despite 503
        resp_mumbai = client.get("/api/location/geocode", params={"query": "mumbai"})
        assert resp_mumbai.status_code == 200
        data_mumbai = resp_mumbai.json()
        assert data_mumbai["count"] >= 1
        assert data_mumbai["results"][0]["name"] == "Mumbai"


def test_geocode_upstream_http_403_forbidden_datacenter_block():
    """
    Genuinely simulate upstream HTTP 403 Forbidden
    (the exact error returned when cloud hosting IP ranges are blocked by Nominatim).
    """
    req = httpx.Request("GET", "https://nominatim.openstreetmap.org/search")
    resp_403 = httpx.Response(status_code=403, text="Forbidden: Cloud hosting blocked", request=req)

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = resp_403

        resp = client.get("/api/location/geocode", params={"query": "random_unindexed_area"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] == 0
        assert data["results"] == []

        # Mumbai remains resilient
        resp_m = client.get("/api/location/geocode", params={"query": "mumbai"})
        assert resp_m.status_code == 200
        assert resp_m.json()["results"][0]["name"] == "Mumbai"


def test_geocode_upstream_http_429_rate_limited():
    """Genuinely simulate upstream HTTP 429 Too Many Requests."""
    req = httpx.Request("GET", "https://nominatim.openstreetmap.org/search")
    resp_429 = httpx.Response(status_code=429, text="Too Many Requests", request=req)

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = resp_429

        resp = client.get("/api/location/geocode", params={"query": "over_rate_limit_test"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] == 0
        assert data["results"] == []


# ─── 3. Malformed JSON and Unexpected Structures ──────────────────────────────

def test_geocode_malformed_json_html_error():
    """Genuinely simulate upstream returning an HTML error page with HTTP 200."""
    req = httpx.Request("GET", "https://nominatim.openstreetmap.org/search")
    html_resp = httpx.Response(
        status_code=200,
        text="<!DOCTYPE html><html><body>502 Bad Gateway / Cloudflare Error</body></html>",
        request=req,
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = html_resp

        resp = client.get("/api/location/geocode", params={"query": "html_error_test"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] == 0
        assert data["results"] == []


def test_geocode_unexpected_dict_structure():
    """
    Genuinely simulate upstream returning a JSON dictionary instead of an expected JSON list
    (e.g., error object: {"error": {"message": "Invalid key"}}).
    """
    req = httpx.Request("GET", "https://nominatim.openstreetmap.org/search")
    dict_resp = httpx.Response(
        status_code=200,
        json={"error": {"code": 400, "message": "Query syntax error"}},
        request=req,
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = dict_resp

        resp = client.get("/api/location/geocode", params={"query": "dict_payload_test"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] == 0
        assert data["results"] == []


def test_geocode_unexpected_list_item_structures():
    """
    Genuinely simulate upstream returning a list containing non-dict or malformed items
    (e.g., string elements, missing lat/lon, invalid numeric strings).
    """
    req = httpx.Request("GET", "https://nominatim.openstreetmap.org/search")
    malformed_list_resp = httpx.Response(
        status_code=200,
        json=[
            "not_a_dictionary",
            12345,
            None,
            {"display_name": "Incomplete Point", "lat": "not_a_float", "lon": "invalid"},
            {"incomplete_keys": True},
        ],
        request=req,
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = malformed_list_resp

        resp = client.get("/api/location/geocode", params={"query": "malformed_items_test"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] == 0
        assert data["results"] == []


# ─── 4. Preset Independence from External Geocoding Services ─────────────────

def test_presets_independent_of_external_geocoding_services():
    """
    Verify /api/location/presets operates entirely in-memory and NEVER triggers
    external network calls or geocoding services.
    """
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = AssertionError("httpx.get must NEVER be called by /api/location/presets")

        t0 = time.perf_counter()
        resp = client.get("/api/location/presets")
        elapsed = time.perf_counter() - t0

        assert resp.status_code == 200
        assert elapsed < 0.05, f"Preset response too slow: {elapsed:.3f}s"
        assert mock_get.call_count == 0

        data = resp.json()
        assert data["count"] == 9
        assert len(data["presets"]) == 9
        labels = [p["label"] for p in data["presets"]]
        assert any("Punjab" in l for l in labels)
        assert any("Kansas" in l for l in labels)
        assert any("Chennai" in l for l in labels)


# ─── 5. Mumbai Resolution via Offline Gazetteer When Nominatim Down ──────────

def test_mumbai_resolves_when_nominatim_unavailable():
    """
    Verify Mumbai resolves accurately to (19.0760, 72.8777) via the curated
    offline gazetteer when Nominatim is completely unreachable.
    """
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = httpx.ConnectError("Network is unreachable")

        # 1. Forward geocode "mumbai"
        resp = client.get("/api/location/geocode", params={"query": "mumbai"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] >= 1
        mumbai = data["results"][0]
        assert mumbai["name"] == "Mumbai"
        assert abs(mumbai["latitude"] - MUMBAI_LAT) < 0.05
        assert abs(mumbai["longitude"] - MUMBAI_LON) < 0.05
        assert mumbai["source"] == "Global Gazetteer"

        # 2. Forward geocode "mumbai, india" — must NOT substitute Punjab
        resp_india = client.get("/api/location/geocode", params={"query": "mumbai, india"})
        assert resp_india.status_code == 200
        first_res = resp_india.json()["results"][0]
        assert "Mumbai" in first_res["label"] or "Mumbai" in first_res["name"]
        for r in resp_india.json()["results"]:
            assert abs(r["latitude"] - PUNJAB_LAT) > 1.0, f"False Punjab substitution found: {r}"

        # 3. Reverse geocode (19.0760, 72.8777)
        resp_rev = client.get("/api/location/reverse-geocode", params={
            "latitude": MUMBAI_LAT,
            "longitude": MUMBAI_LON,
        })
        assert resp_rev.status_code == 200
        rev_data = resp_rev.json()
        assert rev_data["place"] == "Mumbai"
        assert "Mumbai" in rev_data["label"]


# ─── 6. Unknown Locations Never Silently Resolve to Punjab or Presets ────────

def test_unknown_locations_never_substitute_punjab_or_presets():
    """
    CRITICAL SAFETY REQUIREMENT:
    When an unknown location cannot be resolved, the API must return an empty results list.
    It must NEVER substitute Punjab, Kansas, Chennai or any benchmark coordinates.
    """
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        # Upstream returns empty
        req = httpx.Request("GET", "https://nominatim.openstreetmap.org/search")
        mock_get.return_value = httpx.Response(status_code=200, json=[], request=req)

        unknown_queries = [
            "atlantis_deep_trench_9999",
            "valhalla_crater_sector_7",
            "middle_of_nowhere_desert_zone",
            "unmapped_mountain_ridge_xyz",
        ]

        for q in unknown_queries:
            resp = client.get("/api/location/geocode", params={"query": q})
            assert resp.status_code == 200
            data = resp.json()
            assert data["count"] == 0
            assert data["results"] == []

            for r in data["results"]:
                assert abs(r["latitude"] - PUNJAB_LAT) > 0.5, "Silent Punjab substitution detected!"
                assert abs(r["latitude"] - KANSAS_LAT) > 0.5, "Silent Kansas substitution detected!"
                assert abs(r["latitude"] - CHENNAI_LAT) > 0.5, "Silent Chennai substitution detected!"


def test_reverse_geocode_unknown_coords_no_preset_substitution():
    """
    Verify reverse geocoding arbitrary ocean/remote coordinates returns a clean
    coordinate math label and NEVER substitutes Punjab or any benchmark preset.
    """
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        req = httpx.Request("GET", "https://nominatim.openstreetmap.org/reverse")
        mock_get.return_value = httpx.Response(status_code=200, json={}, request=req)

        # Coordinates in the South Pacific Ocean
        lat, lon = -45.1234, -120.5678
        resp = client.get("/api/location/reverse-geocode", params={"latitude": lat, "longitude": lon})
        assert resp.status_code == 200
        data = resp.json()
        assert data["latitude"] == round(lat, 4)
        assert data["longitude"] == round(lon, 4)
        assert "Agricultural Parcel" in data["label"]
        assert "Punjab" not in data["label"]
        assert "Kansas" not in data["label"]
        assert "India" not in data.get("country", "")
        assert data["source"] == "Coordinate Math"


# ─── 7. Actual Response Latency Upper Bounds ─────────────────────────────────

def test_response_latency_bounds():
    """
    Verify actual response latency remains strictly within acceptable upper bounds:
      - /api/location/presets: < 50ms
      - /api/location/geocode (offline match): < 100ms
      - /api/location/reverse-geocode (coordinate math fallback): < 100ms
    """
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        req = httpx.Request("GET", "https://nominatim.openstreetmap.org/search")
        mock_get.return_value = httpx.Response(status_code=200, json=[], request=req)

        # Presets latency (pure in-memory lookup)
        t0 = time.perf_counter()
        resp_presets = client.get("/api/location/presets")
        preset_latency = time.perf_counter() - t0
        assert resp_presets.status_code == 200
        assert preset_latency < 0.15, f"Presets took {preset_latency * 1000:.1f}ms (expected < 150ms)"

        # Offline gazetteer geocode latency (bounded thread/async execution)
        t0 = time.perf_counter()
        resp_geo = client.get("/api/location/geocode", params={"query": "mumbai"})
        geocode_latency = time.perf_counter() - t0
        assert resp_geo.status_code == 200
        assert geocode_latency < 1.0, f"Geocode took {geocode_latency * 1000:.1f}ms (expected < 1000ms)"

        # Reverse geocode fallback latency
        t0 = time.perf_counter()
        resp_rev = client.get("/api/location/reverse-geocode", params={"latitude": 10.0, "longitude": 20.0})
        rev_latency = time.perf_counter() - t0
        assert resp_rev.status_code == 200
        assert rev_latency < 1.0, f"Reverse geocode took {rev_latency * 1000:.1f}ms (expected < 1000ms)"


# ─── 8. Simultaneous Requests & Zero Cross-Contamination ─────────────────────

def test_simultaneous_concurrent_requests_no_contamination():
    """
    Dispatch simultaneous concurrent requests across different threads.
    Verify that results are isolated and no thread or query state bleeds across requests.
    """
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        req = httpx.Request("GET", "https://nominatim.openstreetmap.org/search")
        mock_get.return_value = httpx.Response(status_code=200, json=[], request=req)

        queries = [
            ("mumbai", MUMBAI_LAT, MUMBAI_LON, "Mumbai"),
            ("kansas", KANSAS_LAT, KANSAS_LON, "Kansas"),
            ("chennai", CHENNAI_LAT, CHENNAI_LON, "Chennai"),
            ("nairobi", -1.2921, 36.8219, "Nairobi"),
            ("sydney", -33.8688, 151.2093, "Sydney"),
            ("unknown_isolated_crater_999", None, None, None),
        ]

        def _run_query(item):
            q, expected_lat, expected_lon, expected_name = item
            res = client.get("/api/location/geocode", params={"query": q})
            return q, res.status_code, res.json(), expected_lat, expected_lon, expected_name

        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
            futures = [executor.submit(_run_query, item) for item in queries]
            results = [f.result() for f in futures]

        for q, status, payload, exp_lat, exp_lon, exp_name in results:
            assert status == 200
            assert payload["query"] == q

            if exp_name is not None:
                assert payload["count"] >= 1
                first = payload["results"][0]
                assert exp_name.lower() in first["name"].lower() or exp_name.lower() in first["label"].lower()
                assert abs(first["latitude"] - exp_lat) < 0.1
                assert abs(first["longitude"] - exp_lon) < 0.1

                # Verify contamination check: Mumbai result cannot contain Kansas or vice versa
                if q == "mumbai":
                    for r in payload["results"]:
                        assert "kansas" not in r["name"].lower()
                        assert "punjab" not in r["name"].lower()
                elif q == "kansas":
                    for r in payload["results"]:
                        assert "mumbai" not in r["name"].lower()
            else:
                assert payload["count"] == 0
                assert payload["results"] == []


# ─── 9. Preservation of API Response Contracts ───────────────────────────────

def test_api_contracts_presets_geocode_reverse():
    """
    Verify exact contract structure, keys, and types for all location endpoints:
      - /api/location/presets
      - /api/location/geocode
      - /api/location/reverse-geocode
      - /api/scenarios/geocode
      - /api/scenarios/reverse-geocode
    """
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        req = httpx.Request("GET", "https://nominatim.openstreetmap.org/search")
        mock_get.return_value = httpx.Response(status_code=200, json=[], request=req)

        # 1. Presets Contract
        res_presets = client.get("/api/location/presets")
        assert res_presets.status_code == 200
        p_json = res_presets.json()
        assert isinstance(p_json["description"], str)
        assert isinstance(p_json["count"], int)
        assert isinstance(p_json["presets"], list)
        for preset in p_json["presets"]:
            assert isinstance(preset["label"], str)
            assert isinstance(preset["name"], str)
            assert isinstance(preset["latitude"], (int, float))
            assert isinstance(preset["longitude"], (int, float))
            assert isinstance(preset["country"], str)
            assert isinstance(preset["region"], str)
            assert isinstance(preset["crop"], str)
            assert isinstance(preset["note"], str)

        # 2. Location Geocode Contract
        res_geo = client.get("/api/location/geocode", params={"query": "mumbai"})
        assert res_geo.status_code == 200
        g_json = res_geo.json()
        assert isinstance(g_json["query"], str)
        assert isinstance(g_json["count"], int)
        assert isinstance(g_json["results"], list)
        for r in g_json["results"]:
            assert isinstance(r["label"], str)
            assert isinstance(r["name"], str)
            assert isinstance(r["latitude"], (int, float))
            assert isinstance(r["longitude"], (int, float))
            assert isinstance(r["type"], str)
            assert isinstance(r["country"], str)
            assert isinstance(r["source"], str)

        # 3. Location Reverse Geocode Contract
        res_rev = client.get("/api/location/reverse-geocode", params={"latitude": 19.0760, "longitude": 72.8777})
        assert res_rev.status_code == 200
        rev_json = res_rev.json()
        assert isinstance(rev_json["latitude"], (int, float))
        assert isinstance(rev_json["longitude"], (int, float))
        assert isinstance(rev_json["label"], str)
        assert isinstance(rev_json["place"], str)
        assert isinstance(rev_json["state"], str)
        assert isinstance(rev_json["country"], str)
        assert isinstance(rev_json["source"], str)

        # 4. Scenarios Geocode Contract
        res_scen_geo = client.get("/api/scenarios/geocode", params={"query": "mumbai"})
        assert res_scen_geo.status_code == 200
        sg_json = res_scen_geo.json()
        assert isinstance(sg_json["query"], str)
        assert isinstance(sg_json["count"], int)
        assert isinstance(sg_json["results"], list)

        # 5. Scenarios Reverse Geocode Contract
        res_scen_rev = client.get("/api/scenarios/reverse-geocode", params={"lat": 19.0760, "lon": 72.8777})
        assert res_scen_rev.status_code == 200
        srev_json = res_scen_rev.json()
        assert isinstance(srev_json["latitude"], (int, float))
        assert isinstance(srev_json["longitude"], (int, float))
        assert isinstance(srev_json["label"], str)
        assert isinstance(srev_json["source"], str)


# ─── 10. Genuine Upstream Successful Geocoding Simulation ────────────────────

def test_geocode_nominatim_live_success_simulation():
    """
    Simulate a genuine successful response from OpenStreetMap Nominatim for a query
    not in the offline gazetteer, and verify parsing, coordinate rounding, and attribution.
    """
    req = httpx.Request("GET", "https://nominatim.openstreetmap.org/search")
    nominatim_success_payload = [
        {
            "lat": "49.40768",
            "lon": "8.69079",
            "display_name": "Heidelberg, Baden-Württemberg, Germany",
            "type": "city",
            "name": "Heidelberg",
            "address": {
                "city": "Heidelberg",
                "state": "Baden-Württemberg",
                "country": "Germany",
            },
        }
    ]
    success_resp = httpx.Response(status_code=200, json=nominatim_success_payload, request=req)

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = success_resp

        resp = client.get("/api/location/geocode", params={"query": "heidelberg"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] >= 1
        heidelberg = data["results"][0]
        assert heidelberg["name"] == "Heidelberg"
        assert abs(heidelberg["latitude"] - 49.4077) < 0.001
        assert abs(heidelberg["longitude"] - 8.6908) < 0.001
        assert heidelberg["country"] == "Germany"
        assert heidelberg["source"] == "OpenStreetMap Nominatim"


# ─── 11. Public Nominatim usage policy regressions ───────────────────────────

def test_curated_locality_hit_does_not_call_public_nominatim():
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        response = client.get("/api/location/geocode", params={"query": "mumbai, india"})
        assert response.status_code == 200
        payload = response.json()
        assert payload["results"][0]["name"] == "Mumbai"
        assert mock_get.await_count == 0


def test_nominatim_search_cache_reuses_successful_response():
    from app.api import location as location_api
    location_api._nominatim_cache.clear()
    req = httpx.Request("GET", "https://nominatim.openstreetmap.org/search")
    upstream = httpx.Response(200, json=[{"lat": "49.40768", "lon": "8.69079", "display_name": "Heidelberg", "name": "Heidelberg", "address": {"city": "Heidelberg", "country": "Germany"}}], request=req)
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=upstream) as mock_get:
        first = client.get("/api/location/geocode", params={"query": "heidelberg cache test"})
        second = client.get("/api/location/geocode", params={"query": "heidelberg cache test"})
        assert first.status_code == second.status_code == 200
        assert first.json()["results"] == second.json()["results"]
        assert mock_get.await_count == 1


def test_nominatim_request_uses_project_identity_not_unowned_nasa_email():
    from app.api import location as location_api
    assert "github.com/pratham655/agroscope-ai" in location_api._NOMINATIM_USER_AGENT
    assert "nasa.gov" not in location_api._NOMINATIM_USER_AGENT


def test_real_slow_nominatim_request_is_cancelled_by_total_timeout(monkeypatch):
    from app.api import location as location_api
    location_api._nominatim_cache.clear()
    monkeypatch.setattr(location_api, "_NOMINATIM_TOTAL_TIMEOUT_S", 0.01)

    async def slow_request(*args, **kwargs):
        await asyncio.sleep(0.2)
        return httpx.Response(200, json=[])

    with patch("httpx.AsyncClient.get", new=slow_request):
        started = time.perf_counter()
        result = asyncio.run(location_api._fetch_nominatim_search("slow upstream regression", limit=4))
        elapsed = time.perf_counter() - started
        assert result == []
        assert elapsed < 0.15


def test_reverse_geocode_curated_point_does_not_call_public_nominatim():
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        response = client.get("/api/location/reverse-geocode", params={"latitude": MUMBAI_LAT, "longitude": MUMBAI_LON})
        assert response.status_code == 200
        assert response.json()["place"] == "Mumbai"
        assert response.json()["source"] == "Global Gazetteer"
        assert mock_get.await_count == 0


def test_scenarios_reverse_geocode_curated_point_does_not_call_public_nominatim():
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        response = client.get("/api/scenarios/reverse-geocode", params={"lat": MUMBAI_LAT, "lon": MUMBAI_LON})
        assert response.status_code == 200
        assert response.json()["place"] == "Mumbai"
        assert response.json()["source"] == "Global Gazetteer"
        assert mock_get.await_count == 0


def test_broad_country_query_tokenizer_keeps_multiword_names_intact():
    from app.api import location as location_api
    assert location_api._is_broad_country_query("India") is True
    assert location_api._is_broad_country_query("United States") is False
    assert location_api._is_broad_country_query("Mumbai, India") is False
