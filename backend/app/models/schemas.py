"""
Pydantic models for AGROSCOPE AI API requests and responses.
All models include field-level documentation for OpenAPI schema generation.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import date
from enum import Enum


class LocationRequest(BaseModel):
    latitude:  float = Field(..., ge=-90,  le=90,  description="Latitude in decimal degrees (WGS84)")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude in decimal degrees (WGS84)")
    label:     Optional[str] = Field(None, description="Optional human-readable location name")


class DateRangeRequest(BaseModel):
    start_date: date = Field(..., description="Start date (YYYY-MM-DD). POWER data available from 1981-01-01.")
    end_date:   date = Field(..., description="End date (YYYY-MM-DD). Cannot be in the future.")

    @field_validator("end_date")
    @classmethod
    def end_after_start(cls, v: date, info) -> date:
        if "start_date" in info.data and v < info.data["start_date"]:
            raise ValueError("end_date must be >= start_date")
        if v > date.today():
            raise ValueError("end_date cannot be in the future")
        return v


class FieldAnalysisRequest(BaseModel):
    latitude:   float = Field(..., ge=-90,  le=90)
    longitude:  float = Field(..., ge=-180, le=180)
    start_date: date  = Field(default_factory=lambda: date(date.today().year - 1, 1, 1))
    end_date:   date  = Field(default_factory=date.today)
    label:      Optional[str] = None


class TimeSeries(BaseModel):
    dates:  List[str]  = Field(..., description="ISO date strings")
    values: List[float]= Field(..., description="Corresponding values")
    unit:   str        = Field(..., description="Physical unit")
    parameter: str     = Field(..., description="Parameter name")
    source: str        = Field("NASA POWER", description="Data source")
    is_demo: bool      = Field(False, description="True if this is demonstration data")


class VegetationAnalysis(BaseModel):
    ndvi_series:    Optional[TimeSeries] = None
    ndvi_anomaly:   Optional[List[float]] = None
    trend:          Optional[Dict[str, Any]] = None
    current_ndvi:   Optional[float] = None
    interpretation: Optional[Dict[str, str]] = None
    gibs_layers:    Optional[List[Dict[str, Any]]] = None
    methodology:    str = "NDVI derived from MODIS 8-day composites or POWER-estimated proxy"
    limitations:    str = "250m MODIS resolution; not suitable for sub-field analysis"


class ClimateAnalysis(BaseModel):
    temperature:   Optional[TimeSeries] = None
    precipitation: Optional[TimeSeries] = None
    humidity:      Optional[TimeSeries] = None
    solar:         Optional[TimeSeries] = None
    temp_trend:    Optional[Dict[str, Any]] = None
    precip_trend:  Optional[Dict[str, Any]] = None
    spi_3month:    Optional[TimeSeries] = None
    gdd_cumulative:Optional[TimeSeries] = None
    annual_summary:Optional[Dict[str, Any]] = None


class SoilMoistureAnalysis(BaseModel):
    surface_wetness:   Optional[TimeSeries] = None
    rootzone_wetness:  Optional[TimeSeries] = None
    analysis:          Optional[Dict[str, Any]] = None
    data_type:         str = "Model-derived estimate (NASA POWER MERRA-2 land surface model)"
    limitations:       str = "Not a direct soil moisture observation; coarse spatial resolution"


class StressAssessment(BaseModel):
    score:      float
    level:      str
    color:      str
    indicators: Dict[str, Any]
    confidence: float
    note:       str
    alert_flags:List[str] = Field(default_factory=list)


class CropRecommendation(BaseModel):
    crop_id:    str
    name:       str
    score:      float
    scores:     Dict[str, float]
    benefits:   List[str]
    risks:      List[str]
    gdd_required:  float
    gdd_available: float
    water_need_mm: float
    precip_mm:     float


class FieldIntelligenceReport(BaseModel):
    location:       Dict[str, Any]
    period:         Dict[str, str]
    climate:        Optional[ClimateAnalysis] = None
    vegetation:     Optional[VegetationAnalysis] = None
    soil_moisture:  Optional[SoilMoistureAnalysis] = None
    stress:         Optional[StressAssessment] = None
    crop_recommendations: Optional[List[CropRecommendation]] = None
    key_findings:   List[str] = Field(default_factory=list)
    data_sources:   List[Dict[str, str]] = Field(default_factory=list)
    methodology:    str = ""
    limitations:    str = ""
    generated_at:   str = ""
    is_demo:        bool = False
