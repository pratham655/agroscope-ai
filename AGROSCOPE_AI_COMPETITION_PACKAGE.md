# AGROSCOPE AI — Competition Package

### NASA Space Apps Challenge 2026: Problem #7 — Field Shift: Adapting Farms with NASA Data
**Project:** AGROSCOPE AI  
**Tagline:** *Observe. Anticipate. Adapt.*  
**Document status:** Presentation material — not a production-readiness certification.

> **Scientific integrity note:** AGROSCOPE AI provides regional agricultural intelligence using NASA POWER/MERRA-2 grid-cell data and NASA GIBS imagery. Its derived scores, crop rankings and scenario outputs are screening or sensitivity tools unless independently validated. NASA POWER's approximately 0.5° × 0.625° grid (around 55 km) must not be described as field-sensor or sub-field precision. Verify every numerical formula, test count and feature claim against the current source and CI before presenting it as verified.

## Project overview

AGROSCOPE AI brings together Earth-observation imagery, agroclimatic indicators, geospatial exploration and an AI assistant to help users investigate agricultural climate conditions. It is designed to make complex environmental datasets easier to explore while communicating uncertainty and data provenance.

## Core capabilities

- Global location-based exploration and NASA GIBS imagery.
- Regional agroclimatic analysis using NASA POWER/MERRA-2.
- Evidence-grounded agricultural Q&A with explicit limitations.
- Climate sensitivity scenarios based on user-selected assumptions.
- Regional risk comparison and crop suitability screening.
- Field-boundary visualization with approximate polygon metrics.
- Historical imagery comparison and reporting tools.

## Technology

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS, Leaflet and Recharts.
- **Backend:** Python, FastAPI and scientific Python libraries.
- **AI:** OpenRouter integration with a server-side fallback path.
- **Data:** NASA POWER, NASA GIBS and OpenStreetMap/Nominatim.

## Data and interpretation

- NASA POWER/MERRA-2 variables are regional gridded model outputs, not in-situ farm measurements.
- Soil wetness values are model-derived and should not be presented as sensor readings.
- Vegetation proxies must not be labeled direct MODIS NDVI unless the satellite product is directly processed.
- Short rolling precipitation proxies must not be labeled standard SPI-3.
- Crop suitability scores are heuristic rankings, not yield forecasts.
- Scenario results are sensitivity experiments, not validated forecasts.
- Field boundary area and perimeter currently use approximate local-planar calculations.

## Verification

Use the GitHub Actions checks attached to the exact commit being presented. The historical report in `docs/FINAL_VERIFICATION_REPORT.md` records earlier test results and is not evidence that the current commit passes. Do not state “100% production ready” or “fully verified” without current automated checks and an appropriate scientific, security and operational review.

## Team handoff

1. Review the root README and the contribution workflow.
2. Configure local environment variables without committing secrets.
3. Run backend tests and frontend lint, typecheck and production build.
4. Review the data provenance and scientific methodology documents.
5. Record remaining limitations before presenting or sharing results.
