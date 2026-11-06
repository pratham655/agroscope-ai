# 🌍 AGROSCOPE AI
### *OBSERVE. ANTICIPATE. ADAPT.*

**NASA Space Apps Challenge 2026 — Problem #7: Field Shift: Adapting Farms with NASA Data**

---

AGROSCOPE AI is a global agricultural intelligence platform combining NASA Earth observation data, geospatial analysis, climate sensitivity modelling and explainable AI to support agricultural adaptation in the face of climate change.

## 🏆 Challenge Context

**Problem Statement #7 — Field Shift: Adapting Farms with NASA Data**  
How can farmers and agricultural communities use NASA's Earth observation data to adapt to changing climate conditions and maintain food security?

AGROSCOPE AI answers this by turning petabytes of NASA satellite data into actionable field-level intelligence accessible to any user worldwide.

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
python -m uvicorn app.main:app --port 8000 --host 127.0.0.1 --reload
```
Backend runs at: **http://127.0.0.1:8000**  
API docs available at: **http://127.0.0.1:8000/api/docs**

### 2. Start the Frontend (Next.js)
```bash
cd frontend
pnpm install
pnpm dev
```
Frontend runs at: **http://localhost:3000**

### 3. Production Build
```bash
cd frontend
pnpm build
pnpm start
```

---

## 🛰️ NASA Datasets Integrated

| Dataset | Description | Resolution | Use in AGROSCOPE AI |
|---------|-------------|------------|---------------------|
| **NASA POWER** | Meteorological/climatological data derived from MERRA-2 and GEOS-5 | 0.5° × 0.625° (~55 km) | Temperature, precipitation, wind, humidity for all analyses |
| **NASA GIBS WMTS** | Global Imagery Browse Services — satellite tile streaming | 250m–1km | Earth Explorer, Satellite Time Machine, Change Detective |
| **MODIS Terra/Aqua** (via GIBS) | MOD09 surface reflectance bands 7-2-1 | 500m | Agricultural land cover discrimination |
| **VIIRS** (via GIBS) | Day/Night Band and true-color composites | 375m | High-resolution surface observation |
| **GPM IMERG** (via POWER) | Global Precipitation Measurement | 0.1° | Precipitation fields for SPI calculation |
| **MERRA-2** (via POWER) | Modern-Era Retrospective Analysis for Research and Applications | 0.5° × 0.625° | Soil wetness (GWETTOP, GWETROOT, GWETPROF), wind |

---

## 🌟 Nine Capabilities

### 1. 🌐 Earth Explorer (3D/2D)
Interactive 3D WebGL globe (Three.js) with procedural NASA Blue Marble texture, atmospheric glow, 10 global agricultural site markers and stress-colour coding. Switch to 2D GIBS satellite tile view. Fly to any global breadbasket with one click.

### 2. 🕐 Satellite Time Machine
Multi-year NASA GIBS time-lapse animation (2021–2024) across 8 chronological steps. Play/pause, scrub, variable speed (0.5×/1×/2×). Layer switching between Bands 7-2-1 Agro, TrueColor, VIIRS and Aqua. Visualise seasonal vegetation cycles and long-term land change.

### 3. 🔭 Satellite Change Detective
Synchronised dual-panel Leaflet maps. Select two dates to compare NASA GIBS imagery side by side. Quantifies spectral differences as environmental change indicators. Supports any global coordinates.

### 4. 🌱 Farm Futures Lab
Climate sensitivity simulation workspace. Adjust temperature (+0°C to +4°C), precipitation (−40% to +20%) and CO₂ enrichment parameters. Visualise baseline versus simulated yield impact, water stress, pest pressure and economic projections. Powered by NASA POWER live climate data.

### 5. 🤖 Farmer Action Copilot
Conversational agricultural AI assistant. Ask questions about your selected field. Answers incorporate actual NASA POWER climate analysis, field stress scores, XAI decomposition and crop recommendations. Provides cited evidence for every recommendation.

### 6. 🗺️ Field Boundary Intelligence
Draw and upload field polygons (GeoJSON). Calculate field area, perimeter and shape index. Run spatial analysis. Validate polygon geometry. Export boundary data.

### 7. ⚠️ Regional Agricultural Risk Radar
Multi-region risk assessment. Test 5 global breadbaskets or enter custom coordinates. Composite stress score ranking using SPI-3, vegetation proxy, soil wetness and thermal anomaly. Ranked heatmap table with links to Farm Futures Lab simulation.

### 8. 🧠 Field Intelligence Engine (XAI)
Explainable AI decomposition of composite agricultural stress. Shows contribution weights for each indicator: Drought Index (SPI-3, 35%), Vegetation Health (NDVI proxy, 30%), Soil Wetness (20%), Thermal Anomaly (15%). Full methodology transparency.

### 9. 📋 Field Intelligence Dossier (Reports)
AI-generated field intelligence report with executive summary, NASA telemetry table, XAI stress decomposition, crop suitability matrix and data provenance. Export as PDF (client-side jsPDF + html2canvas) or Markdown.

**Plus:** Historical Climate Trends, Smart Water Intelligence, Crop Phenology Tracker, About/Methodology pages.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER CLIENT                        │
│  Next.js 16 / React 19 / Tailwind CSS v4               │
│  Three.js WebGL Globe │ Leaflet Maps │ Recharts          │
│  jsPDF + html2canvas (PDF export)                        │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP/JSON (localhost:3000 → :8000)
┌──────────────────────▼──────────────────────────────────┐
│                    FASTAPI BACKEND                       │
│  Python 3.12 / Uvicorn / Pydantic v2                   │
│  NumPy │ Pandas │ SciPy │ httpx                         │
│  Science modules: spi, gdd, stress, crops, phenology    │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS (live API calls)
┌──────────────────────▼──────────────────────────────────┐
│                    NASA DATA LAYER                       │
│  NASA POWER API  │  NASA GIBS WMTS                     │
│  (api.nasa.gov)  │  (gibs.earthdata.nasa.gov)           │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
agroscope-ai/
├── README.md
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entrypoint
│   │   ├── routers/             # API route modules
│   │   │   ├── scenarios.py     # Farm Futures Lab + geocoding
│   │   │   ├── analysis.py      # Field Intelligence Engine (XAI)
│   │   │   ├── advisory.py      # Farmer Action Copilot
│   │   │   ├── history.py       # Historical Climate Trends
│   │   │   ├── phenology.py     # Crop Phenology Tracker
│   │   │   ├── risk.py          # Regional Risk Radar
│   │   │   ├── reports.py       # Field Intelligence Dossier
│   │   │   └── water.py         # Smart Water Intelligence
│   │   └── science/             # Scientific computation modules
│   │       ├── spi.py           # Standardised Precipitation Index
│   │       ├── gdd.py           # Growing Degree Days
│   │       ├── stress.py        # Composite stress score
│   │       ├── crops.py         # Crop suitability heuristics
│   │       └── phenology.py     # Phenological event detection
│   ├── tests/
│   │   └── test_science.py      # 36 scientific unit tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js App Router pages (15 routes)
│   │   ├── components/          # Shared React components
│   │   │   ├── EarthGlobe3D.tsx          # Three.js WebGL globe
│   │   │   ├── SatelliteTimeMachineMap.tsx # GIBS time-lapse
│   │   │   ├── EarthExplorerMap.tsx       # 2D Leaflet satellite
│   │   │   ├── SynchronizedChangeMap.tsx  # Dual-panel change detection
│   │   │   └── Nav.tsx                    # Navigation
│   │   └── lib/
│   │       └── api.ts           # Typed API client
│   └── package.json
└── docs/
    ├── ARCHITECTURE.md
    ├── SCIENTIFIC_METHODOLOGY.md
    ├── DATA_PROVENANCE.md
    ├── DEMO_GUIDE.md
    └── FINAL_VERIFICATION_REPORT.md
```

---

## ✅ Verification Results (Competition Freeze)

| Test Suite | Result |
|-----------|--------|
| Scientific Unit Tests | **36/36 PASSED** |
| Frontend Route HTTP Verification | **14/14 PASSED** |
| ESLint | **0 errors, 0 warnings** |
| Production Build (Next.js) | **15/15 routes compiled** |
| Backend Health | **200 OK** |
| NASA POWER live endpoint | **✅ Verified** |
| NASA GIBS WMTS live tiles | **✅ Verified** |

---

## ⚠️ Scientific Limitations

- **Vegetation health** is estimated from MERRA-2-derived environmental proxies (temperature, precipitation, soil wetness). It is **not** direct MODIS NDVI.
- **Composite stress scores** are heuristic decision-support metrics, **not** validated yield prediction models.
- **Scenario simulations** are sensitivity analyses representing hypothetical climate perturbations, **not** weather forecasts.
- **Crop suitability rankings** are relative comparisons based on GDD and water need thresholds, **not** agronomic field trials.
- NASA POWER spatial resolution is ~55 km; sub-field variability is not captured.

---

## 🧑‍💻 Team

Built for NASA Space Apps Challenge 2026.  
Powered by open NASA Earth observation data.

---

*"The Earth is a living system. We just learned to read it."*
