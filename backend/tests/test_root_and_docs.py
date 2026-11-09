import pytest
import httpx

from app.main import app


@pytest.mark.asyncio
async def test_root_returns_backend_service_information():
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "service": "AGROSCOPE AI API",
        "status": "ok",
        "docs": "/api/docs",
        "health": "/api/health",
    }


@pytest.mark.asyncio
async def test_short_docs_url_redirects_to_configured_docs_url():
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
        follow_redirects=False,
    ) as client:
        response = await client.get("/docs")

    assert response.status_code == 307
    assert response.headers["location"] == "/api/docs"


@pytest.mark.asyncio
async def test_configured_docs_url_serves_swagger_ui():
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.get("/api/docs")

    assert response.status_code == 200
    assert "swagger-ui" in response.text.lower()
