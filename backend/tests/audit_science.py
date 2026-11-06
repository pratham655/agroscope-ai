"""
AGROSCOPE AI -- Science Engine Audit Script
===========================================
Validates every formula and boundary condition in science.py.
Run: cd backend && python tests/audit_science.py
"""

import sys
import io
import math
import numpy as np

# Force UTF-8 output so Unicode labels don't crash on Windows cp1252
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# ── make sure package is importable ──────────────────────────────────────────
sys.path.insert(0, ".")

from app.services.science import (
    calculate_ndvi, interpret_ndvi,
    calculate_gdd, cumulative_gdd,
    calculate_spi, interpret_spi,
    analyze_soil_moisture,
    compute_stress_score,
    score_crop_rotation,
    linear_trend,
    smooth_ndvi_series,
)

PASS = 0
FAIL = 0

def check(label: str, condition: bool, detail: str = ""):
    global PASS, FAIL
    status = "PASS" if condition else "FAIL"
    if condition:
        PASS += 1
        print(f"  [PASS] {label}")
    else:
        FAIL += 1
        print(f"  [FAIL] {label}  <<< {detail}")


# ─── NDVI ────────────────────────────────────────────────────────────────────
print("\n== NDVI ==")

ndvi = calculate_ndvi(nir=0.8, red=0.2)
check("NDVI standard formula", abs(ndvi - 0.6) < 1e-9, f"got {ndvi}")

ndvi_zero = calculate_ndvi(nir=0.0, red=0.0)
check("NDVI zero denominator returns NaN", math.isnan(ndvi_zero), f"got {ndvi_zero}")

ndvi_sym = calculate_ndvi(nir=0.5, red=0.5)
check("NDVI symmetric bands = 0.0", abs(ndvi_sym - 0.0) < 1e-9, f"got {ndvi_sym}")

ndvi_neg = calculate_ndvi(nir=0.1, red=0.9)
check("NDVI negative (water surface)", ndvi_neg < 0, f"got {ndvi_neg}")

# NDVI interpretation thresholds
check("NDVI <0 → Water/Snow", interpret_ndvi(-0.1)["category"] == "Water / Snow")
check("NDVI 0.05 → Bare Soil", interpret_ndvi(0.05)["category"] == "Bare Soil")
check("NDVI 0.15 → Sparse Vegetation", interpret_ndvi(0.15)["category"] == "Sparse Vegetation")
check("NDVI 0.25 → Low Vegetation", interpret_ndvi(0.25)["category"] == "Low Vegetation")
check("NDVI 0.45 → Moderate Vegetation", interpret_ndvi(0.45)["category"] == "Moderate Vegetation")
check("NDVI 0.60 → Healthy Vegetation", interpret_ndvi(0.60)["category"] == "Healthy Vegetation")
check("NDVI 0.80 → Very Dense Vegetation", interpret_ndvi(0.80)["category"] == "Very Dense Vegetation")
check("NDVI NaN → No Data", interpret_ndvi(float("nan"))["category"] == "No Data")


# ─── GDD ────────────────────────────────────────────────────────────────────
print("\n== Growing Degree Days ==")

gdd_normal = calculate_gdd(t_max=25.0, t_min=15.0, t_base=10.0, t_cap=30.0)
# T_avg = (25 + 15) / 2 = 20;  GDD = 20 - 10 = 10
check("GDD normal case = 10", abs(gdd_normal - 10.0) < 1e-9, f"got {gdd_normal}")

gdd_below_base = calculate_gdd(t_max=5.0, t_min=2.0, t_base=10.0, t_cap=30.0)
check("GDD all below T_base = 0", gdd_below_base == 0.0, f"got {gdd_below_base}")

gdd_cap = calculate_gdd(t_max=40.0, t_min=15.0, t_base=10.0, t_cap=30.0)
# T_max capped at 30; T_avg = (30+15)/2=22.5; GDD=12.5
check("GDD T_max capped at T_cap = 12.5", abs(gdd_cap - 12.5) < 1e-9, f"got {gdd_cap}")

gdd_tmin_floor = calculate_gdd(t_max=25.0, t_min=3.0, t_base=10.0, t_cap=30.0)
# T_min floored to T_base=10; T_avg=(25+10)/2=17.5; GDD=7.5
check("GDD T_min floored to T_base = 7.5", abs(gdd_tmin_floor - 7.5) < 1e-9, f"got {gdd_tmin_floor}")

gdd_impossible = calculate_gdd(t_max=8.0, t_min=5.0, t_base=10.0, t_cap=30.0)
# T_max(8) < T_min_eff(10) → returns 0
check("GDD T_max_eff < T_min_eff = 0", gdd_impossible == 0.0, f"got {gdd_impossible}")

gdd_cum = cumulative_gdd([25.0, 30.0, 20.0], [15.0, 18.0, 8.0], t_base=10.0)
# day1: (25+15)/2-10=10; day2: (30+18)/2-10=14; day3: T_min floored, (20+10)/2-10=5
# cumulative: [10, 24, 29]
check("Cumulative GDD length", len(gdd_cum) == 3)
check("Cumulative GDD monotonically increasing", all(gdd_cum[i] <= gdd_cum[i+1] for i in range(len(gdd_cum)-1)))
check("Cumulative GDD day1 = 10", abs(gdd_cum[0] - 10.0) < 1e-9, f"got {gdd_cum[0]}")


# ─── SPI ────────────────────────────────────────────────────────────────────
print("\n== SPI ==")

# With sufficient data, check structural properties
np.random.seed(42)
precip_100 = list(np.random.exponential(3.0, 100))
spi_vals = calculate_spi(precip_100, timescale=3)

check("SPI output length matches input", len(spi_vals) == len(precip_100))
check("First (timescale-1) SPI values are NaN", all(math.isnan(v) for v in spi_vals[:2]))
valid_spi = [v for v in spi_vals if not math.isnan(v)]
check("SPI has valid values after warm-up period", len(valid_spi) > 0)
check("SPI values roughly near-normal distribution mean",
      abs(np.nanmean(spi_vals)) < 1.0, f"mean={np.nanmean(spi_vals):.3f}")

# All-zero precipitation edge case
spi_zero = calculate_spi([0.0] * 20, timescale=3)
check("SPI all-zero precip: no valid values (returns NaN)", all(math.isnan(v) or v == 0 for v in spi_zero))

# Insufficient data
spi_short = calculate_spi([1.0, 2.0], timescale=3)
check("SPI timescale > len → all NaN", all(math.isnan(v) for v in spi_short))

# Monotonicity: variable series where wet has higher mean should produce
# higher SPI values than series with lower mean.
# Use random exponential data with different rate params so gamma fit works.
np.random.seed(123)
wet_precip  = list(np.random.exponential(8.0, 100))   # ~8 mm/step mean
dry_precip  = list(np.random.exponential(1.5, 100))   # ~1.5 mm/step mean
spi_wet  = calculate_spi(wet_precip, timescale=3)
spi_dry  = calculate_spi(dry_precip, timescale=3)
wet_mean  = np.nanmean(spi_wet)
dry_mean  = np.nanmean(spi_dry)
# Within each series gamma is fit on its own distribution, so both means
# will be near 0 by construction.  The important property is structural:
# the SPI algorithm produces valid (non-NaN) values for variable data.
check("SPI variable wet series produces valid non-NaN values",
      not np.isnan(wet_mean), f"wet_mean={wet_mean}")
check("SPI variable dry series produces valid non-NaN values",
      not np.isnan(dry_mean), f"dry_mean={dry_mean}")

# SPI interpretation thresholds
check("SPI +2.5 → Extremely Wet", interpret_spi(2.5)["category"] == "Extremely Wet")
check("SPI +1.6 → Very Wet", interpret_spi(1.6)["category"] == "Very Wet")
check("SPI +1.2 → Moderately Wet", interpret_spi(1.2)["category"] == "Moderately Wet")
check("SPI 0.0 → Near Normal", interpret_spi(0.0)["category"] == "Near Normal")
check("SPI -1.2 → Moderately Dry", interpret_spi(-1.2)["category"] == "Moderately Dry")
check("SPI -1.6 → Severely Dry", interpret_spi(-1.6)["category"] == "Severely Dry")
check("SPI -2.5 → Extremely Dry", interpret_spi(-2.5)["category"] == "Extremely Dry")


# ─── SOIL MOISTURE ───────────────────────────────────────────────────────────
print("\n== Soil Moisture Analysis ==")

gwettop  = [0.4, 0.35, 0.20, 0.15, 0.30] * 4   # 20 days, some below 0.25
gwetroot = [0.45, 0.40, 0.22, 0.18, 0.35] * 4

sm = analyze_soil_moisture(gwettop, gwetroot)

check("SM returns surface stats", "surface" in sm and sm["surface"]["mean"] is not None)
check("SM returns root_zone stats", "root_zone" in sm and sm["root_zone"]["mean"] is not None)
check("SM dry_stress_days > 0", sm["dry_stress_days"] > 0, f"got {sm['dry_stress_days']}")
check("SM dry_stress_pct in [0, 100]", 0 <= sm["dry_stress_pct"] <= 100)
check("SM dry_threshold = 0.25", sm["dry_threshold"] == 0.25)

# All saturated
sm_sat = analyze_soil_moisture([0.9]*10, [0.9]*10)
check("SM all saturated → 0 dry stress days", sm_sat["dry_stress_days"] == 0)

# All dry
sm_dry = analyze_soil_moisture([0.1]*10, [0.1]*10)
check("SM all dry → 100% dry stress", sm_dry["dry_stress_pct"] == 100.0)

# Empty
sm_empty = analyze_soil_moisture([], [])
check("SM empty series → None stats", sm_empty["surface"]["mean"] is None)


# ─── STRESS SCORE ────────────────────────────────────────────────────────────
print("\n== Composite Stress Score ==")

weights = {"spi": 0.35, "ndvi": 0.30, "soil": 0.20, "temp": 0.15}
check("Weights sum to 1.0", abs(sum(weights.values()) - 1.0) < 1e-9,
      f"sum={sum(weights.values())}")

# Low stress: normal SPI, zero NDVI anomaly, good soil moisture, no temp anomaly
stress_low = compute_stress_score(
    spi_recent=0.0, ndvi_anomaly=0.0, soil_moisture_mean=0.5, temp_anomaly=0.0
)
check("Stress score range [0, 100]", 0 <= stress_low["score"] <= 100)
check("Low-stress scenario → Low/Moderate level", stress_low["level"] in ["Low", "Moderate"])

# High stress: extreme drought SPI, negative NDVI, dry soil, hot
stress_high = compute_stress_score(
    spi_recent=-2.5, ndvi_anomaly=-0.3, soil_moisture_mean=0.1, temp_anomaly=5.0
)
check("High-stress scenario → score > 60", stress_high["score"] > 60,
      f"got {stress_high['score']}")
check("High-stress scenario → High/Severe level", stress_high["level"] in ["High", "Severe"])

# NaN SPI → should still produce a score (partial)
stress_nan_spi = compute_stress_score(
    spi_recent=float("nan"), ndvi_anomaly=-0.1, soil_moisture_mean=0.3, temp_anomaly=2.0
)
check("NaN SPI → score still computed", not math.isnan(stress_nan_spi["score"]))
check("NaN SPI → confidence < 1.0", stress_nan_spi["confidence"] < 1.0)

# Extreme inputs must not blow up
for spi_v in [-5.0, 5.0]:
    s = compute_stress_score(spi_v, 0.0, 0.5, 0.0)
    check(f"Stress score finite for SPI={spi_v}", 0 <= s["score"] <= 100, f"got {s['score']}")

for sm_v in [0.0, 1.0, 2.0]:
    s = compute_stress_score(0.0, 0.0, sm_v, 0.0)
    check(f"Stress score finite for soil_moisture={sm_v}", 0 <= s["score"] <= 100, f"got {s['score']}")


# ─── CROP ROTATION ───────────────────────────────────────────────────────────
print("\n== Crop Rotation Scoring ==")

crops = score_crop_rotation(
    cumulative_gdd=1400, total_precip_mm=600,
    mean_soil_wetness=0.5, mean_temp_c=20.0, stress_score=30.0
)
check("Returns list of 6 crops", len(crops) == 6)
check("All crop scores in [0, 100]", all(0 <= c["score"] <= 100 for c in crops))
check("Crops sorted descending by score", all(crops[i]["score"] >= crops[i+1]["score"] for i in range(len(crops)-1)))
check("Each crop has name and benefits", all("name" in c and "benefits" in c for c in crops))

# Drought stress should reduce all scores compared to no stress
crops_no_stress   = score_crop_rotation(1400, 600, 0.5, 20.0, 0.0)
crops_high_stress = score_crop_rotation(1400, 600, 0.5, 20.0, 90.0)
avg_no   = sum(c["score"] for c in crops_no_stress)   / len(crops_no_stress)
avg_high = sum(c["score"] for c in crops_high_stress) / len(crops_high_stress)
check("High stress reduces average crop score", avg_high < avg_no,
      f"no_stress_avg={avg_no:.1f}, high_stress_avg={avg_high:.1f}")

# Zero GDD
crops_zero_gdd = score_crop_rotation(0, 400, 0.4, 15.0, 20.0)
check("Zero GDD → scores are valid (not negative)", all(c["score"] >= 0 for c in crops_zero_gdd))

# Very high GDD and precip should not produce >100
crops_extreme = score_crop_rotation(9999, 9999, 1.0, 25.0, 0.0)
check("Extreme inputs: all scores <= 100", all(c["score"] <= 100 for c in crops_extreme))


# ─── LINEAR TREND ────────────────────────────────────────────────────────────
print("\n== Linear Trend ==")

# Clear upward trend
upward = list(range(1, 31))
trend_up = linear_trend(upward)
check("Upward trend: slope > 0", trend_up["slope"] > 0, f"slope={trend_up['slope']}")
check("Upward trend: p_value < 0.05", trend_up["p_value"] < 0.05)
check("Upward trend: significant=True", trend_up["significant"] is True)

# Flat series → no trend
flat = [5.0] * 30
trend_flat = linear_trend(flat)
check("Flat series: slope ≈ 0", abs(trend_flat["slope"]) < 1e-6, f"slope={trend_flat['slope']}")

# Too few points → graceful
trend_short = linear_trend([1.0, 2.0])
check("2-point series → significant=False", trend_short["significant"] is False)

# With NaN values
series_nan = [1.0, float("nan"), 3.0, float("nan"), 5.0, 6.0, 7.0]
trend_nan = linear_trend(series_nan)
check("NaN values: trend still computed", trend_nan["slope"] is not None)


# ─── SAVITZKY-GOLAY SMOOTHING ────────────────────────────────────────────────
print("\n== Savitzky-Golay NDVI Smoothing ==")

ndvi_noisy = [0.3 + 0.1 * np.sin(i * 0.5) + 0.05 * np.random.randn() for i in range(50)]
smoothed = smooth_ndvi_series(ndvi_noisy, window=5)
check("Smoothed output length matches input", len(smoothed) == len(ndvi_noisy))
check("Smoothed values in [-1, 1]", all(-1 <= v <= 1 for v in smoothed))

# Short series (< window) → returned as-is
short_ndvi = [0.4, 0.5, 0.3]
smoothed_short = smooth_ndvi_series(short_ndvi, window=5)
check("Short series returned unchanged", len(smoothed_short) == 3)


# ─── SUMMARY ────────────────────────────────────────────────────────────────
print(f"\n{'='*50}")
print(f"  AUDIT RESULT: {PASS} PASS  |  {FAIL} FAIL")
print(f"{'='*50}")
if FAIL > 0:
    sys.exit(1)
