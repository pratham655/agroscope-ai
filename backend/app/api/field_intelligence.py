"""
Field Intelligence Engine — the core analysis pipeline of AGROSCOPE AI.

Pipeline:
  1. Fetch NASA POWER data for location and period
  2. Calculate environmental indicators (SPI, GDD, soil wetness)
  3. Detect anomalies and multi-indicator stress
  4. Score crop rotation options
  5. Generate explainable key findings
  6. Return structured intelligence report

This is the primary endpoint for the hackathon demo.
"""

from fastapi import APIRouter, Query, HTTPException
from datetime import date, datetime, timedelta
import numpy as np
import logging

from app.services.nasa_power import fetch_daily_power, fetch_monthly_power
from app.services.science import (
    calculate_spi, calculate_gdd, cumulative_gdd,
    analyze_soil_moisture, compute_stress_score, score_crop_rotation,
    linear_trend, smooth_ndvi_series, interpret_ndvi,
)
from app.services.nasa_gibs import get_tile_url, get_all_layer_metadata

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/analyze")
async def analyze_field(
    latitude:   float = Query(..., ge=-90,  le=90,  description="Field latitude (decimal degrees, WGS84)"),
    longitude:  float = Query(..., ge=-180, le=180, description="Field longitude (decimal degrees, WGS84)"),
    start_date: date  = Query(default=None, description="Analysis start (YYYY-MM-DD). Defaults to 1 year ago."),
    end_date:   date  = Query(default=None, description="Analysis end (YYYY-MM-DD). Defaults to today."),
    label:      str   = Query(default="Selected Location", description="Location label"),
):
    """
    Full Field Intelligence Engine analysis.

    Runs the complete AGROSCOPE AI processing pipeline:
      NASA POWER → Climate Indicators → SPI → GDD → Soil Moisture →
      Stress Score → Crop Rotation Scoring → Key Findings

    Returns a structured intelligence report with explainable findings,
    data source documentation, and crop rotation recommendations.
    """
    today = date.today()
    if end_date is None:
        end_date = today
    if start_date is None:
        start_date = date(today.year - 1, today.month, today.day)

    if start_date > end_date:
        raise HTTPException(status_code=422, detail="start_date must be before end_date")
    if end_date > today:
        raise HTTPException(status_code=422, detail="end_date cannot be in the future")

    # ── Fetch NASA POWER daily data ──────────────────────────────────────────
    try:
        raw = await fetch_daily_power(latitude, longitude, start_date, end_date)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    params  = raw.get("properties", {}).get("parameter", {})
    is_demo = raw.get("_demo", False)

    def series(key: str):
        if key not in params:
            return [], []
        items  = params[key]
        dates  = sorted(items.keys())
        values = [items[d] for d in dates]
        return dates, values

    dates_t,    t2m    = series("T2M")
    dates_tmin, t2m_min = series("T2M_MIN")
    dates_tmax, t2m_max = series("T2M_MAX")
    dates_p,    precip = series("PRECTOTCORR")
    dates_rh,   rh2m   = series("RH2M")
    dates_sol,  sol    = series("ALLSKY_SFC_SW_DWN")
    dates_gwt,  gwttop = series("GWETTOP")
    dates_gwr,  gwtroot= series("GWETROOT")

    # ── SPI-3 ────────────────────────────────────────────────────────────────
    spi3_vals = calculate_spi(precip, timescale=3) if len(precip) >= 3 else []
    spi3_recent = float(np.nanmean([v for v in spi3_vals[-30:] if v and not np.isnan(v)])) \
                  if spi3_vals else float("nan")

    # ── GDD (base 10°C) ──────────────────────────────────────────────────────
    gdd_cum = []
    if t2m_max and t2m_min:
        min_len = min(len(t2m_max), len(t2m_min))
        gdd_cum = cumulative_gdd(t2m_max[:min_len], t2m_min[:min_len], t_base=10.0)
    cumulative_gdd_val = gdd_cum[-1] if gdd_cum else 0.0

    # ── Soil moisture analysis ────────────────────────────────────────────────
    soil_analysis = {}
    if gwttop and gwtroot:
        soil_analysis = analyze_soil_moisture(gwttop, gwtroot)
    mean_soil_wetness = float(np.nanmean(gwtroot)) if gwtroot else 0.4

    # ── Temperature anomaly (vs. period mean) ────────────────────────────────
    t_mean_period = float(np.nanmean(t2m)) if t2m else 15.0
    t_recent      = float(np.nanmean(t2m[-30:])) if len(t2m) >= 30 else t_mean_period
    temp_anomaly  = t_recent - t_mean_period

    # ── NDVI proxy ────────────────────────────────────────────────────────────
    ndvi_proxy_vals: list = []
    ndvi_anomaly_val = 0.0
    if sol and gwttop:
        sol_arr  = np.array(sol,    dtype=float)
        gwet_arr = np.array(gwttop, dtype=float)
        sol_max  = np.nanmax(sol_arr) or 1.0
        raw_ndvi = 0.1 + 0.75 * (sol_arr / sol_max) * np.clip(gwet_arr, 0, 1)
        ndvi_proxy_vals = smooth_ndvi_series(np.clip(raw_ndvi, 0.05, 0.90).tolist(), window=7)
        baseline = float(np.nanmean(ndvi_proxy_vals))
        recent   = float(np.nanmean(ndvi_proxy_vals[-30:])) if len(ndvi_proxy_vals) >= 30 else baseline
        ndvi_anomaly_val = recent - baseline

    # ── Multi-indicator stress score ──────────────────────────────────────────
    stress = compute_stress_score(
        spi_recent      = spi3_recent,
        ndvi_anomaly    = ndvi_anomaly_val,
        soil_moisture_mean = mean_soil_wetness,
        temp_anomaly    = temp_anomaly,
    )

    # ── Crop rotation scoring ─────────────────────────────────────────────────
    total_precip_mm = float(np.sum(precip)) if precip else 0.0
    mean_temp       = float(np.nanmean(t2m)) if t2m else 18.0
    crop_scores     = score_crop_rotation(
        cumulative_gdd  = cumulative_gdd_val,
        total_precip_mm = total_precip_mm,
        mean_soil_wetness = mean_soil_wetness,
        mean_temp_c     = mean_temp,
        stress_score    = stress["score"],
    )

    # ── Climate trends ────────────────────────────────────────────────────────
    temp_trend   = linear_trend(t2m)   if t2m   else {}
    precip_trend = linear_trend(precip) if precip else {}

    # ── Key findings (explainable) ────────────────────────────────────────────
    findings = []

    total_prec_str = f"{total_precip_mm:.0f} mm" if total_precip_mm > 0 else "unavailable"
    findings.append(
        f"📍 Analysis covers {label} (lat={latitude:.3f}, lon={longitude:.3f}) "
        f"from {start_date} to {end_date} using NASA POWER Agroclimatology data."
    )

    if not np.isnan(spi3_recent):
        spi_str = f"{spi3_recent:+.2f}"
        if spi3_recent < -1.5:
            findings.append(
                f"🌵 Precipitation anomaly index of {spi_str} (SPI proxy) indicates severely to extremely dry conditions "
                "during the analysis period. Precipitation was significantly below the period average."
            )
        elif spi3_recent < -1.0:
            findings.append(
                f"⚠️ Precipitation anomaly index of {spi_str} (SPI proxy) indicates moderately dry conditions. "
                "Precipitation deficit may impact soil moisture recharge."
            )
        elif spi3_recent > 1.0:
            findings.append(
                f"💧 Precipitation anomaly index of {spi_str} (SPI proxy) indicates wetter-than-average conditions. "
                "Waterlogging or excess moisture risks may apply for sensitive crops."
            )
        else:
            findings.append(
                f"🌦️ Precipitation anomaly index of {spi_str} (SPI proxy) indicates near-normal precipitation conditions."
            )

    if soil_analysis:
        pct_dry = soil_analysis.get("dry_stress_pct", 0)
        if pct_dry > 25:
            findings.append(
                f"🌱 Root-zone soil wetness fell below the critical threshold (0.25) "
                f"on {pct_dry:.0f}% of analysed days, suggesting significant water-stress risk."
            )
        elif pct_dry > 10:
            findings.append(
                f"🌱 Moderate root-zone moisture deficit: {pct_dry:.0f}% of days "
                "below the critical soil wetness threshold."
            )
        else:
            findings.append(
                "🌱 Root-zone soil wetness was generally adequate during the analysis period."
            )

    if temp_trend.get("significant"):
        direction = temp_trend["direction"]
        slope     = temp_trend["slope"]
        findings.append(
            f"🌡️ Statistically significant {direction} temperature trend detected "
            f"({slope:+.4f}°C/day, p={temp_trend['p_value']:.3f}). "
            "Long-term warming trends affect crop selection and growing season length."
        )

    if cumulative_gdd_val > 0:
        findings.append(
            f"🌾 Accumulated {cumulative_gdd_val:.0f} Growing Degree Days (base 10°C) "
            f"over the analysis period. Total seasonal rainfall: {total_prec_str}."
        )

    if crop_scores:
        top_crop = crop_scores[0]
        findings.append(
            f"🔄 Top crop rotation candidate: {top_crop['name']} "
            f"(suitability score: {top_crop['score']:.0f}/100). "
            "Suitability scores are indicative — verify with local agronomic advice."
        )

    stress_level = stress["level"]
    stress_score = stress["score"]
    findings.append(
        f"📊 Composite agricultural stress level: {stress_level} ({stress_score:.0f}/100). "
        "This multi-indicator score combines SPI, vegetation proxy, soil moisture, and temperature. "
        "It is a heuristic summary, not a validated drought product."
    )

    if is_demo:
        findings.insert(1,
            "⚠️ DEMONSTRATION MODE: The NASA POWER API was unavailable or rate-limited. "
            "All data shown is clearly labelled demonstration data — statistically realistic "
            "but NOT real satellite observations. Live data will load when the API is reachable."
        )

    # ── GIBS layers for frontend map ──────────────────────────────────────────
    gibs_layers = []
    for meta in get_all_layer_metadata():
        try:
            url_info = get_tile_url(meta["key"])
            gibs_layers.append({
                "key":       meta["key"],
                "name":      meta["name"],
                "tile_url":  url_info["tile_url"],
                "source":    meta["source"],
                "units":     meta["units"],
            })
        except Exception:
            pass

    return {
        "location": {
            "latitude":  latitude,
            "longitude": longitude,
            "label":     label,
        },
        "period": {
            "start": str(start_date),
            "end":   str(end_date),
            "days":  (end_date - start_date).days + 1,
        },
        "is_demo":     is_demo,
        "demo_notice": raw.get("_demo_notice", ""),
        "climate": {
            "temperature": {
                "dates":       dates_t,
                "values":      [round(v, 2) for v in t2m],
                "unit":        "°C",
                "source":      "NASA POWER T2M",
                "mean":        round(float(np.nanmean(t2m)), 2) if t2m else None,
                "trend":       temp_trend,
            },
            "precipitation": {
                "dates":       dates_p,
                "values":      [round(v, 2) for v in precip],
                "unit":        "mm/day",
                "source":      "NASA POWER PRECTOTCORR",
                "total_mm":    round(total_precip_mm, 1),
                "trend":       precip_trend,
            },
            "humidity": {
                "dates":  dates_rh,
                "values": [round(v, 1) for v in rh2m],
                "unit":   "%",
                "source": "NASA POWER RH2M",
            },
            "solar": {
                "dates":  dates_sol,
                "values": [round(v, 2) for v in sol],
                "unit":   "MJ/m²/day",
                "source": "NASA POWER ALLSKY_SFC_SW_DWN",
            },
            "spi_3": {
                "dates":  dates_p,
                "values": [round(v, 3) if not np.isnan(v) else None for v in spi3_vals],
                "unit":   "standard deviations",
                "recent": round(spi3_recent, 3) if not np.isnan(spi3_recent) else None,
                "reference": "McKee et al. (1993)",
                "proxy_notice": (
                    "Calculated from daily NASA POWER precipitation using a 3-day rolling window. "
                    "Standard SPI-3 (McKee et al., 1993) uses 3-month accumulations. "
                    "This daily proxy is directionally consistent but NOT equivalent to the "
                    "published monthly SPI-3 drought index. Interpret with caution."
                ),
            },
            "gdd": {
                "dates":      dates_t[:len(gdd_cum)],
                "values":     [round(v, 1) for v in gdd_cum],
                "unit":       "°C·day",
                "t_base":     10,
                "cumulative": round(cumulative_gdd_val, 0),
                "reference":  "McMaster & Wilhelm (1997)",
            },
        },
        "soil_moisture": {
            "surface": {
                "dates":  dates_gwt,
                "values": [round(v, 3) for v in gwttop],
                "unit":   "fraction (0–1)",
                "source": "NASA POWER GWETTOP",
            },
            "root_zone": {
                "dates":  dates_gwr,
                "values": [round(v, 3) for v in gwtroot],
                "unit":   "fraction (0–1)",
                "source": "NASA POWER GWETROOT",
            },
            "analysis": soil_analysis,
            "data_type": "Model-derived estimate (MERRA-2 land surface model) — NOT direct satellite observation",
        },
        "vegetation_proxy": {
            "dates":       dates_sol[:len(ndvi_proxy_vals)],
            "values":      [round(v, 4) for v in ndvi_proxy_vals],
            "anomaly":     round(ndvi_anomaly_val, 4),
            "unit":        "proxy NDVI (0–1)",
            "is_proxy":    True,
            "proxy_notice": (
                "Derived from NASA POWER solar radiation × soil wetness. "
                "NOT actual MODIS NDVI. For authentic imagery, use the GIBS map layers."
            ),
        },
        "stress": stress,
        "crop_recommendations": crop_scores[:6],  # Top 6
        "key_findings": findings,
        "gibs_layers": gibs_layers,
        "data_sources": [
            {
                "name":        "NASA POWER Agroclimatology",
                "url":         "https://power.larc.nasa.gov/",
                "type":        "Model reanalysis (MERRA-2 / GMAO)",
                "variables":   "T2M, PRECTOTCORR, RH2M, ALLSKY_SFC_SW_DWN, GWETTOP, GWETROOT",
                "resolution":  "~0.5° × 0.625° (~55 km)",
                "auth":        "None required",
            },
            {
                "name":        "NASA GIBS (Global Imagery Browse Services)",
                "url":         "https://nasa-gibs.github.io/gibs-api-docs/",
                "type":        "Satellite imagery WMTS tile service",
                "variables":   "NDVI, EVI, True colour, LST, Precipitation, Soil Moisture layers",
                "resolution":  "250m – 1km depending on layer",
                "auth":        "None required",
            },
        ],
        "methodology": (
            "1. NASA POWER API fetches daily agroclimatic variables for the grid cell "
            "containing the selected coordinates.\n"
            "2. Precipitation anomaly index calculated using gamma distribution fitting (McKee et al., 1993 SPI method) "
            "applied to 3-day rolling daily sums. NOTE: standard SPI-3 uses 3-month accumulations; "
            "this is a daily proxy — directionally valid but not equivalent to the published index.\n"
            "3. GDD accumulated using the standard crop method (McMaster & Wilhelm, 1997).\n"
            "4. Soil moisture stress assessed from GWETROOT relative to critical threshold (0.25).\n"
            "5. Vegetation proxy derived from PAR × surface wetness (NOT MODIS NDVI).\n"
            "6. Composite stress score: weighted combination of SPI, vegetation, soil, and temperature indicators.\n"
            "7. Crop rotation suitability: scored against GDD, water, and temperature requirements.\n"
            "8. GIBS WMTS tiles provided for frontend map rendering (no download required)."
        ),
        "limitations": (
            "• POWER spatial resolution (~55 km) cannot resolve sub-field variability.\n"
            "• NDVI proxy is a heuristic, not authentic MODIS NDVI.\n"
            "• Crop rotation scores are indicative only — do not replace agronomic expertise.\n"
            "• Composite stress score is not a validated drought product.\n"
            "• Analysis does not account for local soil type, slope, or farm management.\n"
            "• SPI requires at least 30+ years of data for statistical robustness; "
            "short periods produce less reliable results. The implementation here uses "
            "daily 3-day rolling accumulations (a proxy), not standard 3-month SPI-3."
        ),
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }
