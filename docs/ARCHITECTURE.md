# AGROSCOPE AI — Technical Architecture

**NASA Space Apps Challenge 2026 — Problem #7: Field Shift**  
Version: 1.0.0 (Competition Freeze)  
Date: November 2026

---

## 1. System Overview

AGROSCOPE AI is a full-stack geospatial intelligence platform. It consists of:

- A **Next.js 16** frontend (React 19, Tailwind CSS v4, TypeScript)
- A **FastAPI** backend (Python 3.12, Uvicorn, Pydantic v2)
- **Live integrations** with NASA POWER API and NASA GIBS WMTS

```
Browser (localhost:3000)
  │
  ├─── Next.js App Router (15 routes, SSR + client components)
  │       ├── Three.js WebGL (EarthGlobe3D — dynamically imported)
  │       ├── Leaflet (EarthExplorerMap, SatelliteTimeMachineMap, SynchronizedChangeMap)
  │       ├── Recharts (all data visualisations)
  │       └── jsPDF + html2canvas (client-side PDF export)
  │
  └─── API Calls → FastAPI (localhost:8000)
          │
          ├── Routers → Science modules (NumPy, Pandas, SciPy)
          │
          └── External API calls
                ├── NASA POWER API (api.nasa.gov/planetary/energy)
                └── NASA GIBS WMTS (gibs.earthdata.nasa.gov) [frontend direct]
```

---

## 2. Frontend Stack

| Technology | Version | Role |
|-----------|---------|------|
| Next.js | 16 (App Router) | Full-stack React framework, SSR, routing |
| React | 19 | UI component library |
| TypeScript | 5+ | Type safety across all components |
| Tailwind CSS | v4 | Utility-first styling (`@import "tailwindcss"`) |
| Three.js | Latest | WebGL 3D Earth globe in `/explorer` |
| @types/three | Latest | TypeScript definitions for Three.js |
| Leaflet | 2.x | 2D interactive satellite maps |
| react-leaflet | 5.x | React bindings for Leaflet |
| Recharts | 2.x | All data charts (line, bar, area, scatter) |
| jsPDF | 2.x | Client-side PDF generation in `/reports` |
| html2canvas | 1.x | DOM screenshot for PDF embedding |
| Lucide React | Latest | Icon system throughout the UI |

### Next.js Configuration Notes
- `output: 'standalone'` compatible
- Dynamic imports with `{ ssr: false }` for Leaflet and Three.js (browser APIs required)
- PostCSS with `@tailwindcss/postcss` for Tailwind v4 compilation
- 15 routes in production build (all statically prerendered where possible)

---

## 3. Backend Stack

| Technology | Version | Role |
|-----------|---------|------|
| Python | 3.12 | Runtime |
| FastAPI | 0.110+ | REST API framework |
| Uvicorn | 0.29+ | ASGI server |
| Pydantic | v2 | Request/response validation, data models |
| httpx | 0.27+ | Async HTTP client for NASA POWER calls |
| NumPy | 1.26+ | Numerical arrays, scientific computation |
| Pandas | 2.x | Time-series data manipulation |
| SciPy | 1.12+ | Gamma distribution fitting (SPI), statistical functions |
| pytest | 8.x | Test framework (87 unit & integration tests) |

---

## 4. API Route Inventory

### Backend Routes (FastAPI, port 8000)

| Method | Path | Module | Description |
|--------|------|--------|-------------|
| GET | `/api/health` | main.py | Service health check |
| GET | `/api/location/presets` | location.py | Global benchmark location presets |
| GET | `/api/location/validate` | location.py | Coordinate bounds & validity verification |
| POST | `/api/location/geocode` | location.py | Forward geocoding (place name → lat/lon) |
| GET | `/api/location/reverse-geocode` | location.py | Reverse geocoding (lat/lon → place name) |
| POST | `/api/field-intelligence/analyze` | field_intelligence.py | Full XAI field intelligence pipeline with NASA data |
| GET/POST | `/api/copilot/status`, `/chat` | copilot.py | Live OpenRouter AI chat with NASA context & fallback |
| POST | `/api/advisor/recommendations` | advisor.py | Rule-based agronomic recommendations |
| POST | `/api/scenarios/simulate` | scenarios.py | Farm Futures Lab climate scenario simulation |
| GET | `/api/change-detection/compare` | change_detection.py | Dual-window satellite change detection metrics |
| GET/POST | `/api/water/analysis` | water_intelligence.py | Smart Water Intelligence & FAO-56 balance |
| POST | `/api/phenology/detect` | phenology.py | Phenological curve & DOY event detection |
| POST | `/api/risk/regional` | risk_radar.py | Multi-region composite agricultural risk ranking |
| POST | `/api/field/boundary-analysis` | field_boundary.py | Spatial polygon boundary analysis |
| POST | `/api/reports/field-report` | reports.py | Markdown & PDF field intelligence report export |
| GET | `/api/power/point` | power.py | Raw daily NASA POWER meteorological telemetry |
| GET | `/api/vegetation/indices` | vegetation.py | Derived vegetation index series |
| GET | `/api/soil-moisture/profile` | soil_moisture.py | Root-zone & surface soil moisture profile |

### Frontend API Calls (Next.js, port 3000)

All calls originate from `src/lib/api.ts` (typed fetch client) targeting `http://127.0.0.1:8000`.

NASA GIBS WMTS tiles are fetched **directly in the browser** as map tile layer URLs — no backend proxy:
```
https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{layer}/default/{date}/GoogleMapsCompatible/{z}/{y}/{x}.jpg
```

---

## 5. Frontend Route Map

| Route | Page | Key Feature |
|-------|------|-------------|
| `/` | Homepage | Hero, capability cards, live intelligence preview |
| `/explorer` | Earth Explorer | 3D Globe (Three.js) + 2D GIBS Leaflet |
| `/time-machine` | Satellite Time Machine | GIBS multi-year time-lapse animation |
| `/change-detective` | Satellite Change Detective | Dual-panel synchronised GIBS comparison |
| `/farm-futures` | Farm Futures Lab | Climate scenario simulation workspace |
| `/advisor` | Farmer Action Copilot | Conversational agricultural AI |
| `/field-boundary` | Field Boundary Intelligence | Polygon draw + spatial analysis |
| `/risk-radar` | Regional Risk Radar | Multi-region composite stress ranking |
| `/analyze` | Field Intelligence Engine | XAI decomposition cards |
| `/reports` | Field Intelligence Dossier | PDF-exportable intelligence report |
| `/history` | Historical Climate Trends | Multi-decade climate charts |
| `/water-intel` | Smart Water Intelligence | FAO-56 water balance + dry spells |
| `/phenology` | Crop Phenology Tracker | DOY phenological curves |
| `/about` | Methodology & Science | Architecture, formulas, limitations |
| `/_not-found` | 404 | Standard Next.js not-found page |

---

## 6. NASA Data Flow

### NASA POWER Data Pipeline

```
1. Frontend request → POST /api/analysis/field {lat, lon, ...}
2. Backend → httpx.AsyncClient.get(
     "https://power.larc.nasa.gov/api/temporal/daily/point",
     params={
       "parameters": "T2M,PRECTOTCORR,WS10M,RH2M,GWETTOP,GWETROOT",
       "community": "AG",
       "longitude": lon,
       "latitude": lat,
       "start": start_date,
       "end": end_date,
       "format": "JSON"
     }
   )
3. POWER JSON → Pandas DataFrame (date index)
4. Science pipeline:
   a. spi.compute_spi(precip_series, timescale=3)      → SPI-3 drought index
   b. gdd.compute_gdd(tmax_series, tmin_series, 10.0)  → Growing Degree Days
   c. stress.compute_composite_stress(spi, ndvi_proxy, soil, temp_anomaly)
   d. crops.score_crops(gdd_total, precip_total, stress_score)
   e. phenology.detect_events(smoothed_ndvi_proxy)
5. Response JSON → Frontend (typed via src/lib/api.ts)
```

### NASA GIBS Data Flow

```
Browser Leaflet map → TileLayer URL template →
  gibs.earthdata.nasa.gov/wmts/epsg3857/best/
  {MODIS_Terra_CorrectedReflectance_Bands721|TrueColor|VIIRS_...}/
  default/{YYYY-MM-DD}/GoogleMapsCompatible/{z}/{y}/{x}.jpg

No backend proxy. All tile requests are direct browser → NASA CDN.
Tile availability: 2000-02-24 to present (product dependent).
```

---

## 7. Science Module Architecture

```
backend/app/science/
├── spi.py        — Standardised Precipitation Index (McKee et al., 1993)
│                   Gamma distribution fit, Blom transformation to normal
├── gdd.py        — Growing Degree Days (McMaster & Wilhelm, 1997)
│                   GDD = max(0, (Tmax+Tmin)/2 − Tbase)
├── stress.py     — Composite Agricultural Stress Score
│                   Weighted sum of 4 NASA-derived indicators
├── crops.py      — Crop Suitability Heuristic Ranking
│                   GDD, water need, drought tolerance thresholds
└── phenology.py  — Phenological Event Detection
                    Savitzky-Golay smoothed NDVI proxy, DOY peak/trough detection
```

---

## 8. 3D Globe Architecture (EarthGlobe3D.tsx)

The Three.js globe uses **procedural canvas textures** — no external asset files required:

| Layer | Implementation |
|-------|----------------|
| Earth surface | 2048×1024 canvas: ocean (blue gradient), land (green/brown noise), ice caps |
| Cloud layer | 2048×1024 canvas: Perlin-style noise ellipses, opacity 0.5, rotation drift |
| Atmosphere | `AdditiveBlending` sphere, Fresnel-style falloff for limb glow |
| Site markers | `SphereGeometry` with `MeshBasicMaterial` colour coded by stress |
| Camera | `PerspectiveCamera` + `OrbitControls`-style pointer events |
| Animation | `requestAnimationFrame` loop, auto-rotation, smooth fly-to interpolation |

**No CesiumJS / Ion API key required.** Self-contained, offline-capable.

---

## 9. PDF Export Architecture (reports/page.tsx)

```
1. User clicks "Export PDF"
2. html2canvas captures printableRef DOM element (canvas screenshot)
3. jsPDF creates new A4 document
4. Canvas image split into pages (A4 height = 297mm at 96dpi)
5. PDF saved as "field-intelligence-dossier.pdf" (browser download)
```

Client-side only — no server-side PDF rendering.

---

## 10. Universal Location & State Management

State is managed through a layered, SSR-compatible architecture:

1. **`LocationContext` (`src/context/LocationContext.tsx`)**:
   - Single source of truth for the active global agricultural field (`latitude`, `longitude`, `label`, `crop`, `source`).
   - Automatically synchronizes across all 12 modules (`/explorer`, `/analyze`, `/advisor`, `/farm-futures`, `/water-intel`, `/phenology`, `/risk-radar`, `/change-detective`, `/field-boundary`, `/reports`, `/time-machine`, `/history`).
   - Validates coordinates within physical bounds (`[-90, 90]` latitude, `[-180, 180]` longitude).
   - Persists user selections in `localStorage` (`agroscope_active_location`) and broadcasts updates via window storage events.
   - Global modal dialog (`<GlobalLocationModal />`) and banner (`<GlobalLocationBar />`) accessible anywhere via header navigation.

2. **Component-level State (`useState`, `useRef`, `useCallback`)**:
   - Manages interactive UI states (tab selection, animation frames, modal toggles, chart zoom).

3. **URL Search Parameters (`URLSearchParams`)**:
   - Enables direct deep-linking to coordinates, dates, and view modes (e.g. `?mode=3d`, `?lat=13.0827&lon=80.2707`).

4. **Zero State Desynchronization**:
   - Prevents stale benchmark context from leaking into arbitrary coordinate analyses.
   - Provides clear visual indicators when viewing custom field coordinates versus benchmark presets.
