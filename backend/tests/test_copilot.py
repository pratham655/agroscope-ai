"""
Tests for the OpenRouter copilot integration.

Covers:
  - Successful AI response path
  - Missing API key → rule-based fallback
  - Invalid / empty question → Pydantic validation error
  - OpenRouter HTTP 401 → fallback with error reason
  - OpenRouter HTTP 402 (credits exhausted) → fallback
  - OpenRouter HTTP 429 (rate limited) → fallback
  - Network timeout → fallback
  - Non-2xx generic → fallback
  - Unexpected response shape → fallback
  - API key redaction in model reply
  - GET /api/copilot/status when key absent
  - GET /api/copilot/status when key present
  - Context block renders correctly
"""
from __future__ import annotations

import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import httpx
from fastapi.testclient import TestClient

from app.main import app
from app.services import openrouter as or_service

def get_client() -> TestClient:
    return TestClient(app)

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------
_SAMPLE_CTX = {
    "location": {"latitude": 30.73, "longitude": 76.78, "label": "Punjab, India"},
    "period": {"start": "2023-01-01", "end": "2023-12-31"},
    "environmental_context": {
        "temperature_c": 22.5,
        "temp_anomaly_c": 1.8,
        "total_precip_mm": 650.0,
        "spi_3_recent": -1.3,
        "root_zone_wetness": 0.31,
        "cumulative_gdd": 2850.0,
        "dry_stress_pct": 18.0,
        "temp_trend": "increasing",
        "precip_trend": "decreasing",
    },
    "crop_rotation_ranking": [
        {"name": "Wheat", "score": 0.82},
        {"name": "Sorghum", "score": 0.76},
    ],
    "evidence_summary": ["SPI-3 = -1.30 (dry)"],
}

_GOOD_REPLY = "Based on NASA POWER data for Punjab, wheat is the top recommendation."


def _mock_or_response(content: str) -> httpx.Response:
    """Build a fake 200 OpenRouter response."""
    body = {
        "choices": [{"message": {"content": content}}]
    }
    return httpx.Response(200, json=body)


# ---------------------------------------------------------------------------
# openrouter service unit tests
# ---------------------------------------------------------------------------
class TestOpenRouterService:

    def test_is_configured_false_when_key_empty(self):
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", ""):
            assert or_service.is_configured() is False

    def test_is_configured_true_when_key_set(self):
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", "sk-or-test-123"):
            assert or_service.is_configured() is True

    def test_raises_key_missing_when_unconfigured(self):
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", ""):
            with pytest.raises(or_service.OpenRouterKeyMissingError):
                asyncio.run(or_service.openrouter_chat("hello"))

    def test_successful_response(self):
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", "sk-or-test-123"):
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(return_value=_mock_or_response(_GOOD_REPLY))
            with patch("app.services.openrouter.httpx.AsyncClient", return_value=mock_client):
                result = asyncio.run(or_service.openrouter_chat("What crop should I plant?", _SAMPLE_CTX))
        assert result == _GOOD_REPLY
        request_payload = mock_client.post.call_args.kwargs["json"]
        assert request_payload["max_tokens"] == 1800

    def test_timeout_raises_unavailable(self):
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", "sk-or-test-123"):
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("timed out"))
            with patch("app.services.openrouter.httpx.AsyncClient", return_value=mock_client):
                with pytest.raises(or_service.OpenRouterUnavailableError, match="timed out"):
                    asyncio.run(or_service.openrouter_chat("hello"))

    def test_http_401_raises_unavailable(self):
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", "sk-or-test-123"):
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(return_value=httpx.Response(401, text="Unauthorized"))
            with patch("app.services.openrouter.httpx.AsyncClient", return_value=mock_client):
                with pytest.raises(or_service.OpenRouterUnavailableError, match="401"):
                    asyncio.run(or_service.openrouter_chat("hello"))

    def test_http_402_raises_unavailable(self):
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", "sk-or-test-123"):
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(return_value=httpx.Response(402, text="Payment Required"))
            with patch("app.services.openrouter.httpx.AsyncClient", return_value=mock_client):
                with pytest.raises(or_service.OpenRouterUnavailableError, match="402"):
                    asyncio.run(or_service.openrouter_chat("hello"))

    def test_http_429_raises_unavailable(self):
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", "sk-or-test-123"):
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(return_value=httpx.Response(429, text="Too Many Requests"))
            with patch("app.services.openrouter.httpx.AsyncClient", return_value=mock_client):
                with pytest.raises(or_service.OpenRouterUnavailableError, match="429"):
                    asyncio.run(or_service.openrouter_chat("hello"))

    def test_non_2xx_raises_unavailable(self):
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", "sk-or-test-123"):
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(return_value=httpx.Response(503, text="Service Unavailable"))
            with patch("app.services.openrouter.httpx.AsyncClient", return_value=mock_client):
                with pytest.raises(or_service.OpenRouterUnavailableError, match="503"):
                    asyncio.run(or_service.openrouter_chat("hello"))

    def test_malformed_response_raises_unavailable(self):
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", "sk-or-test-123"):
            bad_body = httpx.Response(200, json={"unexpected": "shape"})
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(return_value=bad_body)
            with patch("app.services.openrouter.httpx.AsyncClient", return_value=mock_client):
                with pytest.raises(or_service.OpenRouterUnavailableError, match="Unexpected"):
                    asyncio.run(or_service.openrouter_chat("hello"))

    def test_api_key_redacted_from_reply(self):
        """If the model somehow echoes the key, it must be stripped."""
        secret_key = "sk-or-secret-XYZ"
        leaky_reply = f"Here is your key: {secret_key}"
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", secret_key):
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(return_value=_mock_or_response(leaky_reply))
            with patch("app.services.openrouter.httpx.AsyncClient", return_value=mock_client):
                result = asyncio.run(or_service.openrouter_chat("hello"))
        assert secret_key not in result
        assert "redacted" in result.lower()

    def test_context_block_includes_location(self):
        block = or_service._build_context_block(_SAMPLE_CTX)
        assert "Punjab" in block
        assert "30.73" in block

    def test_context_block_includes_spi(self):
        block = or_service._build_context_block(_SAMPLE_CTX)
        assert "SPI" in block
        assert "-1.30" in block

    def test_context_block_soil_wetness_scientific_formatting(self):
        """
        Verify that soil wetness is correctly identified as a dimensionless
        saturation fraction (0.0 to 1.0) and not an anomaly or z-score.
        """
        block = or_service._build_context_block(_SAMPLE_CTX)
        assert "Root-zone soil wetness fraction:" in block
        assert "0.310" in block
        assert "fraction of saturation, 0.0-1.0 scale" in block
        assert "NOT a standardized anomaly" in block

    def test_context_block_vpd_formatting(self):
        """VPD must be clearly labeled and decoupled from soil moisture in context block."""
        ctx_with_vpd = dict(_SAMPLE_CTX)
        ctx_with_vpd["environmental_context"] = dict(_SAMPLE_CTX["environmental_context"])
        ctx_with_vpd["environmental_context"]["mean_vpd_kpa"] = 1.45
        ctx_with_vpd["environmental_context"]["max_vpd_kpa"] = 2.10
        ctx_with_vpd["environmental_context"]["vpd_assessment"] = "Elevated evaporative demand"
        block = or_service._build_context_block(ctx_with_vpd)
        assert "Mean vapor pressure deficit (VPD): 1.45 kPa" in block
        assert "decoupled from soil moisture" in block

    def test_context_block_missing_vpd_uncertainty(self):
        """When VPD data is missing, an explicit uncertainty statement must appear."""
        ctx_no_vpd = dict(_SAMPLE_CTX)
        ctx_no_vpd["environmental_context"] = dict(_SAMPLE_CTX["environmental_context"])
        ctx_no_vpd["environmental_context"].pop("mean_vpd_kpa", None)
        ctx_no_vpd["environmental_context"].pop("vpd_assessment", None)
        block = or_service._build_context_block(ctx_no_vpd)
        assert "Insufficient data to assess atmospheric dryness (VPD) (RH2M missing)" in block


# ---------------------------------------------------------------------------
# API endpoint tests (via TestClient)
# ---------------------------------------------------------------------------
class TestCopilotStatusEndpoint:

    def test_status_no_key(self):
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", ""):
            resp = get_client().get("/api/copilot/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["ai_powered"] is False
        assert data["status"] == "fallback_mode"
        assert data["model"] is None

    def test_status_with_key(self):
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", "sk-or-test-123"):
            resp = get_client().get("/api/copilot/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["ai_powered"] is True
        assert data["status"] == "ai_active"
        assert data["model"] is not None
        # Key must NOT appear in response
        assert "sk-or-test-123" not in resp.text


class TestCopilotChatEndpoint:

    def _post(self, question: str, ctx=None, lat=30.73, lon=76.78, label="Punjab, India"):
        return get_client().post(
            "/api/copilot/chat",
            json={
                "question": question,
                "requested_latitude": lat,
                "requested_longitude": lon,
                "canonical_location_label": label,
                "advisor_context": ctx,
            },
        )

    def test_short_question_is_accepted(self):
        """Short conversational messages such as 'hi' must pass request validation."""
        with patch("app.api.copilot.openrouter_chat", side_effect=or_service.OpenRouterKeyMissingError()):
            resp = self._post("hi")
        assert resp.status_code == 200
        assert "reply" in resp.json()

    def test_invalid_question_empty(self):
        resp = self._post("")
        assert resp.status_code == 422

    def test_invalid_question_whitespace_only(self):
        resp = self._post("   ")
        assert resp.status_code == 422

    def test_question_too_long(self):
        resp = self._post("x" * 1001)
        assert resp.status_code == 422

    def test_fallback_when_no_key(self):
        with patch("app.api.copilot.openrouter_chat", side_effect=or_service.OpenRouterKeyMissingError()):
            resp = self._post("What crop should I plant?", _SAMPLE_CTX)
        assert resp.status_code == 200
        data = resp.json()
        assert data["ai_powered"] is False
        assert data["fallback_reason"] is not None
        assert len(data["reply"]) > 50
        assert "disclaimer" in data

    def test_successful_ai_response(self):
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", "sk-or-test-123"):
            with patch(
                "app.api.copilot.openrouter_chat",
                new=AsyncMock(return_value=_GOOD_REPLY),
            ):
                resp = self._post("What crop should I plant?", _SAMPLE_CTX)
        assert resp.status_code == 200
        data = resp.json()
        assert data["ai_powered"] is True
        assert data["reply"] == _GOOD_REPLY
        assert data["model"] is not None
        assert "sk-or-test-123" not in resp.text

    def test_api_error_returns_fallback_not_500(self):
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", "sk-or-test-123"):
            with patch(
                "app.api.copilot.openrouter_chat",
                new=AsyncMock(side_effect=or_service.OpenRouterUnavailableError("503 error")),
            ):
                resp = self._post("Should I irrigate?", _SAMPLE_CTX)
        assert resp.status_code == 200
        data = resp.json()
        assert data["ai_powered"] is False
        assert "unavailable" in data["reply"].lower() or "503" in data["reply"]
        # Key must not appear
        assert "sk-or-test-123" not in resp.text

    def test_no_context_still_works(self):
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", ""):
            resp = self._post("Should I irrigate my field?")
        assert resp.status_code == 200
        data = resp.json()
        assert data["ai_powered"] is False
        assert len(data["reply"]) > 20

    def test_disclaimer_always_present(self):
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", ""):
            resp = self._post("What is the best fertiliser?")
        assert resp.status_code == 200
        assert "disclaimer" in resp.json()

    def test_key_never_in_response_body(self):
        """API key must never appear anywhere in any response."""
        secret = "sk-or-top-secret-ABCDEF"
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", secret):
            with patch(
                "app.api.copilot.openrouter_chat",
                new=AsyncMock(return_value="Wheat is recommended."),
            ):
                resp = self._post("What crop?", _SAMPLE_CTX)
        assert secret not in resp.text

    def test_location_mismatch_blocks_punjab_for_mumbai(self):
        """
        REGRESSION TEST A & C:
        When requested location is Mumbai (19.0760, 72.8777) but context is Punjab (30.73, 76.78),
        the endpoint MUST reject the mismatch and refuse to generate a Punjab analysis.
        """
        resp = self._post(
            question="What crop should I plant in Mumbai?",
            ctx=_SAMPLE_CTX,  # Punjab context
            lat=19.0760,
            lon=72.8777,
            label="Mumbai, Maharashtra",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["mismatch_detected"] is True
        assert data["location_match"] is False
        assert data["ai_powered"] is False
        assert data["requested_latitude"] == 19.0760
        assert data["requested_longitude"] == 72.8777
        assert "Mumbai" in data["reply"]
        assert "Punjab" in data["reply"]
        assert "cannot provide a location-specific analysis until the correct data is retrieved" in data["reply"]

    def test_location_match_proceeds_normally(self):
        """Matching coordinates proceed without triggering mismatch block."""
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", ""):
            resp = self._post(
                question="What crop should I plant?",
                ctx=_SAMPLE_CTX,  # Punjab context
                lat=30.73,
                lon=76.78,
                label="Punjab, India",
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["mismatch_detected"] is False
        assert data["location_match"] is True
        assert data["requested_latitude"] == 30.73
        assert data["requested_longitude"] == 76.78

    def test_fallback_rules_engine_rejects_mismatch(self):
        """Fallback engine must also reject mismatched telemetry."""
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", ""):
            resp = self._post(
                question="Should I irrigate?",
                ctx=_SAMPLE_CTX,  # Punjab
                lat=19.0760,      # Mumbai
                lon=72.8777,
                label="Mumbai, Maharashtra",
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["mismatch_detected"] is True
        assert "mismatch" in data["fallback_reason"].lower()

    def test_heat_stress_missing_data_uncertainty(self):
        """Missing heat stress inputs must produce an explicit uncertainty statement."""
        ctx_no_heat = {
            "location": {"latitude": 30.73, "longitude": 76.78, "label": "Punjab, India"},
            "period": {"start": "2023-01-01", "end": "2023-12-31"},
            "environmental_context": {
                "temperature_c": 22.5,
                "temp_anomaly_c": 0.2,
                "heat_stress_status": "insufficient_data",
                "heat_stress_assessment": "Insufficient data to assess heat stress",
            },
        }
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", ""):
            resp = self._post(
                question="Is there severe heat stress in my field?",
                ctx=ctx_no_heat,
                lat=30.73,
                lon=76.78,
                label="Punjab, India",
            )
        assert resp.status_code == 200
        reply = resp.json()["reply"]
        assert "Insufficient data to assess heat stress" in reply

    def test_waterlogging_guidance_cites_field_inspection(self):
        """Waterlogging queries must emphasize regional indicator limitations and need for field inspection."""
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", ""):
            resp = self._post(
                question="Assess excess rainfall and waterlogging risk for my field.",
                ctx=_SAMPLE_CTX,
                lat=30.73,
                lon=76.78,
                label="Punjab, India",
            )
        assert resp.status_code == 200
        reply = resp.json()["reply"]
        assert "Waterlogging Risk Assessment" in reply
        assert "drainage" in reply.lower()
        assert "topography" in reply.lower() or "field" in reply.lower()

    def test_soil_moisture_adequate_distinguished_from_waterlogging(self):
        """0.68 soil moisture fraction must be interpreted as adequate, not waterlogging."""
        ctx_adequate = {
            "location": {"latitude": 19.0760, "longitude": 72.8777, "label": "Mumbai, Maharashtra"},
            "period": {"start": "2023-01-01", "end": "2023-12-31"},
            "environmental_context": {
                "root_zone_wetness": 0.68,
                "spi_3_recent": 0.2,
                "dry_stress_pct": 0.0,
            },
        }
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", ""):
            resp = self._post(
                question="What is the soil moisture condition?",
                ctx=ctx_adequate,
                lat=19.0760,
                lon=72.8777,
                label="Mumbai, Maharashtra",
            )
        assert resp.status_code == 200
        reply = resp.json()["reply"]
        assert "Adequate root-zone soil moisture" in reply
        assert "not waterlogging" in reply.lower()

    def test_vpd_query_handling_evaluated(self):
        """When VPD data is evaluated, the fallback provides specific VPD values and decoupling notes."""
        ctx_vpd = {
            "location": {"latitude": 30.73, "longitude": 76.78, "label": "Punjab, India"},
            "period": {"start": "2023-01-01", "end": "2023-12-31"},
            "environmental_context": {
                "mean_vpd_kpa": 1.65,
                "vpd_assessment": "Elevated atmospheric evaporative demand: mean VPD is 1.65 kPa.",
                "vpd_status": "evaluated",
            },
        }
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", ""):
            resp = self._post(
                question="What is the atmospheric dryness and VPD?",
                ctx=ctx_vpd,
                lat=30.73,
                lon=76.78,
                label="Punjab, India",
            )
        assert resp.status_code == 200
        reply = resp.json()["reply"]
        assert "Atmospheric Dryness & Evaporative Demand" in reply
        assert "1.65 kPa" in reply
        assert "independently of root-zone soil moisture" in reply

    def test_vpd_query_handling_missing_data(self):
        """When VPD data is missing, an explicit uncertainty statement is returned."""
        ctx_no_vpd = {
            "location": {"latitude": 30.73, "longitude": 76.78, "label": "Punjab, India"},
            "period": {"start": "2023-01-01", "end": "2023-12-31"},
            "environmental_context": {
                "vpd_status": "insufficient_data",
            },
        }
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", ""):
            resp = self._post(
                question="What is the VPD for this location?",
                ctx=ctx_no_vpd,
                lat=30.73,
                lon=76.78,
                label="Punjab, India",
            )
        assert resp.status_code == 200
        reply = resp.json()["reply"]
        assert "Insufficient data to assess atmospheric dryness (VPD)" in reply


class TestResponseSanitizer:
    def test_sanitizer_removes_double_escapes_and_translates_variables(self):
        from app.api.copilot import _validate_and_sanitize_response

        raw_llm = r"The \*\*GWETROOT\*\* fraction is 0.68, and \*\*PRECTOTCORR\*\* was 15 mm."
        clean = _validate_and_sanitize_response(raw_llm)
        assert r"\*\*" not in clean
        assert "**root-zone soil wetness fraction**" in clean
        assert "**daily precipitation**" in clean
        assert "GWETROOT" not in clean
        assert "PRECTOTCORR" not in clean

    def test_sanitizer_guards_heat_vs_dry_stress_hallucination(self):
        from app.api.copilot import _validate_and_sanitize_response

        hallucinated = "Because there are 0 dry-stress days, the field has no heat stress."
        guarded = _validate_and_sanitize_response(hallucinated)
        assert "Dry-stress days reflect root-zone soil water deficit only" in guarded

    def test_sanitizer_guards_soil_moisture_waterlogging_conflation(self):
        from app.api.copilot import _validate_and_sanitize_response

        conflated = "Root zone moisture is 0.680 which represents waterlogged soil."
        guarded = _validate_and_sanitize_response(conflated)
        assert "adequate plant-available moisture (not waterlogged)" in guarded


