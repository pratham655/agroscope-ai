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

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import httpx
from fastapi.testclient import TestClient

from app.main import app
from app.services import openrouter as or_service

client = TestClient(app)

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

    @pytest.mark.asyncio
    async def test_raises_key_missing_when_unconfigured(self):
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", ""):
            with pytest.raises(or_service.OpenRouterKeyMissingError):
                await or_service.openrouter_chat("hello")

    @pytest.mark.asyncio
    async def test_successful_response(self):
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", "sk-or-test-123"):
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(return_value=_mock_or_response(_GOOD_REPLY))
            with patch("app.services.openrouter.httpx.AsyncClient", return_value=mock_client):
                result = await or_service.openrouter_chat("What crop should I plant?", _SAMPLE_CTX)
        assert result == _GOOD_REPLY

    @pytest.mark.asyncio
    async def test_timeout_raises_unavailable(self):
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", "sk-or-test-123"):
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("timed out"))
            with patch("app.services.openrouter.httpx.AsyncClient", return_value=mock_client):
                with pytest.raises(or_service.OpenRouterUnavailableError, match="timed out"):
                    await or_service.openrouter_chat("hello")

    @pytest.mark.asyncio
    async def test_http_401_raises_unavailable(self):
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", "sk-or-test-123"):
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(return_value=httpx.Response(401, text="Unauthorized"))
            with patch("app.services.openrouter.httpx.AsyncClient", return_value=mock_client):
                with pytest.raises(or_service.OpenRouterUnavailableError, match="401"):
                    await or_service.openrouter_chat("hello")

    @pytest.mark.asyncio
    async def test_http_402_raises_unavailable(self):
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", "sk-or-test-123"):
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(return_value=httpx.Response(402, text="Payment Required"))
            with patch("app.services.openrouter.httpx.AsyncClient", return_value=mock_client):
                with pytest.raises(or_service.OpenRouterUnavailableError, match="402"):
                    await or_service.openrouter_chat("hello")

    @pytest.mark.asyncio
    async def test_http_429_raises_unavailable(self):
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", "sk-or-test-123"):
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(return_value=httpx.Response(429, text="Too Many Requests"))
            with patch("app.services.openrouter.httpx.AsyncClient", return_value=mock_client):
                with pytest.raises(or_service.OpenRouterUnavailableError, match="429"):
                    await or_service.openrouter_chat("hello")

    @pytest.mark.asyncio
    async def test_non_2xx_raises_unavailable(self):
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", "sk-or-test-123"):
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(return_value=httpx.Response(503, text="Service Unavailable"))
            with patch("app.services.openrouter.httpx.AsyncClient", return_value=mock_client):
                with pytest.raises(or_service.OpenRouterUnavailableError, match="503"):
                    await or_service.openrouter_chat("hello")

    @pytest.mark.asyncio
    async def test_malformed_response_raises_unavailable(self):
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", "sk-or-test-123"):
            bad_body = httpx.Response(200, json={"unexpected": "shape"})
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(return_value=bad_body)
            with patch("app.services.openrouter.httpx.AsyncClient", return_value=mock_client):
                with pytest.raises(or_service.OpenRouterUnavailableError, match="Unexpected"):
                    await or_service.openrouter_chat("hello")

    @pytest.mark.asyncio
    async def test_api_key_redacted_from_reply(self):
        """If the model somehow echoes the key, it must be stripped."""
        secret_key = "sk-or-secret-XYZ"
        leaky_reply = f"Here is your key: {secret_key}"
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", secret_key):
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(return_value=_mock_or_response(leaky_reply))
            with patch("app.services.openrouter.httpx.AsyncClient", return_value=mock_client):
                result = await or_service.openrouter_chat("hello")
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


# ---------------------------------------------------------------------------
# API endpoint tests (via TestClient)
# ---------------------------------------------------------------------------
class TestCopilotStatusEndpoint:

    def test_status_no_key(self):
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", ""):
            resp = client.get("/api/copilot/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["ai_powered"] is False
        assert data["status"] == "fallback_mode"
        assert data["model"] is None

    def test_status_with_key(self):
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", "sk-or-test-123"):
            resp = client.get("/api/copilot/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["ai_powered"] is True
        assert data["status"] == "ai_active"
        assert data["model"] is not None
        # Key must NOT appear in response
        assert "sk-or-test-123" not in resp.text


class TestCopilotChatEndpoint:

    def _post(self, question: str, ctx=None):
        return client.post(
            "/api/copilot/chat",
            json={"question": question, "advisor_context": ctx},
        )

    def test_invalid_question_too_short(self):
        resp = self._post("hi")
        assert resp.status_code == 422

    def test_invalid_question_empty(self):
        resp = self._post("")
        assert resp.status_code == 422

    def test_question_too_long(self):
        resp = self._post("x" * 1001)
        assert resp.status_code == 422

    def test_fallback_when_no_key(self):
        with patch.object(or_service.settings, "OPENROUTER_API_KEY", ""):
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
