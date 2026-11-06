"""End-to-end pipeline smoke test — runs without network."""
import sys
sys.path.insert(0, ".")

from datetime import date
from app.services.nasa_power import _demo_daily_data
from app.services.science import (
    calculate_spi, cumulative_gdd, analyze_soil_moisture,
    compute_stress_score, score_crop_rotation, linear_trend,
)
import numpy as np

lat, lon = 38.34, -98.12
start = date(2023, 1, 1)
end   = date(2023, 12, 31)

demo   = _demo_daily_data(lat, lon, start, end)
params = demo["properties"]["parameter"]

dates  = sorted(params["T2M"].keys())
t2m    = [params["T2M"][d]         for d in dates]
t_max  = [params["T2M_MAX"][d]     for d in dates]
t_min  = [params["T2M_MIN"][d]     for d in dates]
precip = [params["PRECTOTCORR"][d] for d in dates]
gwt    = [params["GWETTOP"][d]     for d in dates]

# SPI-3
spi3       = calculate_spi(precip, 3)
spi_recent = float(np.nanmean([v for v in spi3[-30:] if v and not np.isnan(v)]))

# GDD
gdd_cum   = cumulative_gdd(t_max, t_min)
total_gdd = gdd_cum[-1]

# Soil moisture
soil = analyze_soil_moisture(gwt, gwt)
rz_mean = soil["root_zone"]["mean"]

# Stress score
t_mean   = float(np.nanmean(t2m))
t_recent = float(np.nanmean(t2m[-30:]))
stress   = compute_stress_score(spi_recent, -0.02, float(np.nanmean(gwt)), t_recent - t_mean)

# Crop ranking
crops = score_crop_rotation(total_gdd, sum(precip), float(np.nanmean(gwt)), t_mean, stress["score"])

# Trend
trend = linear_trend(t2m)

print("=== AGROSCOPE AI PIPELINE SMOKE TEST ===")
print(f"Location:           Kansas ({lat}, {lon})")
print(f"Days analysed:      {len(dates)}")
print(f"SPI-3 (recent):     {spi_recent:.3f}")
print(f"Cumulative GDD:     {total_gdd:.0f} C.day")
print(f"Root-zone wetness:  {rz_mean:.3f}")
print(f"Dry-stress days:    {soil['dry_stress_days']}")
print(f"Stress score:       {stress['score']} ({stress['level']})")
print(f"Temp trend signif:  {trend['significant']}")
print(f"Top crop:           {crops[0]['name']} (score={crops[0]['score']:.1f})")
print(f"Crops ranked:       {len(crops)}")
print("")
print("PIPELINE OK — all indicators computed successfully")

# Assertions
assert 0 <= stress["score"] <= 100,           "Stress score out of range"
assert len(crops) == 6,                        "Expected 6 crops"
assert all(0 <= c["score"] <= 100 for c in crops), "Crop score out of range"
assert len(spi3) == len(precip),               "SPI length mismatch"
assert total_gdd > 0,                          "GDD must be positive"
assert rz_mean is not None,                    "Root-zone wetness None"

print("All assertions passed")
