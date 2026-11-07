# AGROSCOPE AI — 5-Minute Competition Demo Guide

**NASA Space Apps Challenge 2026 — Problem #7: Field Shift**  
**Tagline:** *OBSERVE. ANTICIPATE. ADAPT.*  
**Platform Version:** 1.2.0 (Global Intelligence Architecture)

---

## Demo Overview

This guide walks judges and evaluators through a complete 5-minute demonstration covering all three pillars of AGROSCOPE AI:
- **OBSERVE** (Stream planetary satellite imagery & analyze local fields anywhere on Earth)
- **ANTICIPATE** (Calculate physical drought indices, GDD curves, and climate scenario sensitivity)
- **ADAPT** (Actionable crop rotation recommendations and AI copilot grounded in NASA telemetry)

**Setup checklist before demo:**
- [ ] Backend running: `cd backend && python -m uvicorn app.main:app --port 8000`
- [ ] Frontend running: `cd frontend && pnpm start -- -p 3001` (or `pnpm dev` on port 3000)
- [ ] Internet connection active (NASA POWER + GIBS streaming require network)
- [ ] Browser window at 1920×1080 or 1440×900 resolution

---

## PART 1 — OBSERVE (1 min 30 sec)

### Step 1: Universal Global Location & Header (20 sec)
> *"AGROSCOPE AI is an enterprise-grade global agricultural intelligence platform powered by NASA Earth observations. Unlike static prototypes locked to benchmark cities, AGROSCOPE AI operates for any geographical coordinates on the planet."*

Point to the **top navigation bar**:
- Notice the **Active Field Pill** showing the current coordinates and crop (e.g., `Punjab Indo-Gangetic Basin • 30.7300°, 76.7800°`).
- Click the **Active Field Pill** to open the **Global Location Modal**.
- Show that users can search any city, enter arbitrary coordinates (e.g., `Chennai: 13.0827, 80.2707` or `Nairobi: -1.2921, 36.8219`), or click a quick preset.
- Close the modal or select a location.

---

### Step 2: Earth Explorer — Satellite Map Centerpiece (45 sec)
> *"Let's observe our target field from orbit using NASA Global Imagery Browse Services (GIBS)."*

Navigate to **Earth Explorer** (`/explorer`):
- **Map Centerpiece**: The 640px high-resolution satellite map immediately renders as the primary visual focus.
- **Layer Switcher**:
  - Switch between **Bands 7-2-1 False Color** (vegetation contrast), **MODIS TrueColor**, **NDVI 8-Day**, and **Land Surface Temperature**.
  - Show how healthy cropland glows vibrant green in false color.
- **Date Selector**: Scrub to previous agricultural seasons to observe historical vegetation density.
- **3D Globe Mode**:
  - Click the **3D Globe** toggle in the top control bar.
  - Show the WebGL Earth globe with atmospheric Rayleigh scattering and global breadbasket markers.
  - Click any preset to trigger an animated cinematic camera flight across the planet.
  - Toggle back to **2D Satellite Map**.

---

### Step 3: Satellite Time Machine & Change Detective (25 sec)
> *"We can also inspect multi-year temporal transformations."*

Briefly show **Satellite Time Machine** (`/time-machine`):
- Click **Play (▶)** to watch annual crop cycles pulse across the landscape from 2020 through 2024.
- Or open **Satellite Change Detective** (`/change-detective`) to demonstrate side-by-side synchronized comparison between two growing seasons.

---

## PART 2 — ANTICIPATE (2 min)

### Step 4: Field Intelligence Engine — NASA POWER Pipeline (50 sec)
> *"Now we anticipate agricultural risks with physical NASA Earth observation models."*

Navigate to **Field Intelligence Engine** (`/analyze`):
- The active field coordinates are already pre-populated from the universal `LocationContext`.
- (Optional): Enter custom coordinates (e.g. `13.0827, 80.2707` for Chennai or your own coordinates).
- Click **"Run Field Intelligence"**.
- In 2–4 seconds, the engine streams real-time data from the NASA POWER API.
- Point out the **Explainable AI (XAI) Stress Breakdown**:
  - 🌧️ **SPI-3 Drought Index (35%)**: 2-parameter Gamma distribution fit of 90-day precipitation anomalies.
  - 🌿 **Vegetation Health Proxy (30%)**: Derived from surface solar irradiance and moisture dynamics.
  - 💧 **Root-Zone Soil Wetness (20%)**: Physical volumetric fraction ($0.0 - 1.0$) from MERRA-2.
  - 🌡️ **Thermal Anomaly (15%)**: Temperature departure from the historical baseline.
- Scroll down to the **Crop Suitability Heuristics**:
  - Real-time compatibility ranking based on calculated Growing Degree Days (GDD) and water demand.

---

### Step 5: Farm Futures Lab — Climate Sensitivity Simulation (40 sec)
> *"How will this field fare under future climate change?"*

Navigate to **Farm Futures Lab** (`/farm-futures`):
- Point to the interactive climate scenario controls.
- Increase **Temperature (+2.5°C)** and decrease **Precipitation (−25%)**.
- Click **"Run Scenario Simulation"**.
- Observe the dynamic delta graphs:
  - Water deficit and drought risk intensify.
  - High-water crops (like paddy rice) drop in suitability score.
  - Climate-resilient alternatives (sorghum, millet, pulses) rise to the top.

---

### Step 6: Smart Water Intelligence (30 sec)
> *"Let's look at root-zone water balance."*

Navigate to **Smart Water Intelligence** (`/water-intel`):
- Show the FAO-56 dual crop coefficient water balance model.
- Inspect the **Soil Moisture Profile** (surface vs. root-zone) and the **Consecutive Dry-Days Risk Gauge**.

---

## PART 3 — ADAPT (1 min 30 sec)

### Step 7: Farmer Action Copilot — Live AI Agronomist (50 sec)
> *"Finally, we help farmers and regional planners adapt through actionable decision support."*

Navigate to **Farmer Action Copilot** (`/advisor`):
- Point to the **Active Field Context HUD** at the top:
  - The AI assistant is automatically grounded with the field's actual coordinates, climate zone, current SPI drought score, soil moisture, and active crop.
- Type a realistic agronomic query or click a quick prompt:
  - *"Given the current soil moisture and precipitation trends, what cover crop or rotation strategy should I adopt for the next season?"*
- Observe the streaming AI response:
  - Notice specific references to the real NASA telemetry (e.g., current SPI level, root-zone moisture percentage).
  - Highlights specific drought-tolerant cultivars, planting calendar shifts, and irrigation conservation techniques.
- Point out the **Model & Grounding Badge**:
  - Confirms OpenRouter LLM execution with full telemetry provenance.

---

### Step 8: Field Intelligence Dossier & PDF Export (40 sec)
> *"Every analysis can be exported as an executive report for agronomists, extension officers, or insurers."*

Navigate to **Field Intelligence Dossier** (`/reports`):
- Review the assembled report with executive risk score, climate charts, crop rotation matrix, and NASA data provenance disclosures.
- Click **"Export PDF"** to generate an immediate, clean, multi-page PDF document.

---

## Conclusion (10 sec)
> *"AGROSCOPE AI transforms raw NASA satellite pixels and climate reanalysis into actionable, localized agricultural intelligence for any field on Earth. Observe. Anticipate. Adapt."*
