"""Application configuration — reads from environment variables."""

from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    # NASA APIs (no key required for POWER; GIBS is open)
    NASA_POWER_BASE_URL: str = "https://power.larc.nasa.gov/api"
    NASA_GIBS_WMTS_URL: str = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi"

    # Optional: NASA Earthdata credentials for SMAP / ECOSTRESS
    NASA_EARTHDATA_USERNAME: str = ""
    NASA_EARTHDATA_PASSWORD: str = ""

    # ── OpenRouter AI (Farmer Action Copilot) ────────────────────────────────
    # Set OPENROUTER_API_KEY in backend/.env — NEVER commit real keys.
    # Leave blank to use the rule-based fallback advisor.
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "google/gemini-2.5-flash"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    # Maximum tokens the model may generate per response
    OPENROUTER_MAX_TOKENS: int = 800
    # HTTP timeout for the OpenRouter request (seconds)
    OPENROUTER_TIMEOUT_S: float = 30.0

    # CORS — add your Vercel / local frontend origin
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://agroscope-ai.vercel.app",
    ]

    # Cache TTL seconds
    CACHE_TTL_SECONDS: int = 3600

    # Demo mode — set to False once live NASA credentials are configured
    DEMO_MODE: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
