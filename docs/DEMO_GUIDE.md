# AGROSCOPE AI — 5-Minute Competition Demo Guide

**NASA Space Apps Challenge 2026 — Problem #7: Field Shift**  
Tagline: *OBSERVE. ANTICIPATE. ADAPT.*

---

## Demo Overview

This guide walks judges through a complete 5-minute demonstration covering all three pillars of AGROSCOPE AI: **OBSERVE** (see the planet), **ANTICIPATE** (understand risk), **ADAPT** (take action).

**Setup checklist before demo:**
- [ ] Backend running: `cd backend && python -m uvicorn app.main:app --port 8000 --reload`
- [ ] Frontend running: `cd frontend && pnpm dev` → open `http://localhost:3000`
- [ ] Internet connection active (NASA POWER + GIBS require network)
- [ ] Browser DevTools closed (clean presentation)
- [ ] Screen at 1920×1080 or larger

---

## PART 1 — OBSERVE (1 min 30 sec)

### Step 1: Homepage Introduction (20 sec)
> *"AGROSCOPE AI is a global agricultural intelligence platform built on NASA Earth observation data — combining real-time satellite imagery, climate science and explainable AI to help farmers and decision-makers adapt to climate change."*

Point to the **homepage** (`http://localhost:3000`):
- Read the tagline: **OBSERVE. ANTICIPATE. ADAPT.**
- Briefly scan the 9 capability cards
- Click **"Launch Earth Explorer"**

---

### Step 2: 3D Earth Globe (40 sec)
> *"We start by observing the Earth. This is a live 3D globe built with NASA-sourced texture data."*

On the **Earth Explorer** page (`/explorer`):
- The 3D globe auto-rotates — drag to spin it manually
- Point out the **agricultural site markers** coloured by stress level
  - Green = low stress | Red = extreme stress
- Click **"Punjab, India"** in the right-side breadbasket drawer
  - Globe flies to Punjab with smooth camera animation
- Note the coordinate HUD updating in real-time

> *"The globe shows 10 global breadbasket regions, colour-coded by current agricultural stress derived from NASA MERRA-2 data."*

- Click the **"2D Satellite"** toggle
- The view switches to live NASA GIBS satellite tiles

---

### Step 3: Satellite Time Machine (30 sec)
> *"Now let's travel through time using NASA satellite imagery."*

Navigate to **Satellite Time Machine** (`/time-machine`) from the navigation:

- Click **"Punjab Breadbasket"** preset → map centres on Punjab, India
- Click **▶ Play** — the time-lapse begins, stepping through 2021→2024
- Point to seasonal vegetation changes (green pulses = growing seasons)

> *"This is real NASA GIBS imagery from Terra MODIS — the Bands 7-2-1 false-colour composite specifically designed for agricultural land cover detection. Healthy vegetation appears bright green."*

- Click the **Layer** switcher → switch to **TrueColor**
- Pause the animation

---

## PART 2 — ANTICIPATE (2 min)

### Step 4: Field Intelligence Engine — XAI Analysis (45 sec)
> *"Let's analyse this field in depth."*

Navigate to **Field Intelligence Engine** (`/analyze`):

- Coordinates are pre-populated (or enter 30.9, 75.9 for Punjab)
- Click **"Analyse Field"**
- Wait for NASA POWER API response (~3–5 seconds)

Point to the **XAI Stress Decomposition cards**:
> *"This is explainable AI. We show exactly what's driving agricultural stress — not a black-box score. Four indicators, each with their weight:"*
- 🌧️ **Drought Index (SPI-3)** — 35% weight — based on 3-month precipitation anomaly
- 🌿 **Vegetation Health Proxy** — 30% weight — derived from MERRA-2 environmental data
- 💧 **Soil Wetness** — 20% weight — MERRA-2 GWETTOP/GWETROOT variables
- 🌡️ **Thermal Anomaly** — 15% weight — temperature departure from 30-year baseline

> *"The composite stress score drives our crop suitability ranking below."*

---

### Step 5: Regional Risk Radar (30 sec)
> *"Let's zoom out and compare risk globally."*

Navigate to **Regional Risk Radar** (`/risk-radar`):

- Click **"Run Risk Assessment"** with default regions
- Wait for parallel NASA POWER fetches (~5–8 seconds)

Point to the **ranked heatmap table**:
> *"Five global breadbaskets ranked by composite stress. Punjab is compared to Kansas, the Nile Delta, the North China Plain and São Paulo."*

- Click **"Simulate"** next to the highest-stress region

---

### Step 6: Farm Futures Lab — Climate Scenario (45 sec)
> *"This takes us to our climate simulation workspace."*

On **Farm Futures Lab** (`/farm-futures`):
- Select Punjab from the location picker (or confirm coordinates)
- Click **"Load NASA Data"**

> *"Baseline conditions loaded from NASA POWER — real historical climate data for this location."*

- Adjust **Temperature slider** to **+2°C** (warming scenario)
- Adjust **Precipitation slider** to **−20%** (drought scenario)
- Click **"Run Simulation"**

Point to the comparison:
> *"The platform recalculates every indicator — SPI, GDD, crop suitability, water stress — under the simulated scenario and compares to baseline."*

> *"Note the crop suitability ranking shift: drought-tolerant sorghum and millet rise. Water-intensive rice falls."*

---

## PART 3 — ADAPT (1 min 30 sec)

### Step 7: Farmer Action Copilot (30 sec)
> *"Now let's help a farmer act on this intelligence."*

Navigate to **Farmer Action Copilot** (`/advisor`):

- Select Punjab coordinates
- Type: **"What crops should I plant given the drought risk this season?"**
- Click **Send**

> *"The Copilot synthesises NASA climate data, the XAI stress decomposition and agronomic knowledge to give a specific, cited recommendation — not generic advice."*

Point to the **evidence citations** in the response.

---

### Step 8: Field Intelligence Dossier + PDF Export (30 sec)
> *"Finally, we can generate a formal field intelligence dossier."*

Navigate to **Field Intelligence Dossier** (`/reports`):

- Coordinates auto-populate from previous session
- Click **"Generate Dossier"**

> *"This generates a complete field intelligence report with executive summary, NASA telemetry, XAI decomposition, crop suitability matrix and full data provenance."*

- Click **"Export PDF"**
- PDF downloads in browser

> *"A farmer, agronomist or government planner can share this PDF with their team — derived entirely from free, open NASA data."*

---

### Step 9: Closing Statement (30 sec)

Navigate back to **homepage**:

> *"AGROSCOPE AI demonstrates how NASA's open Earth observation data — POWER, GIBS, MERRA-2, MODIS, VIIRS — can be transformed into an accessible, actionable intelligence platform for agricultural adaptation.*

> *We observe the planet through real NASA satellite imagery. We anticipate stress through NASA-powered climate science and explainable AI. And we help farmers and communities adapt — one field at a time.*

> *OBSERVE. ANTICIPATE. ADAPT."*

---

## Quick Reference — Key URLs

| Feature | URL |
|---------|-----|
| Homepage | `http://localhost:3000` |
| Earth Explorer (3D/2D) | `http://localhost:3000/explorer` |
| Satellite Time Machine | `http://localhost:3000/time-machine` |
| Change Detective | `http://localhost:3000/change-detective` |
| Farm Futures Lab | `http://localhost:3000/farm-futures` |
| Farmer Action Copilot | `http://localhost:3000/advisor` |
| Field Boundary Intelligence | `http://localhost:3000/field-boundary` |
| Regional Risk Radar | `http://localhost:3000/risk-radar` |
| Field Intelligence Engine | `http://localhost:3000/analyze` |
| Field Intelligence Dossier | `http://localhost:3000/reports` |
| Historical Climate Trends | `http://localhost:3000/history` |
| Smart Water Intelligence | `http://localhost:3000/water-intel` |
| Crop Phenology Tracker | `http://localhost:3000/phenology` |
| Methodology & Science | `http://localhost:3000/about` |
| Backend API Docs | `http://127.0.0.1:8000/api/docs` |

---

## Fallback Locations

If NASA POWER is slow, use these pre-tested coordinates:

| Location | Lat | Lon | Notes |
|----------|-----|-----|-------|
| Punjab, India | 30.9 | 75.9 | Primary demo location |
| Kansas, USA | 38.5 | −98.5 | Good wheat baseline |
| Nile Delta, Egypt | 31.0 | 31.0 | Often high stress |
| São Paulo, Brazil | −21.0 | −48.0 | Tropical agriculture |
| North China Plain | 38.0 | 115.0 | Wheat-maize system |

---

## Anticipated Judge Questions

**Q: Is this using real NASA data or simulated data?**  
A: All data is live. NASA POWER is queried in real-time for every analysis. NASA GIBS tiles are streamed live from NASA's Earthdata CDN. No data is pre-loaded or mocked.

**Q: Why isn't this using real NDVI?**  
A: We use an MERRA-2-derived vegetation health proxy clearly labelled as such throughout the app. Direct MODIS NDVI products (MOD13A1) require NASA Earthdata authentication. Our proxy correlates well with NDVI at coarse scales and is derived from physical NASA variables.

**Q: What would it take to scale this to production?**  
A: Backend would need: a database (PostgreSQL), caching layer (Redis for POWER responses), authentication, and deployment to cloud (GCP/AWS). Frontend is already production-build capable. The NASA API integrations scale well — POWER has no rate limit for research use.

**Q: How is this different from existing tools like CROP-MONITOR?**  
A: AGROSCOPE AI uniquely combines: (1) XAI decomposition showing which factors drive stress, (2) interactive 3D/2D visualization with real-time GIBS imagery, (3) conversational AI copilot, and (4) climate scenario simulation — all in one integrated platform accessible without login or subscription.
