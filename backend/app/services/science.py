"""
Scientific processing engine for AGROSCOPE AI.

Implements:
  - NDVI interpretation (MODIS-derived scale, 0-1)
  - POWER climate indicator processing
  - Standardized Precipitation Index (SPI) calculation
  - Soil Moisture Anomaly detection
  - Growing Degree Day (GDD) calculation
  - Agricultural stress detection using multi-indicator approach
  - Crop rotation suitability scoring

All formulas are traceable to scientific literature.
Units and assumptions are documented per function.

Scientific references:
  - McKee et al. (1993) — SPI definition
  - McMaster & Wilhelm (1997) — GDD formula
  - NDVI: Tucker (1979) — Remote Sensing of Environment
  - FAO-56 Penman-Monteith for ET reference (Allen et al., 1998)
"""

import numpy as np
import pandas as pd
from scipy import stats
from scipy.signal import savgol_filter
from typing import Dict, List, Optional, Tuple, Any
import logging

logger = logging.getLogger(__name__)

# ─── NDVI ─────────────────────────────────────────────────────────────────────

def calculate_ndvi(nir: float, red: float) -> float:
    """
    NDVI = (NIR - Red) / (NIR + Red)

    Tucker (1979). Red and NIR are surface reflectance values (0-1).
    Returns NaN if denominator is zero (e.g., water or very dark surfaces).

    Limitations:
      - Saturates above NDVI ~0.8 for dense canopies.
      - Sensitive to soil background at low vegetation cover.
      - MODIS 250m resolution: not suitable for field-scale boundary mapping.
    """
    denom = nir + red
    if denom == 0:
        return float("nan")
    return (nir - red) / denom


def interpret_ndvi(ndvi: float) -> Dict[str, str]:
    """Map NDVI scalar to human-readable category and description."""
    if np.isnan(ndvi):
        return {"category": "No Data", "color": "#94a3b8", "description": "Insufficient reflectance data."}
    elif ndvi < 0:
        return {"category": "Water / Snow",   "color": "#3b82f6",
                "description": "Negative NDVI indicates open water or snow-covered surface."}
    elif ndvi < 0.1:
        return {"category": "Bare Soil",      "color": "#d4a37a",
                "description": "Very sparse or absent vegetation. Bare rock, soil, or sand."}
    elif ndvi < 0.2:
        return {"category": "Sparse Vegetation", "color": "#fcd34d",
                "description": "Sparse cover: desert shrubs, weathered stubble, or fallow land."}
    elif ndvi < 0.35:
        return {"category": "Low Vegetation", "color": "#86efac",
                "description": "Low-density vegetation, early crop growth, or degraded rangeland."}
    elif ndvi < 0.5:
        return {"category": "Moderate Vegetation", "color": "#22c55e",
                "description": "Moderate vegetation cover — typical of crops at early–mid growth stages."}
    elif ndvi < 0.7:
        return {"category": "Healthy Vegetation", "color": "#16a34a",
                "description": "Dense, healthy vegetation — mature crops or productive rangeland."}
    else:
        return {"category": "Very Dense Vegetation", "color": "#166534",
                "description": "Very high biomass. Tropical forest or peak-season crop canopy."}


def smooth_ndvi_series(ndvi_values: List[float], window: int = 5) -> List[float]:
    """
    Apply Savitzky-Golay filter to NDVI time series.

    Reduces cloud-contamination noise while preserving phenological peaks.
    Requires at least `window` data points.

    Reference: Chen et al. (2004) — Remote Sensing of Environment.
    """
    arr = np.array(ndvi_values, dtype=float)
    if len(arr) < window:
        return arr.tolist()
    smoothed = savgol_filter(arr, window_length=window, polyorder=2)
    return np.clip(smoothed, -1, 1).tolist()


def compute_ndvi_anomaly(ndvi_series: List[float], baseline_series: List[float]) -> List[float]:
    """
    NDVI anomaly = observed NDVI − long-term mean NDVI for same period.

    Returns anomaly per time step (positive = above average; negative = below).
    baseline_series must cover the same seasonal positions as ndvi_series.
    """
    obs = np.array(ndvi_series)
    baseline_mean = np.nanmean(baseline_series)
    return (obs - baseline_mean).tolist()


# ─── Growing Degree Days ──────────────────────────────────────────────────────

def calculate_gdd(t_max: float, t_min: float, t_base: float = 10.0, t_cap: float = 30.0) -> float:
    """
    Growing Degree Day (GDD) for one day.

    Formula (McMaster & Wilhelm, 1997):
        T_avg = (min(T_max, T_cap) + max(T_min, T_base)) / 2
        GDD   = max(T_avg - T_base, 0)

    Units: °C·day
    T_base: 10°C — common base for maize, sorghum, soybeans
    T_cap:  30°C — maximum effective temperature (plateau)
    """
    t_max_eff = min(t_max, t_cap)
    t_min_eff = max(t_min, t_base)
    if t_max_eff < t_min_eff:
        return 0.0
    t_avg = (t_max_eff + t_min_eff) / 2.0
    return max(t_avg - t_base, 0.0)


def cumulative_gdd(t_max_series: List[float], t_min_series: List[float],
                   t_base: float = 10.0) -> List[float]:
    """Cumulative GDD over a growing season."""
    gdds = [calculate_gdd(mx, mn, t_base) for mx, mn in zip(t_max_series, t_min_series)]
    return np.cumsum(gdds).tolist()


# ─── Standardized Precipitation Index (SPI) ──────────────────────────────────

def calculate_spi(precip_series: List[float], timescale: int = 3) -> List[float]:
    """
    Standardized Precipitation Index (SPI-n).

    McKee et al. (1993). Fits a gamma distribution to precipitation
    accumulated over `timescale` months, transforms to standard normal.

    timescale: accumulation period in time steps (e.g., 3 = SPI-3)
    Returns SPI values; NaN where accumulation period is incomplete.

    SPI interpretation:
      ≥ +2.0  Extremely wet
      +1.5 to +1.99  Very wet
      +1.0 to +1.49  Moderately wet
      -0.99 to +0.99 Near normal
      -1.0 to -1.49  Moderately dry
      -1.5 to -1.99  Severely dry
      ≤ -2.0  Extremely dry
    """
    arr = np.array(precip_series, dtype=float)
    rolling_sum = pd.Series(arr).rolling(window=timescale, min_periods=timescale).sum().values

    spi_values = np.full_like(rolling_sum, np.nan)
    valid_mask = ~np.isnan(rolling_sum) & (rolling_sum > 0)

    if valid_mask.sum() < 4:
        return spi_values.tolist()

    valid_data = rolling_sum[valid_mask]
    try:
        shape, loc, scale = stats.gamma.fit(valid_data, floc=0)
        cdf_vals = stats.gamma.cdf(rolling_sum, shape, loc=loc, scale=scale)
        # Avoid boundary issues
        cdf_vals = np.clip(cdf_vals, 1e-6, 1 - 1e-6)
        spi_values[valid_mask] = stats.norm.ppf(cdf_vals[valid_mask])
    except Exception as exc:
        logger.warning("SPI gamma fit failed: %s", exc)

    return spi_values.tolist()


def interpret_spi(spi: float) -> Dict[str, str]:
    """Human-readable SPI classification."""
    if np.isnan(spi):
        return {"category": "Insufficient Data", "color": "#94a3b8"}
    elif spi >= 2.0:
        return {"category": "Extremely Wet", "color": "#1d4ed8"}
    elif spi >= 1.5:
        return {"category": "Very Wet", "color": "#3b82f6"}
    elif spi >= 1.0:
        return {"category": "Moderately Wet", "color": "#93c5fd"}
    elif spi >= -1.0:
        return {"category": "Near Normal", "color": "#86efac"}
    elif spi >= -1.5:
        return {"category": "Moderately Dry", "color": "#fcd34d"}
    elif spi >= -2.0:
        return {"category": "Severely Dry", "color": "#f97316"}
    else:
        return {"category": "Extremely Dry", "color": "#dc2626"}


# ─── Soil Moisture Analysis ────────────────────────────────────────────────────

def analyze_soil_moisture(
    gwettop_series: List[float],
    gwetroot_series: List[float],
) -> Dict[str, Any]:
    """
    Analyze NASA POWER soil wetness fractions.

    GWETTOP (0-5 cm) and GWETROOT (root zone, ~0-100 cm) range 0–1.
    These are model-derived (MERRA-2 land surface model), not direct
    satellite soil moisture measurements.

    Returns statistical summary and anomaly flags.
    """
    top   = np.array(gwettop_series,  dtype=float)
    root  = np.array(gwetroot_series, dtype=float)

    def stats_dict(arr: np.ndarray, name: str) -> Dict[str, Any]:
        valid = arr[~np.isnan(arr)]
        if len(valid) == 0:
            return {"name": name, "mean": None, "min": None, "max": None, "std": None}
        return {
            "name": name,
            "mean": round(float(np.mean(valid)), 3),
            "min":  round(float(np.min(valid)),  3),
            "max":  round(float(np.max(valid)),  3),
            "std":  round(float(np.std(valid)),  3),
        }

    top_stats  = stats_dict(top,  "Surface Soil Wetness (0-5 cm)")
    root_stats = stats_dict(root, "Root-Zone Soil Wetness")

    # Flag periods where root-zone wetness drops below critical threshold.
    # DRY_THRESHOLD = 0.25 (GWETROOT fraction, 0–1 scale).
    # Rationale: MERRA-2 GWETROOT is a soil wetness fraction relative to field
    # capacity. A value of ~0.25 is commonly cited as a proxy for the permanent
    # wilting point threshold in coarse-resolution land surface models (GLDAS
    # community usage; Kumar et al., 2006 JHM). This threshold is an operational
    # heuristic — it is NOT from a peer-reviewed study specific to MERRA-2 and
    # should be treated as configurable rather than a validated published value.
    DRY_THRESHOLD = 0.25
    dry_periods = int(np.sum(root < DRY_THRESHOLD)) if len(root) > 0 else 0
    pct_dry = round(dry_periods / max(len(root), 1) * 100, 1)

    return {
        "surface":  top_stats,
        "root_zone": root_stats,
        "dry_stress_days": dry_periods,
        "dry_stress_pct":  pct_dry,
        "dry_threshold":   DRY_THRESHOLD,
        "interpretation": (
            f"{pct_dry}% of observed days show root-zone wetness below "
            f"the critical threshold ({DRY_THRESHOLD}), suggesting potential "
            f"water stress during those periods."
            if pct_dry > 10 else
            "Root-zone soil wetness was generally adequate during the observed period."
        ),
        "data_source": "NASA POWER MERRA-2 land surface model (model-derived estimate, not direct observation)",
    }


# ─── Multi-indicator Agricultural Stress Score ───────────────────────────────

def compute_stress_score(
    spi_recent: float,
    ndvi_anomaly: float,
    soil_moisture_mean: float,
    temp_anomaly: float,
) -> Dict[str, Any]:
    """
    Composite agricultural stress score (0–100) from multiple indicators.

    Approach: weighted combination of normalized anomaly signals.
    No single indicator triggers an alert; all four must be considered.

    Weights (sum to 1.0):
      SPI-3          : 0.35  (precipitation deficit)
      NDVI anomaly   : 0.30  (vegetation response)
      Soil moisture  : 0.20  (water availability)
      Temperature    : 0.15  (heat stress)

    Limitations:
      - Composite score is a heuristic summary, not a validated drought index.
      - Does not replace peer-reviewed drought monitor products (e.g., USDM).
      - Missing indicators reduce score reliability.
    """
    weights = {"spi": 0.35, "ndvi": 0.30, "soil": 0.20, "temp": 0.15}
    indicators: Dict[str, Dict[str, Any]] = {}
    components  = {}

    # SPI contribution: more negative → higher stress
    if not np.isnan(spi_recent):
        spi_stress = max(0.0, min(1.0, (-spi_recent + 2) / 4))  # maps [-2, +2] → [1, 0]
        components["spi"] = spi_stress
        indicators["spi"] = {"value": round(spi_recent, 2), "stress_contribution": round(spi_stress, 2)}
    else:
        indicators["spi"] = {"value": None, "stress_contribution": None}

    # NDVI anomaly: negative → vegetation below average → stress
    ndvi_stress = max(0.0, min(1.0, -ndvi_anomaly * 5 + 0.5))
    components["ndvi"] = ndvi_stress
    indicators["ndvi"] = {"value": round(ndvi_anomaly, 3), "stress_contribution": round(ndvi_stress, 2)}

    # Soil moisture: lower → more stress
    soil_stress = max(0.0, min(1.0, 1.0 - soil_moisture_mean / 0.5))
    components["soil"] = soil_stress
    indicators["soil"] = {"value": round(soil_moisture_mean, 3), "stress_contribution": round(soil_stress, 2)}

    # Temperature anomaly: positive (hotter) → stress
    temp_stress = max(0.0, min(1.0, temp_anomaly / 5.0))
    components["temp"] = temp_stress
    indicators["temp"] = {"value": round(temp_anomaly, 2), "stress_contribution": round(temp_stress, 2)}

    # Weighted score
    total_weight = sum(weights[k] for k in components)
    if total_weight == 0:
        score = 0.0
    else:
        score = sum(weights[k] * components[k] for k in components) / total_weight * 100

    score = round(score, 1)
    level = _stress_level(score)

    return {
        "score": score,
        "level": level["label"],
        "color": level["color"],
        "indicators": indicators,
        "confidence": round(total_weight, 2),
        "note": (
            "⚠️ Composite stress score is a multi-indicator heuristic. "
            "It does not replace validated drought products. "
            "Confidence metric reflects channel completeness (proportion of the 4 biophysical indicators available), not statistical prediction certainty."
        ),
    }


def _stress_level(score: float) -> Dict[str, str]:
    if score < 20:
        return {"label": "Low",      "color": "#22c55e"}
    elif score < 40:
        return {"label": "Moderate", "color": "#86efac"}
    elif score < 60:
        return {"label": "Elevated", "color": "#fcd34d"}
    elif score < 75:
        return {"label": "High",     "color": "#f97316"}
    else:
        return {"label": "Severe",   "color": "#dc2626"}


# ─── Climate Trend Analysis ───────────────────────────────────────────────────

def linear_trend(values: List[float], dates: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Fit a linear trend to a time series using Ordinary Least Squares.

    Returns slope, intercept, R², p-value, and interpretation.
    p-value < 0.05 is considered statistically significant at 95% confidence.
    """
    arr = np.array(values, dtype=float)
    valid = ~np.isnan(arr)
    if valid.sum() < 3:
        return {"slope": None, "r2": None, "p_value": None, "significant": False}

    x = np.arange(len(arr))[valid].astype(float)
    y = arr[valid]

    slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)

    return {
        "slope":      round(float(slope),     6),
        "intercept":  round(float(intercept), 4),
        "r2":         round(float(r_value**2), 4),
        "p_value":    round(float(p_value),    4),
        "std_err":    round(float(std_err),    6),
        "significant": bool(p_value < 0.05),
        "direction":  "increasing" if slope > 0 else "decreasing",
        "interpretation": (
            f"Statistically significant {'increasing' if slope > 0 else 'decreasing'} trend "
            f"(p={p_value:.3f}, R²={r_value**2:.3f})."
            if p_value < 0.05 else
            f"No statistically significant trend detected (p={p_value:.3f})."
        ),
    }


# ─── Crop Rotation Suitability ────────────────────────────────────────────────

CROP_PROFILES: Dict[str, Dict[str, Any]] = {
    "maize": {
        "name": "Maize (Corn)",
        "gdd_required": 1200,
        "t_base_c": 10,
        "t_optimal_c": 28,
        "water_need_mm": 500,
        "soil_drainage": "well-drained",
        "benefits": ["High biomass return", "Breaks cereal disease cycles"],
        "risks": ["High water demand", "Susceptible to waterlogging"],
    },
    "soybean": {
        "name": "Soybean",
        "gdd_required": 1000,
        "t_base_c": 10,
        "t_optimal_c": 25,
        "water_need_mm": 450,
        "soil_drainage": "moderate",
        "benefits": ["Nitrogen fixation (~100 kg N/ha)", "Improves soil structure"],
        "risks": ["Phytophthora risk in wet soils", "Requires warm nights"],
    },
    "wheat": {
        "name": "Winter Wheat",
        "gdd_required": 800,
        "t_base_c": 0,
        "t_optimal_c": 20,
        "water_need_mm": 350,
        "soil_drainage": "moderate-to-well",
        "benefits": ["Low water demand", "Adds organic matter", "Winter coverage reduces erosion"],
        "risks": ["Susceptible to late frost", "Disease pressure after corn"],
    },
    "sorghum": {
        "name": "Sorghum",
        "gdd_required": 1000,
        "t_base_c": 10,
        "t_optimal_c": 32,
        "water_need_mm": 350,
        "soil_drainage": "tolerates wet/dry",
        "benefits": ["Drought-tolerant", "Deep roots improve sub-soil structure"],
        "risks": ["Allelopathic to some following crops", "Bird damage"],
    },
    "cover_crop_legume": {
        "name": "Cover Crop (Legume Mix)",
        "gdd_required": 400,
        "t_base_c": 5,
        "t_optimal_c": 18,
        "water_need_mm": 200,
        "soil_drainage": "any",
        "benefits": ["Nitrogen fixation", "Erosion control", "Soil biological activity"],
        "risks": ["No cash return", "Termination timing critical"],
    },
    "sunflower": {
        "name": "Sunflower",
        "gdd_required": 900,
        "t_base_c": 6,
        "t_optimal_c": 25,
        "water_need_mm": 300,
        "soil_drainage": "well-drained",
        "benefits": ["Drought-tolerant", "Deep taproot breaks hardpan", "Good rotational crop"],
        "risks": ["Sclerotinia risk", "Bird pressure at maturity"],
    },
    "rice": {
        "name": "Paddy / Lowland Rice",
        "gdd_required": 1300,
        "t_base_c": 10,
        "t_optimal_c": 30,
        "water_need_mm": 900,
        "soil_drainage": "heavy/poorly-drained",
        "benefits": ["Staple cereal across tropical/monsoonal basins", "High caloric productivity"],
        "risks": ["Extreme water demand", "Methane emissions in anaerobic conditions", "Heat sterility at anthesis"],
    },
    "cotton": {
        "name": "Upland Cotton",
        "gdd_required": 1400,
        "t_base_c": 15,
        "t_optimal_c": 32,
        "water_need_mm": 650,
        "soil_drainage": "deep/well-drained",
        "benefits": ["High commercial value", "Deep taproot", "Heat tolerant"],
        "risks": ["High pest pressure (bollworm)", "Sensitive to waterlogging and early frost"],
    },
    "barley": {
        "name": "Spring / Winter Barley",
        "gdd_required": 750,
        "t_base_c": 0,
        "t_optimal_c": 20,
        "water_need_mm": 280,
        "soil_drainage": "well-drained",
        "benefits": ["Early maturity", "High drought and salinity tolerance", "Breaks weed cycles"],
        "risks": ["Lodging under high fertility", "Foliar diseases in humid conditions"],
    },
    "chickpea": {
        "name": "Chickpea (Gram)",
        "gdd_required": 850,
        "t_base_c": 5,
        "t_optimal_c": 24,
        "water_need_mm": 250,
        "soil_drainage": "well-drained",
        "benefits": ["Symbiotic nitrogen fixation", "Thrives on residual moisture", "Low input cost"],
        "risks": ["Ascochyta blight in wet weather", "Pod borer damage"],
    },
    "millet": {
        "name": "Pearl / Finger Millet",
        "gdd_required": 900,
        "t_base_c": 12,
        "t_optimal_c": 33,
        "water_need_mm": 240,
        "soil_drainage": "sandy/well-drained",
        "benefits": ["Extreme drought and heat tolerance", "Nutrient dense", "Thrives on marginal soils"],
        "risks": ["Lower cash return in humid areas", "Susceptible to grain mold if rains at harvest"],
    },
    "potato": {
        "name": "Potato",
        "gdd_required": 800,
        "t_base_c": 7,
        "t_optimal_c": 19,
        "water_need_mm": 450,
        "soil_drainage": "loose/friable/well-drained",
        "benefits": ["Very high yield per hectare", "Good cash crop in rotational systems"],
        "risks": ["Late blight risk", "High sensitivity to soil compaction and high night temperatures"],
    },
}


# ─── Global Hemispheric & Seasonal Helpers ─────────────────────────────────────

def is_southern_hemisphere(latitude: float) -> bool:
    """Return True if the coordinate is in the Southern Hemisphere."""
    return latitude < 0.0


def get_crop_t_base(crop_id_or_name: str) -> float:
    """Look up base temperature for a crop; default to 10.0°C if unknown."""
    norm = crop_id_or_name.lower().strip()
    for cid, prof in CROP_PROFILES.items():
        if cid in norm or prof["name"].lower() in norm or norm in prof["name"].lower():
            return float(prof.get("t_base_c", 10.0))
    return 10.0


def get_seasonal_growth_window(latitude: float, crop_id: str = "wheat") -> Dict[str, Any]:
    """
    Determine the primary agricultural growing season window based on hemisphere.

    Northern Hemisphere:
      - Warm-season crops (maize, soy, cotton): Spring–Autumn (Apr–Oct; DOY ~90–300)
      - Cool-season crops (winter wheat, barley): Autumn–Spring (Nov–May)
    Southern Hemisphere (lat < 0):
      - Warm-season crops: Austral Spring–Autumn (Oct–Apr; crosses year-end)
      - Cool-season crops: Austral Autumn–Spring (May–Oct)
    """
    southern = is_southern_hemisphere(latitude)
    crop_info = CROP_PROFILES.get(crop_id.lower(), {})
    is_cool_season = crop_info.get("t_base_c", 10) <= 5

    if southern:
        if is_cool_season:
            season_name = "Austral Winter / Cool Season (May–Oct)"
            peak_months = [6, 7, 8]
        else:
            season_name = "Austral Summer / Main Season (Oct–Apr)"
            peak_months = [12, 1, 2]
    else:
        if is_cool_season:
            season_name = "Boreal Winter / Rabi Season (Nov–Apr)"
            peak_months = [1, 2, 3]
        else:
            season_name = "Boreal Summer / Kharif Season (May–Oct)"
            peak_months = [6, 7, 8]

    return {
        "is_southern_hemisphere": southern,
        "hemisphere_label": "Southern Hemisphere" if southern else "Northern Hemisphere",
        "season_name": season_name,
        "peak_months": peak_months,
    }


def score_crop_rotation(
    cumulative_gdd: float,
    total_precip_mm: float,
    mean_soil_wetness: float,
    mean_temp_c: float,
    stress_score: float,
) -> List[Dict[str, Any]]:
    """
    Score each crop in CROP_PROFILES against observed environmental conditions.

    Scoring dimensions (each 0-100):
      1. GDD availability vs. requirement
      2. Water availability vs. crop need
      3. Temperature suitability
      4. Stress-adjusted penalty

    Returns ranked list of crops with score and suitability notes.

    This is a simplified decision-support tool, NOT an agronomic model.
    Local soil type, market conditions, pest pressure, and farmer constraints
    must be considered before making planting decisions.
    """
    # Estimate seasonal rainfall availability
    # If total_precip_mm is unknown, convert soil wetness fraction to rough estimate
    if total_precip_mm <= 0:
        total_precip_mm = mean_soil_wetness * 600  # rough proxy

    results = []
    for crop_id, profile in CROP_PROFILES.items():
        scores: Dict[str, float] = {}

        # GDD score
        gdd_req = profile["gdd_required"]
        scores["gdd"] = min(1.0, cumulative_gdd / gdd_req) if gdd_req > 0 else 0.5

        # Water score
        water_req = profile["water_need_mm"]
        scores["water"] = min(1.0, total_precip_mm / water_req) if water_req > 0 else 0.5

        # Temperature score — Gaussian around optimal
        t_opt = profile["t_optimal_c"]
        scores["temp"] = float(np.exp(-0.5 * ((mean_temp_c - t_opt) / 6) ** 2))

        # Stress penalty — higher stress → lower suitability
        stress_penalty = 1.0 - (stress_score / 100) * 0.5
        scores["stress_penalty"] = stress_penalty

        composite = (
            0.35 * scores["gdd"]
            + 0.35 * scores["water"]
            + 0.20 * scores["temp"]
        ) * stress_penalty * 100

        results.append({
            "crop_id":   crop_id,
            "name":      profile["name"],
            "score":     round(composite, 1),
            "scores":    {k: round(v, 2) for k, v in scores.items()},
            "benefits":  profile["benefits"],
            "risks":     profile["risks"],
            "gdd_required":   profile["gdd_required"],
            "gdd_available":  round(cumulative_gdd, 0),
            "water_need_mm":  profile["water_need_mm"],
            "precip_mm":      round(total_precip_mm, 0),
        })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results
