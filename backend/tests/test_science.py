"""
Tests for AGROSCOPE AI scientific processing functions.

Tests validate:
  - NDVI formula correctness against known values
  - SPI calculation (McKee et al. 1993)
  - GDD formula (McMaster & Wilhelm 1997)
  - Soil moisture threshold logic
  - Stress score bounds
  - Crop rotation scoring order
  - Linear trend statistics
"""

import pytest
import numpy as np
from app.services.science import (
    calculate_ndvi, interpret_ndvi, smooth_ndvi_series,
    calculate_gdd, cumulative_gdd,
    calculate_spi, interpret_spi,
    analyze_soil_moisture, compute_stress_score,
    linear_trend, score_crop_rotation,
    analyze_heat_stress,
    calculate_vpd, analyze_atmospheric_dryness,
    CROP_PROFILES,
)


# ─── NDVI ────────────────────────────────────────────────────────────────────

class TestNDVI:
    def test_perfect_vegetation(self):
        """NDVI of 1.0 for NIR=1, Red=0."""
        assert calculate_ndvi(1.0, 0.0) == pytest.approx(1.0)

    def test_water_body(self):
        """Open water: NIR < Red → negative NDVI."""
        val = calculate_ndvi(0.1, 0.3)
        assert val < 0

    def test_bare_soil(self):
        """Bare soil: NIR ≈ Red → NDVI ≈ 0."""
        val = calculate_ndvi(0.2, 0.2)
        assert val == pytest.approx(0.0)

    def test_zero_denominator(self):
        """NIR=0, Red=0 → NaN (not division error)."""
        assert np.isnan(calculate_ndvi(0.0, 0.0))

    def test_typical_crop(self):
        """NIR=0.6, Red=0.1 → NDVI = (0.6-0.1)/(0.6+0.1) ≈ 0.714."""
        val = calculate_ndvi(0.6, 0.1)
        assert val == pytest.approx(5/7, rel=1e-4)

    def test_interpret_categories(self):
        """All NDVI categories return dict with 'category' and 'color' keys."""
        for ndvi_val in [-0.5, 0.05, 0.15, 0.27, 0.42, 0.55, 0.75]:
            result = interpret_ndvi(ndvi_val)
            assert "category" in result
            assert "color" in result
            assert "description" in result

    def test_nan_interpretation(self):
        result = interpret_ndvi(float("nan"))
        assert result["category"] == "No Data"

    def test_smoothing_preserves_length(self):
        data = [0.3, 0.4, 0.5, 0.45, 0.35, 0.3, 0.4, 0.5, 0.6, 0.55]
        smoothed = smooth_ndvi_series(data, window=5)
        assert len(smoothed) == len(data)

    def test_smoothing_clips_range(self):
        data = [2.0, -1.5, 0.5, 0.3, 0.4, 0.5, 0.6, 0.7, 0.5, 0.4]
        smoothed = smooth_ndvi_series(data, window=5)
        assert all(-1.0 <= v <= 1.0 for v in smoothed)


# ─── GDD ─────────────────────────────────────────────────────────────────────

class TestGDD:
    def test_normal_day(self):
        """T_max=25, T_min=15, base=10 → GDD = (20-10) = 10."""
        assert calculate_gdd(25, 15, t_base=10) == pytest.approx(10.0)

    def test_cold_day(self):
        """T_max=8, T_min=2, base=10 → GDD = 0 (below base)."""
        assert calculate_gdd(8, 2, t_base=10) == pytest.approx(0.0)

    def test_hot_day_capped(self):
        """T_max=40 is capped at 30 → GDD = (30+10)/2 - 10 = 10."""
        assert calculate_gdd(40, 10, t_base=10, t_cap=30) == pytest.approx(10.0)

    def test_cumulative_increases(self):
        t_max = [25, 27, 24, 26, 28]
        t_min = [15, 14, 13, 16, 15]
        cum = cumulative_gdd(t_max, t_min, t_base=10)
        assert len(cum) == 5
        for i in range(1, len(cum)):
            assert cum[i] >= cum[i-1]  # non-decreasing

    def test_all_cold_days_zero(self):
        t_max = [5, 6, 7, 8]
        t_min = [0, 1, 2, 3]
        cum = cumulative_gdd(t_max, t_min, t_base=10)
        assert all(v == pytest.approx(0.0) for v in cum)

    def test_none_values_safe(self):
        """Regression test: missing or pending NASA observations mapped to None must not crash GDD calculation."""
        assert calculate_gdd(None, 15.0, t_base=10) == 0.0
        assert calculate_gdd(25.0, None, t_base=10) == 0.0
        assert calculate_gdd(None, None, t_base=10) == 0.0

    def test_nan_values_safe(self):
        assert calculate_gdd(float("nan"), 15.0, t_base=10) == 0.0
        assert calculate_gdd(25.0, float("nan"), t_base=10) == 0.0

    def test_cumulative_with_trailing_none(self):
        t_max = [25.0, 27.0, None, None]
        t_min = [15.0, 14.0, None, None]
        cum = cumulative_gdd(t_max, t_min, t_base=10)
        assert len(cum) == 4
        assert cum[2] == cum[1]  # No additional accumulation for None days
        assert cum[3] == cum[1]


# ─── Heat Stress (Decoupled from Soil Moisture) ───────────────────────────────

class TestHeatStress:
    def test_missing_heat_inputs_produces_uncertainty_statement(self):
        """Missing or insufficient temperature inputs must return uncertainty, not an unsupported claim."""
        res_empty = analyze_heat_stress([])
        assert res_empty["status"] == "insufficient_data"
        assert "Insufficient data to assess heat stress" in res_empty["assessment"]

        res_few = analyze_heat_stress([32.0, None, 30.0])
        assert res_few["status"] == "insufficient_data"
        assert "Insufficient data to assess heat stress" in res_few["assessment"]

    def test_zero_dry_stress_days_with_high_temp_still_heat_stressed(self):
        """Zero soil water stress (GWETROOT adequate) with high ambient temperatures must NOT mean zero heat stress."""
        # 20 days with T_max = 38°C (critical heat shock for crops)
        t_max_series = [38.0] * 20
        res = analyze_heat_stress(t_max_series, heat_threshold_c=35.0)
        assert res["status"] == "evaluated"
        assert res["is_heat_stressed"] is True
        assert res["heat_stress_days_35c"] == 20
        assert res["max_tmax_c"] == 38.0
        assert res["level"] == "High Heat Exposure"

    def test_moderate_heat_exposure(self):
        t_max_series = [28.0] * 15 + [36.0, 37.0] + [29.0] * 10
        res = analyze_heat_stress(t_max_series, heat_threshold_c=35.0)
        assert res["status"] == "evaluated"
        assert res["is_heat_stressed"] is True
        assert res["heat_stress_days_35c"] == 2
        assert res["level"] == "Moderate Heat Exposure"

    def test_low_heat_exposure(self):
        t_max_series = [22.0, 24.0, 25.0, 23.0, 26.0, 24.0]
        res = analyze_heat_stress(t_max_series, heat_threshold_c=35.0)
        assert res["status"] == "evaluated"
        assert res["is_heat_stressed"] is False
        assert res["heat_stress_days_35c"] == 0
        assert res["level"] == "Low Heat Exposure"



# ─── SPI ─────────────────────────────────────────────────────────────────────

class TestSPI:
    def test_output_length_matches_input(self):
        precip = [30, 25, 40, 10, 5, 55, 45, 30, 20, 35, 40, 25]
        spi = calculate_spi(precip, timescale=3)
        assert len(spi) == len(precip)

    def test_first_timescale_minus_one_are_nan(self):
        precip = [30] * 12
        spi = calculate_spi(precip, timescale=3)
        # First timescale-1 values should be NaN (insufficient accumulation)
        assert np.isnan(spi[0]) or np.isnan(spi[1])

    def test_near_zero_precip_negative_spi(self):
        """Drought period (near-zero precip) → negative SPI."""
        precip = [50] * 20 + [1, 1, 1] + [50] * 10
        spi = calculate_spi(precip, timescale=3)
        valid = [v for v in spi[22:25] if not np.isnan(v)]
        if valid:
            assert any(v < 0 for v in valid)

    def test_interpret_spi_categories(self):
        thresholds = [
            (-3.0, "Extremely Dry"),
            (-1.6, "Severely Dry"),
            (-1.1, "Moderately Dry"),
            (0.0,  "Near Normal"),
            (1.1,  "Moderately Wet"),
            (1.6,  "Very Wet"),
            (2.5,  "Extremely Wet"),
        ]
        for value, expected_cat in thresholds:
            result = interpret_spi(value)
            assert result["category"] == expected_cat, f"SPI={value} → {result['category']}"


# ─── Soil Moisture ─────────────────────────────────────────────────────────────

class TestSoilMoisture:
    def test_adequate_moisture(self):
        gwttop  = [0.5] * 30
        gwtroot = [0.6] * 30
        result  = analyze_soil_moisture(gwttop, gwtroot)
        assert result["dry_stress_pct"] == pytest.approx(0.0)

    def test_full_drought(self):
        gwttop  = [0.1] * 30
        gwtroot = [0.1] * 30
        result  = analyze_soil_moisture(gwttop, gwtroot)
        assert result["dry_stress_pct"] == pytest.approx(100.0)

    def test_partial_drought(self):
        gwttop  = [0.3] * 30
        gwtroot = [0.1] * 15 + [0.5] * 15  # half below threshold
        result  = analyze_soil_moisture(gwttop, gwtroot)
        assert 45 <= result["dry_stress_pct"] <= 55

    def test_output_keys(self):
        result = analyze_soil_moisture([0.4]*10, [0.3]*10)
        for key in ["surface", "root_zone", "dry_stress_days", "dry_stress_pct", "interpretation", "data_source", "gwetroot_definition", "threshold_rationale"]:
            assert key in result

    def test_adequate_soil_moisture_not_waterlogging(self):
        """0.680 soil moisture fraction is adequate plant-available moisture, NOT waterlogging."""
        result = analyze_soil_moisture([0.5]*30, [0.68]*30)
        assert result["dry_stress_pct"] == 0.0
        assert "waterlogging" in result["interpretation"].lower()
        assert "not indicative of waterlogging" in result["interpretation"].lower()

    def test_high_moisture_requires_drainage_and_topography(self):
        """Elevated moisture (>0.75) advises that local topography and drainage are required."""
        result = analyze_soil_moisture([0.8]*30, [0.85]*30)
        interp = result["interpretation"].lower()
        assert "topography" in interp or "drainage" in interp



# ─── Stress Score ─────────────────────────────────────────────────────────────

class TestStressScore:
    def test_score_in_range(self):
        result = compute_stress_score(0.5, 0.1, 0.45, 1.0)
        assert 0 <= result["score"] <= 100

    def test_drought_conditions_high_score(self):
        """Severe drought inputs → stress score > 60."""
        result = compute_stress_score(
            spi_recent=-2.5,
            ndvi_anomaly=-0.15,
            soil_moisture_mean=0.1,
            temp_anomaly=3.0,
        )
        assert result["score"] > 60

    def test_ideal_conditions_low_score(self):
        """Ideal conditions → stress score < 30."""
        result = compute_stress_score(
            spi_recent=1.0,
            ndvi_anomaly=0.05,
            soil_moisture_mean=0.6,
            temp_anomaly=-0.5,
        )
        assert result["score"] < 30

    def test_output_structure(self):
        result = compute_stress_score(0.0, 0.0, 0.5, 0.0)
        for key in ["score", "level", "color", "indicators", "confidence", "note"]:
            assert key in result

    def test_level_labels(self):
        levels = {"Low", "Moderate", "Elevated", "High", "Severe"}
        result = compute_stress_score(-0.5, -0.05, 0.4, 0.5)
        assert result["level"] in levels


# ─── Linear Trend ─────────────────────────────────────────────────────────────

class TestLinearTrend:
    def test_clear_increasing_trend(self):
        data = list(range(1, 31))  # 1, 2, ..., 30
        result = linear_trend(data)
        assert result["direction"] == "increasing"
        assert result["significant"] is True
        assert result["slope"] == pytest.approx(1.0, abs=1e-3)

    def test_flat_no_trend(self):
        data = [10.0] * 20
        result = linear_trend(data)
        assert not result["significant"]

    def test_insufficient_data(self):
        result = linear_trend([5.0, 6.0])
        assert result["slope"] is None

    def test_nan_handling(self):
        data = [1.0, float("nan"), 3.0, 4.0, float("nan"), 6.0, 7.0, 8.0, 9.0, 10.0]
        result = linear_trend(data)
        # Should not raise; result may or may not be significant
        assert "slope" in result

    def test_p_value_formatting_small(self):
        """p < 0.001 must be formatted as 'p < 0.001' rather than p=0.000."""
        data = [float(x) for x in range(1, 100)]
        result = linear_trend(data)
        assert result["p_value"] < 0.001
        assert result["p_display"] == "p < 0.001"

    def test_extreme_event_disclaimer(self):
        """Increasing mean rainfall trend must not imply extreme event increases."""
        data = [float(x) for x in range(1, 50)]
        result = linear_trend(data, unit_name="mm")
        assert "extreme_event_disclaimer" in result
        assert "extreme rainfall" in result["extreme_event_disclaimer"].lower()
        assert "mm per time-step (day)" in result["slope_units"]


# ─── Crop Rotation Scoring ────────────────────────────────────────────────────

class TestCropRotation:
    def test_returns_all_crops(self):
        results = score_crop_rotation(800, 400, 0.4, 18, 40)
        assert len(results) == len(CROP_PROFILES)

    def test_heuristic_attributes_and_contributing_factors(self):
        """Crop suitability scores must be explicitly labeled heuristic with environmental factor breakdown."""
        results = score_crop_rotation(1000, 450, 0.5, 24, 30)
        for r in results:
            assert r["is_heuristic"] is True
            assert "Heuristic" in r["heuristic_label"]
            factors = r["contributing_factors"]
            assert "gdd_satisfaction_score" in factors
            assert "water_balance_score" in factors
            assert "temperature_tolerance_score" in factors
            assert "stress_penalty_factor" in factors

    def test_sorted_descending(self):
        results = score_crop_rotation(1200, 500, 0.5, 22, 30)
        scores = [r["score"] for r in results]
        assert scores == sorted(scores, reverse=True)

    def test_scores_in_range(self):
        results = score_crop_rotation(600, 300, 0.3, 15, 60)
        for r in results:
            assert 0 <= r["score"] <= 100

    def test_drought_tolerant_ranks_higher_under_stress(self):
        """Under severe water stress, drought-tolerant crops should rank higher."""
        results_stress = score_crop_rotation(1000, 200, 0.15, 28, 80)
        top_names = [r["name"] for r in results_stress[:3]]
        # Sorghum and sunflower have lower water requirements
        drought_tolerant = ["Sorghum", "Sunflower", "Winter Wheat"]
        found = any(any(dt in n for dt in drought_tolerant) for n in top_names)
        assert found, f"Expected drought-tolerant crop in top 3, got: {top_names}"

    def test_high_water_conditions_may_rank_soybean_higher(self):
        """With ample water, legumes should score reasonably."""
        results = score_crop_rotation(1100, 600, 0.7, 25, 20)
        crop_ids = [r["crop_id"] for r in results]
        assert "soybean" in crop_ids  # present, not necessarily top


# ─── Vapor Pressure Deficit (VPD) & Atmospheric Dryness ──────────────────────

class TestVPDAndAtmosphericDryness:
    def test_calculate_vpd_standard(self):
        """At 25°C, es ≈ 3.168 kPa. At 50% RH, ea ≈ 1.584 kPa -> VPD ≈ 1.58 kPa."""
        vpd = calculate_vpd(25.0, 50.0)
        assert vpd is not None
        assert 1.50 <= vpd <= 1.65

    def test_calculate_vpd_saturated(self):
        """100% relative humidity yields 0.0 kPa VPD."""
        vpd = calculate_vpd(20.0, 100.0)
        assert vpd == pytest.approx(0.0)

    def test_calculate_vpd_invalid_inputs(self):
        """Missing or out-of-range inputs return None."""
        assert calculate_vpd(None, 50.0) is None
        assert calculate_vpd(25.0, None) is None
        assert calculate_vpd(-999.0, 50.0) is None
        assert calculate_vpd(25.0, -5.0) is None
        assert calculate_vpd(25.0, 105.0) is None

    def test_analyze_atmospheric_dryness_missing_data_uncertainty(self):
        """Missing RH2M series must return uncertainty statement rather than assuming low demand."""
        res_none = analyze_atmospheric_dryness([25.0] * 10, None)
        assert res_none["status"] == "insufficient_data"
        assert "Insufficient data to assess atmospheric dryness (VPD)" in res_none["assessment"]
        assert res_none["mean_vpd_kpa"] is None

        res_short = analyze_atmospheric_dryness([25.0] * 3, [50.0] * 3)
        assert res_short["status"] == "insufficient_data"
        assert "Insufficient data to assess atmospheric dryness (VPD)" in res_short["assessment"]

    def test_analyze_atmospheric_dryness_high_demand(self):
        """High temperature (35°C) and low RH (25%) yields high evaporative demand (> 2.0 kPa)."""
        t = [35.0] * 10
        rh = [25.0] * 10
        res = analyze_atmospheric_dryness(t, rh)
        assert res["status"] == "evaluated"
        assert res["level"] == "High Evaporative Demand"
        assert res["mean_vpd_kpa"] > 2.0
        assert res["is_elevated_demand"] is True

    def test_analyze_atmospheric_dryness_optimal_demand(self):
        """Moderate temperature (22°C) and moderate RH (65%) yields optimal demand."""
        t = [22.0] * 10
        rh = [65.0] * 10
        res = analyze_atmospheric_dryness(t, rh)
        assert res["status"] == "evaluated"
        assert res["level"] == "Optimal Evaporative Demand"
        assert 0.4 <= res["mean_vpd_kpa"] <= 1.2
        assert res["is_elevated_demand"] is False


class TestHeatStressDecoupling:
    def test_negative_anomaly_does_not_rule_out_heat_stress(self):
        """When T_max reaches 36°C, heat stress must be flagged even if mean anomaly is negative."""
        tmax = [36.0, 37.0, 36.5, 35.5, 36.0] + [30.0] * 25
        # 30 days of mean temp where recent is cooler than overall
        tmean = [32.0] * 30 + [28.0] * 30
        res = analyze_heat_stress(tmax, tmean)
        assert res["status"] == "evaluated"
        assert res["heat_stress_days_35c"] >= 5
        assert res["is_heat_stressed"] is True
        assert res["thermal_anomaly_c"] < 0
        assert "Negative or normal mean temperature anomalies do not rule out acute heat stress" in res["assessment"]

    def test_missing_tmax_returns_uncertainty(self):
        """Fewer than 5 T_max observations returns explicit uncertainty statement."""
        res = analyze_heat_stress([32.0, None, None])
        assert res["status"] == "insufficient_data"
        assert "Insufficient data to assess heat stress" in res["assessment"]
        assert res["heat_stress_days_35c"] is None

