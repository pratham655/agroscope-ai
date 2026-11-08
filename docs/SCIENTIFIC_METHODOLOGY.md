# AGROSCOPE AI — Scientific Methodology

**Project:** NASA Space Apps Challenge 2026 — Problem #7: Field Shift  
**Document status:** Methodology overview; verify each formula against the current implementation before making scientific or operational claims.

> **Scope and resolution:** NASA POWER/MERRA-2 data represent regional model grid cells (approximately 0.5° × 0.625°, around 55 km), not measurements from an individual farm or parcel. Derived scores and crop rankings are screening heuristics unless separately validated against field observations and independent reference datasets.

## 1. Overview

The backend scientific implementation is maintained in `backend/app/services/science.py`. API orchestration and data preparation are implemented under `backend/app/api/`. Automated tests are maintained in `backend/tests/`.

The platform combines source observations/reanalysis, derived indicators and heuristic decision support. These categories must not be conflated:

- **Source data:** NASA POWER/MERRA-2 variables and NASA GIBS imagery.
- **Model-derived variables:** for example, MERRA-2 root-zone wetness.
- **Derived indicators:** computed from source series using documented algorithms.
- **Heuristics:** screening thresholds, composite scores and crop suitability rankings.
- **Scenarios:** sensitivity experiments under user-selected assumptions, not probabilistic forecasts.

## 2. Precipitation and drought indicators

The platform's precipitation indicators must be named according to the exact accumulation period and algorithm implemented in the current backend. A short rolling accumulation or proxy is **not** equivalent to the standard 3-month SPI (SPI-3).

A defensible standard SPI-3 requires monthly precipitation accumulated over three-month windows and a suitable long-term climatological reference distribution, with treatment of zero precipitation and incomplete records. Do not label a daily or three-day rolling proxy as standard SPI-3.

## 3. Growing Degree Days (GDD)

Growing Degree Days estimate thermal accumulation relative to a crop-specific base temperature. The exact daily equation, temperature source, upper cutoff and crop-specific parameters must be taken from the current implementation and disclosed alongside any reported result. Different crops and cultivars have different thermal requirements; a single universal parameter set is not appropriate.

## 4. Composite agricultural stress

Any composite score is a derived screening index, not a direct physical measurement. Its input channels, normalization, weights, missing-channel handling and directionality must match the implementation and be visible to users. Do not repeat a formula or channel weight in external materials unless it has been checked against the current source code.

## 5. Vegetation indicators

A model-derived environmental vegetation proxy is not direct MODIS NDVI. Direct NDVI claims require the corresponding satellite vegetation product to be ingested, quality-screened, temporally aligned and processed. State the actual input source and proxy status in charts and reports.

## 6. Soil wetness

NASA MERRA-2 variables such as `GWETTOP` and `GWETROOT` are land-surface-model outputs. They are not direct soil-moisture sensor readings. A fixed wetness threshold is an operational heuristic, not a universal crop wilting point or field-capacity boundary. Interpretation depends on soil, crop, rooting depth, growth stage and local conditions.

Unfinalized or missing sentinel values must be treated as missing data, not as valid low-moisture observations.

## 7. Heat and atmospheric demand

Heat screening thresholds (for example, daily maximum temperature thresholds) are heuristics. Crop response depends on crop type, growth stage, duration and nighttime conditions. Vapour-pressure deficit (VPD) describes atmospheric evaporative demand; it is not interchangeable with root-zone soil-water stress. Claims of combined stress require temporally aligned evidence.

## 8. Field boundary calculations

The current field-boundary implementation uses a local-planar approximation for polygon area and perimeter. These are approximate geometry metrics, not exact ellipsoidal geodesic measurements. Confirm the accepted geometry types in the API before claiming support for Polygon, MultiPolygon or other GeoJSON geometries.

## 9. Crop suitability and scenario outputs

Crop suitability rankings are heuristic screening outputs, not validated yield forecasts or agronomic prescriptions. Scenario outputs are sensitivity tests conditional on user-entered assumptions, not validated predictions of future weather, yield or profit.

## 10. Reporting requirements

For every scientific claim, report where relevant:

1. Dataset and variable name.
2. Spatial and temporal resolution.
3. Analysis period and missing-data treatment.
4. Formula and parameter values as implemented.
5. Whether the result is measured, model-derived, proxy-derived or heuristic.
6. Limitations and validation status.

When the data do not support a conclusion, state that limitation rather than filling the gap with inference.
