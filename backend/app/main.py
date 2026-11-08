"""
AGROSCOPE AI — FastAPI Backend
NASA Space Apps Challenge 2026: Field Shift

Main application entry point. Configures CORS, mounts routers,
and sets up global middleware.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from app.api import (
    power,
    vegetation,
    soil_moisture,
    field_intelligence,
    advisor,
    copilot,
    reports,
    scenarios,
    change_detection,
    water_intelligence,
    phenology,
    risk_radar,
    field_boundary,
    location,
)
from app.core.config import settings

# ─── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ─── App ────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AGROSCOPE AI API",
    description=(
        "NASA Space Apps Challenge 2026 — Field Shift\n\n"
        "Scientific processing pipeline for NASA Earth Observation data "
        "supporting crop-rotation decision making."
    ),
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ─── CORS ───────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://agroscope-ai.vercel.app",
        *(settings.ALLOWED_ORIGINS or []),
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|.*\.vercel\.app|agroscope-ai\.vercel\.app|agroscope-ai\.onrender\.com)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────────────────
app.include_router(power.router,              prefix="/api/power",              tags=["NASA POWER"])
app.include_router(vegetation.router,         prefix="/api/vegetation",         tags=["Vegetation Intelligence"])
app.include_router(soil_moisture.router,      prefix="/api/soil-moisture",      tags=["Soil Moisture"])
app.include_router(field_intelligence.router, prefix="/api/field-intelligence", tags=["Field Intelligence Engine"])
app.include_router(advisor.router,            prefix="/api/advisor",            tags=["AI Agricultural Advisor"])
app.include_router(copilot.router,            prefix="/api/copilot",            tags=["Farmer Action Copilot (AI)"])
app.include_router(reports.router,            prefix="/api/reports",            tags=["Reports"])
app.include_router(scenarios.router,          prefix="/api/scenarios",          tags=["Farm Futures Lab"])
app.include_router(change_detection.router,   prefix="/api/change-detection",   tags=["Satellite Change Detective"])
app.include_router(water_intelligence.router, prefix="/api/water",             tags=["Smart Water Intelligence"])
app.include_router(phenology.router,          prefix="/api/phenology",          tags=["Crop Phenology Tracker"])
app.include_router(risk_radar.router,         prefix="/api/risk",               tags=["Regional Agricultural Risk Radar"])
app.include_router(field_boundary.router,     prefix="/api/field",              tags=["Field Boundary Intelligence"])
app.include_router(location.router,           prefix="/api/location",           tags=["Universal Location Intelligence"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "AGROSCOPE AI", "version": "1.0.0"}


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )
