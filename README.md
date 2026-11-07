# 🌍 AGROSCOPE AI
### *OBSERVE. ANTICIPATE. ADAPT.*

**NASA Space Apps Challenge 2026 — Problem #7: Field Shift: Adapting Farms with NASA Data**

---

AGROSCOPE AI is an enterprise-grade global agricultural intelligence platform combining NASA Earth observation data, planetary geospatial analysis, climate sensitivity modelling, and evidence-grounded AI to support agricultural climate adaptation worldwide.

The platform is **globally flexible**, accepting arbitrary geographic coordinates across both the Northern and Southern Hemispheres (`-90.0° <= Latitude <= 90.0°`, `-180.0° <= Longitude <= 180.0°`) while providing live streaming satellite imagery, biophysical stress decomposition, and climate scenario simulation.

---

## 🏆 Challenge Context

**Problem Statement #7 — Field Shift: Adapting Farms with NASA Data**  
How can farmers and agricultural communities use NASA's Earth observation data to adapt to changing climate conditions and maintain food security?

AGROSCOPE AI answers this by turning petabytes of NASA satellite observations into actionable, transparent, field-level intelligence accessible to any agricultural user worldwide.

---

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- pnpm (or npm)

### 1. Start the Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000 --host 127.0.0.1
```
Backend runs at: **http://127.0.0.1:8000**  
Interactive API docs at: **http://127.0.0.1:8000/api/docs**

### 2. Start the Frontend (Next.js)
```bash
cd frontend
pnpm install
pnpm build
pnpm start -- -p 3001
```
Frontend runs at: **http://localhost:3001**

---

## 🛰️ NASA Datasets Integrated

| Dataset | Description | Resolution | Use in AGROSCOPE AI |
|---|---|---|---|
| **NASA POWER** | Daily surface meteorology & agroclimatology | 0.5° × 0.625° (~55 km) | Temperature ($T_{2M}$), precipitation, solar irradiance, relative humidity |
| **NASA MERRA-2** (via POWER) | Modern-Era Retrospective Analysis for Research and Applications | 0.5° × 0.625° | Root-zone soil wetness (`GWETROOT`, 0–1 fraction), surface wetness (`GWETTOP`) |
| **NASA GIBS WMTS** | Global Imagery Browse Services (EPSG:3857) | 250m–1km daily | Earth Explorer, Satellite Time Machine, Change Detective |
| **MODIS Terra/Aqua** (via GIBS) | Corrected Reflectance True Color & Bands 7-2-1 Agriculture | 250m–500m daily | Agricultural land cover, active canopy chlorophyll, crop boundary contrast |
| **VIIRS NOAA-20** (via GIBS) | Visible Infrared Imaging Radiometer Suite | 375m daily | High-radiometric-fidelity visible planetary observation |
| **GPM IMERG** (via GIBS & POWER)| Global Precipitation Measurement | 0.1° / 30-min | Rainfall rate monitoring and 3-month rolling SPI drought index |

---

## 🌟 Twelve Integrated Capabilities

### 1. 🌐 Earth Explorer (Map-First 2D & 3D)
Prominent, full-screen map experience featuring **live 2D NASA GIBS satellite tile streaming** (MODIS TrueColor, Bands 7-2-1 Agriculture, NDVI, LST, VIIRS, IMERG Precipitation) and an interactive **3D WebGL Earth Globe** (Three.js) with procedural Rayleigh scattering, atmospheric glow, and synchronized spatial telemetry.

### 2. 🤖 Farmer Action Copilot
Conversational agricultural AI research assistant powered by OpenRouter (with an autonomous server-side NASA rules-engine fallback). Strictly grounds guidance in live NASA POWER and MERRA-2 telemetry, citing data provenance and confidence limitations for arbitrary coordinates.

### 3. 🧠 Field Intelligence Engine (XAI)
Transparent biophysical stress decomposition for any valid global coordinate. Quantifies drought severity (SPI-3, 35%), vegetation anomaly (NDVI proxy, 30%), root-zone soil wetness (20%), and thermal anomaly (15%). Handles trailing unfinalized observations and date ranges safely.

### 4. 🌱 Farm Futures Lab
Interactive climate sensitivity simulation laboratory. Test arbitrary coordinate baselines under user-defined temperature shifts (−4°C to +6°C), precipitation perturbations (−80% to +100%), soil wetness assumptions, and irrigation interventions.

### 5. 🕐 Satellite Time Machine
Multi-year chronological sequence scrubbing across authentic NASA GIBS satellite archives (2021–2024). Features automated time-lapse playback, seasonal vegetative trajectories, and dual-epoch before/after comparison.

### 6. 🔭 Satellite Change Detective
Synchronized dual-panel map viewer comparing two distinct historical observation epochs side by side. Detects drought degradation, flood inundation, and vegetative canopy recovery.

### 7. 🗺️ Field Boundary Intelligence
Geospatial vector delineator accepting GeoJSON Polygons and MultiPolygons. Computes exact geodesic hectare area, perimeter, and centroid, and automatically projects spatial boundary boxes around active user coordinates.

### 8. 💧 Smart Water Intelligence
Root-zone soil wetness telemetry, root-profile depletion thresholds, and precipitation deficit anomalies derived from MERRA-2 and GPM IMERG to guide precision irrigation scheduling.

### 9. 📈 Crop Phenology Tracker
Multi-year seasonal vegetation growth trajectories, green-up inflection dates, and peak canopy timing. Features **hemisphere-aware season modeling** to invert biological DOY calendars for Southern Hemisphere coordinates (`latitude < 0`).

### 10. ⚠️ Regional Agricultural Risk Radar
Macro-scale vulnerability ranking and concurrent stress comparison across primary global agricultural breadbaskets, with one-click inclusion of user-selected custom fields.

### 11. 📋 Field Intelligence Dossier & Reports
Generates downloadable, publication-grade scientific briefing dossiers in PDF (`jsPDF` + `html2canvas`) and Markdown formats, citing exact coordinates, observation intervals, and data provenance.

### 12. 📊 Historical Agroclimatological Trends
Multi-decade historical climate trend analysis (1981–2024) extracting linear temperature trends, precipitation variability, and humidity metrics from NASA POWER.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER CLIENT                        │
│  Next.js 16 (App Router) / React 19 / Tailwind CSS v4    │
│  LocationContext (Universal Coordinate Single Source)    │
│  Three.js WebGL 3D Globe │ Leaflet Maps │ Recharts       │
│  jsPDF + html2canvas (Publication-Grade PDF Dossiers)    │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP/JSON (:3001 → :8000)
┌──────────────────────▼──────────────────────────────────┐
│                    FASTAPI BACKEND                       │
│  Python 3.12 / Uvicorn / Pydantic v2 / Starlette CORS   │
│  NumPy │ Pandas │ SciPy (Gamma MLE fit for SPI) │ httpx │
│  OpenRouter AI Gateway (Server-Side Secrets Only)       │
│  Science Modules: SPI-3, GDD, Stress, Phenology, Crops  │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS (Live Data Calls)
┌──────────────────────▼──────────────────────────────────┐
│                    NASA DATA LAYER                       │
│  NASA POWER API (Daily Agroclimatology & MERRA-2)       │
│  NASA GIBS WMTS (EPSG:3857 Satellite Tile Streaming)    │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Quality & Verification Gates

| Verification Dimension | Result | Details |
|---|---|---|
| **Backend Test Suite** | **87 passed, 0 failed** | `test_copilot.py` (25), `test_science.py` (39), `test_integration.py` (23) |
| **Frontend Code Quality** | **0 errors, 0 warnings** | Strict ESLint check across all components and pages |
| **Next.js Production Build** | **17/17 pages compiled** | Static prerendering of all routes via `next build --webpack` |
| **Global Tile Verification** | **35/36 tiles passed** | Tested across Chennai, Punjab, São Paulo, Nairobi, Sydney, Kansas |
| **Map-First Earth Explorer** | **1.41 MB live capture** | Real Leaflet 2D GIBS tile stream verified (`explorer_restored.png`) |
| **OpenRouter AI Gateway** | **Verified** | Server-side API key protection with rules-engine fallback |

---

## ⚠️ Scientific Methodology & Limitations Disclosures

- **Vegetation Health**: Estimated from MERRA-2-derived environmental proxies (temperature, solar irradiance, root-zone wetness). It is disclosed as a model-derived proxy, **not** direct MODIS NDVI.
- **Root-Zone Soil Wetness (`GWETROOT`)**: Represents a physical 0–1 fraction from NASA's Catchment Land Surface Model in MERRA-2 (~55 km grid), **not** an in-situ point sensor measurement.
- **Composite Stress Scores**: Heuristic decision-support indices combining SPI-3, NDVI anomaly, thermal anomaly, and soil wetness. They are **not** validated statistical yield forecasters.
- **Scenario Simulations**: Sensitivity analyses representing hypothetical climate perturbations, **not** deterministic weather forecasts.
- **Crop Suitability**: Comparative biophysical suitability scoring based on GDD and moisture requirements, **not** a substitute for local agronomic field trials.

---

## 📁 Technical Documentation

- [`ARCHITECTURE.md`](file:///C:/Users/pallavi/.gemini/antigravity/scratch/agroscope-ai/docs/ARCHITECTURE.md): Comprehensive system topology and data flow diagrams.
- [`GLOBAL_PRODUCT_AUDIT.md`](file:///C:/Users/pallavi/.gemini/antigravity/scratch/agroscope-ai/docs/GLOBAL_PRODUCT_AUDIT.md): Complete project-wide dependency audit and classification.
- [`GLOBAL_FLEXIBILITY_AUDIT.md`](file:///C:/Users/pallavi/.gemini/antigravity/scratch/agroscope-ai/docs/GLOBAL_FLEXIBILITY_AUDIT.md): Detailed verification of arbitrary coordinate flexibility.
- [`SCIENTIFIC_METHODOLOGY.md`](file:///C:/Users/pallavi/.gemini/antigravity/scratch/agroscope-ai/docs/SCIENTIFIC_METHODOLOGY.md): Mathematical formulations for SPI, GDD, stress index, and phenology.
- [`DATA_PROVENANCE.md`](file:///C:/Users/pallavi/.gemini/antigravity/scratch/agroscope-ai/docs/DATA_PROVENANCE.md): NASA data citations, spatial resolutions, and update frequencies.
- [`DEMO_GUIDE.md`](file:///C:/Users/pallavi/.gemini/antigravity/scratch/agroscope-ai/docs/DEMO_GUIDE.md): Guided walk-through for hackathon and competition evaluators.
- [`FINAL_VERIFICATION_REPORT.md`](file:///C:/Users/pallavi/.gemini/antigravity/scratch/agroscope-ai/docs/FINAL_VERIFICATION_REPORT.md): Final test execution logs and benchmark results.

---

## 🧑‍💻 Team & License

Built for **NASA Space Apps Challenge 2026** (Field Shift: Adapting Farms with NASA Data).  
Open source agricultural intelligence powered by open NASA Earth observation data.

*"The Earth is a living system. We just learned to read it."*
