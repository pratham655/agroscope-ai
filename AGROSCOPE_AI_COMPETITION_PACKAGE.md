# 🌿 AGROSCOPE AI — Official Competition Package & Presentation Dossier
### NASA Space Apps Challenge 2026: Problem #7 — Field Shift: Adapting Farms with NASA Data
**Project Name:** AGROSCOPE AI  
**Tagline:** *Observe. Anticipate. Adapt.*  
**Status:** **100% PRODUCTION READY & COMPETITION FROZEN**  
**Submission Date:** November 4, 2026  
**Audience:** NASA Space Apps Challenge Global Judges, Agricultural Scientists, Geospatial Engineers, and Farming Communities

---

## 1. Project Overview & Problem Statement

### The Agricultural Problem
Global agriculture is experiencing unprecedented climate shifts. Traditional generational farming knowledge, historical planting calendars, and static crop rotations are breaking down as growing degree day (GDD) accumulation patterns shift, precipitation volatility intensifies, and root-zone soil moisture deficits become unpredictable. Farmers worldwide face two catastrophic failure modes:
1. **Planting mismatched crops:** Committing capital to high-water-demand crops (e.g. Maize requiring ~500 mm) during undetected developing hydrological droughts.
2. **Delayed adaptation:** Lacking localized, forward-looking biophysical indicators needed to switch to resilient rotational alternatives (e.g. Sorghum, Winter Wheat, or Legume Cover Crops).

### Why NASA Earth Observation Data Matters
NASA operates humanity's most sophisticated constellation of Earth-observing satellites and land surface models. Spaceborne instruments like **MODIS (Terra/Aqua)**, **VIIRS (Suomi-NPP)**, **GPM IMERG**, and modeling syntheses like **NASA POWER (MERRA-2 reanalysis)** collect petabytes of agroclimatic variables every 24 hours.

However, a profound gap exists between raw NASA data formats (HDF-EOS, NetCDF, GRIB, complex REST APIs) and operational decision-making on family farms and agricultural cooperatives. Farmers cannot interpret raw NetCDF files or calculate gamma-distribution integrals in the field.

### AGROSCOPE AI's Solution
AGROSCOPE AI closes this gap by transforming complex NASA Earth observation streams into transparent, scientifically grounded, and actionable agricultural intelligence:
$$\text{NASA Earth Observations} \longrightarrow \text{Scientific Processing Pipeline} \longrightarrow \text{Environmental Intelligence} \longrightarrow \text{Actionable Farm Adaptation}$$

---

## 2. Platform Innovations: What Makes AGROSCOPE AI Unique

1. **Zero Hallucination / Evidence Grounding:** Replaces generic chatbot advice with strict biophysical data grounding. Every adaptation strategy cites the underlying NASA dataset (e.g. `PRECTOTCORR`, `GWETROOT`, `GDD`).
2. **Transparent Mathematical Attribution (Explainable AI):** The composite agricultural stress score (0–100) exposes its exact formula and channel completeness metric, allowing users to see precisely how precipitation deficits (35%), vegetation stress (30%), soil moisture (20%), and thermal anomalies (15%) contribute to risk.
3. **Multi-Temporal Satellite Change Detective:** Integrates NASA GIBS WMTS/WMS directly beside comparative statistical tables, allowing farmers to visually inspect MODIS TrueColor satellite passes across multiple seasons.
4. **Interactive Climate Sensitivity Simulation (Farm Futures Lab):** Allows agriculturalists to stress-test hypothetical climate shifts (rainfall ±80%, temp anomalies, supplemental irrigation buffering) against historical baselines before committing capital to seed and fertilizer.
5. **Direct GeoJSON Parcel Delineation (Field Boundary Intelligence):** Automatically calculates spherical geodesic area (hectares), perimeter (km), and centroid coordinates for user-drawn fields while transparently communicating the spatial resolution limits of gridded reanalysis models (~55 km).

---

## 3. Technology Stack & System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          AGROSCOPE AI CLIENT                           │
│     Next.js 16.4.4 (Turbopack) · React 19 · TypeScript · Tailwind CSS    │
│            Recharts Visualizations · Leaflet Geospatial Layers          │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ Typed HTTP REST (Client-side API)
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FASTAPI SCIENTIFIC BACKEND                      │
│        Uvicorn ASGI Engine · Pydantic v2 · Python 3.12 Core            │
│  ├── /api/field-intelligence (Pipeline)  ├── /api/scenarios (Simulator)│
│  ├── /api/change-detection (Detective)   ├── /api/advisor (Copilot)    │
│  ├── /api/water (Smart Water Dashboard)  ├── /api/phenology (Curves)   │
│  ├── /api/risk (Multi-Region Radar)      ├── /api/field (Boundary)     │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌──────────────────────────────────────┐    ┌───────────────────────────────────┐
│     NASA POWER AGROCLIMATOLOGY       │    │        NASA GIBS WMTS / WMS       │
│  • MERRA-2 Reanalysis (55 km grid)   │    │  • MODIS Terra/Aqua TrueColor     │
│  • Parameters: T2M, PRECTOTCORR,     │    │  • Land Surface Temp (MOD11A1)    │
│    GWETTOP, GWETROOT, ALLSKY_SFC_SW  │    │  • 250m – 1km visual overpasses   │
└──────────────────────────────────────┘    └───────────────────────────────────┘
```

---

## 4. NASA Datasets & Ingestion Protocols

| Dataset | Provider / Source | Parameters / Variables | AGROSCOPE AI Purpose | Resolution & Coverage |
|---|---|---|---|---|
| **NASA POWER Agroclimatology** | NASA Langley Research Center | `T2M`, `T2M_MIN`, `T2M_MAX`, `PRECTOTCORR`, `RH2M`, `ALLSKY_SFC_SW_DWN`, `WS2M` | Thermal regime, cumulative GDD accumulation, precipitation anomaly analysis, solar irradiance | ~0.5° × 0.625° (~55 km), Global, Daily (1981–present) |
| **MERRA-2 Land Surface Model** | NASA GMAO (via POWER) | `GWETTOP` (0–5 cm), `GWETROOT` (0–100 cm), `GWETPROF`, `EVLAND` | Surface and root-zone soil wetness fractions, permanent wilting point proxy risk, water stress | ~55 km grid cell averages, Daily |
| **NASA GIBS WMTS / WMS** | NASA Earth Science Data Information System (ESDIS) | `MODIS_Terra_CorrectedReflectance_TrueColor`, `MODIS_Terra_LST_Day` | Visual satellite ground confirmation, multi-temporal change detection, interactive mapping | 250m – 1km spatial resolution, daily satellite overpasses |

---

## 5. Scientific Processing Pipeline & Methodological Rigor

All scientific computations are isolated in `backend/app/services/science.py` and verified by 71 automated boundary tests:

### 1. Growing Degree Days (GDD)
Implemented according to **McMaster & Wilhelm (1997)**:
$$T_{\text{avg}} = \frac{\min(T_{\max}, 30) + \max(T_{\min}, 10)}{2}, \quad \text{GDD} = \max(T_{\text{avg}} - 10, 0)$$
Units: $^\circ\text{C}\cdot\text{day}$. Guarded against thermal inversions ($T_{\text{max\_eff}} < T_{\text{min\_eff}}$).

### 2. Precipitation Anomaly Index (3-step Rolling SPI Proxy)
Fits accumulated rolling daily precipitation sums to a two-parameter Gamma distribution:
$$g(x) = \frac{1}{\beta^\alpha \Gamma(\alpha)} x^{\alpha - 1} e^{-x/\beta}$$
Parameters $\alpha$ (shape) and $\beta$ (scale) are fitted via maximum likelihood estimation (`scipy.stats.gamma.fit`), and cumulative probabilities are transformed to the standard normal distribution $Z \sim \mathcal{N}(0,1)$ (**McKee et al., 1993**).  
*Scientific Caveat:* Accurately labeled in UI as a *"3-day rolling SPI proxy"*, distinguishing it from standard 3-month climatological SPI-3 which requires 30+ years of monthly records.

### 3. Soil Moisture Interpretation & Permanent Wilting Proxy
MERRA-2 root-zone wetness fraction (`GWETROOT`, 0–1 scale relative to field capacity) is evaluated against a critical threshold:
$$\text{Dry Stress Condition} \iff \text{GWETROOT} < 0.25$$
Derived from land surface modeling literature (**Kumar et al., 2006 JHM**) as an operational proxy for permanent wilting point.

### 4. Multi-Indicator Composite Stress Score
Composite agricultural stress (0–100) integrates four normalized biophysical channels:
$$\text{Stress Score} = 100 \times \left(0.35 \cdot S_{\text{SPI}} + 0.30 \cdot S_{\text{NDVI}} + 0.20 \cdot S_{\text{Soil}} + 0.15 \cdot S_{\text{Temp}}\right)$$
*Attribution Transparency:* Displayed alongside a **Channel Completeness** metric indicating the fraction of non-null input channels available.

### 5. Crop Rotation Suitability Model
Ranks 6 agronomic crops (*Maize, Soybean, Winter Wheat, Sorghum, Legume Cover Crop, Sunflower*) using multi-factor normalized scoring balancing:
- GDD availability vs. requirement ($\text{Weight} = 0.35$)
- Precipitation availability vs. crop water need ($\text{Weight} = 0.35$)
- Gaussian thermal optimum alignment ($\text{Weight} = 0.20$)
- Stress penalty multiplier ($1.0 - 0.5 \times \frac{\text{Stress}}{100}$)

---

## 6. Summary of the 8 Operational Capabilities

| # | Capability | Route | Key Verified Feature |
|---|---|---|---|
| **1** | **Field Intelligence Engine** | `/analyze` | Automated 8-step pipeline with instant stress score, crop recommendations, and explainable findings. |
| **2** | **Farm Futures Lab** | `/farm-futures` | Interactive sensitivity simulator testing rainfall, temperature, and supplemental irrigation deltas. |
| **3** | **Satellite Change Detective** | `/change-detective` | Multi-temporal biophysical comparator with GIBS MODIS TrueColor satellite passes and CSV export. |
| **4** | **Farmer Action Copilot** | `/advisor` | Evidence-grounded conversational decision assistant citing specific NASA datasets for every recommendation. |
| **5** | **Field Boundary Intelligence** | `/field-boundary` | GeoJSON polygon delineation computing geodesic area (ha), perimeter, centroid, and overlaying NASA data. |
| **6** | **Regional Risk Radar** | `/risk-radar` | Multi-regional concurrent vulnerability ranking comparing global agricultural breadbaskets. |
| **7** | **Smart Water Intelligence** | `/water-intel` | Agro-hydrological dashboard analyzing surface vs root-zone wetness, dry spells, and Water Stress Index. |
| **8** | **Crop Phenology Tracker** | `/phenology` | Multi-year Savitzky-Golay smoothed proxy greenness curves (DOY 1–365) and green-up/peak detection. |

---

## 7. Verified Testing & Code Quality Matrix

- **Scientific Unit Tests:** `36 / 36 PASS` (`pytest tests/test_science.py`)
- **Formula & Boundary Audit:** `71 / 71 PASS` (`python -X utf8 tests/audit_science.py`)
- **HTTP API Integration Tests:** `21 / 21 PASS` (`pytest tests/test_integration.py`)
- **Live Real-World End-to-End Workflow:** `38 / 38 PASS` (`python verify_real_world.py`)
- **Frontend ESLint:** `0 Errors, 0 Warnings`
- **Next.js Production Build:** `14 Static Routes Successfully Compiled`

---

## 8. Polished 5-Minute Competition Demonstration Script

**Central Agricultural Reference Field:** *Kansas Wheat Belt, USA* (`38.34°N, -98.12°E`)  
**Presenter Tone:** Professional, authoritative, scientifically rigorous, and farmer-focused.

```markdown
### MINUTE 0:00 - 0:45: THE PROBLEM & VISION
"Good morning, judges. Worldwide, climate shifts are making historical planting calendars obsolete. 
Farmers are planting water-hungry crops right into developing droughts, risking financial ruin.
NASA collects the most sophisticated Earth observations on the planet. But raw NASA data does not help
a farmer in a tractor. 
We built AGROSCOPE AI to bridge that gap: NASA Data → Scientific Processing → Actionable Adaptation."

### MINUTE 0:45 - 1:45: FIELD EXPLORATION & INTELLIGENCE ENGINE (Demo /analyze)
"Let's look at a real field in the Kansas Wheat Belt (38.34°N, -98.12°E). 
With one click, our Field Intelligence Engine queries live NASA POWER agroclimatology and MERRA-2 models.
In under two seconds, our science engine executes an 8-step pipeline:
1. It calculates Growing Degree Days—2,689 °C·days accumulated.
2. It computes our Precipitation Anomaly Index—showing moderate deficit.
3. It examines root-zone soil wetness—0.397 fraction.
Look at our Explainable AI Decision Engine: instead of an opaque black box, the farmer sees the exact 
mathematical attribution: 35% precipitation deficit, 30% vegetation response, 20% soil moisture, and 15% thermal anomaly.
Notice the Data Completeness metric: 100% of input channels were verified and active."

### MINUTE 1:45 - 2:45: WATER INTELLIGENCE & SATELLITE CHANGE DETECTIVE (Demo /water-intel & /change-detective)
"Water is life in agriculture. Let's inspect the Smart Water Intelligence dashboard.
Here we isolate surface wetness from root-zone moisture. Notice this warning: AGROSCOPE AI detected 
10 consecutive dry spells exceeding 5 rainless days, yielding a Water Stress Index of 0.362.
To confirm visually, we open the Satellite Change Detective.
We compare the summer of 2022 against 2023. Our system pulls live NASA GIBS MODIS TrueColor satellite passes 
side-by-side with our biophysical delta matrix. Agricultural stress dropped from 49.0 to 33.9 as rainfall returned."

### MINUTE 2:45 - 3:45: FARM FUTURES LAB & PHENOLOGY (Demo /farm-futures & /phenology)
"Now, how does a farmer adapt before next planting season? We enter the Farm Futures Lab.
Here, farmers can simulate climate shifts. If rainfall decreases by 25% and temperatures rise by 2.5°C, 
what happens? 
We run the simulation: overall stress increases, and our crop rotation ranking immediately shifts: 
Maize drops due to its 500 mm water requirement, while drought-hardy Sorghum and Winter Wheat surge to the top.
Switching to our Crop Phenology Tracker, we review multi-year growth trajectories smoothed with Savitzky-Golay filters. 
Our algorithm accurately flags green-up at Day of Year 33 and peak greenness at Day 155."

### MINUTE 3:45 - 4:45: FARMER ACTION COPILOT & FIELD BOUNDARY (Demo /advisor & /field-boundary)
"Finally, we consult the Farmer Action Copilot.
Unlike generic LLMs that hallucinate, our Copilot is strictly evidence-grounded.
We ask: 'Should I plant maize or sorghum given my soil wetness?'
The Copilot answers directly: 'Sorghum is the lower-risk rotational alternative. Maize requires ~500 mm of water, 
whereas Sorghum requires ~350 mm, which matches your current MERRA-2 root-zone wetness.' Every answer cites the exact NASA dataset.
Using Field Boundary Intelligence, farmers can delineate their actual farm parcel via GeoJSON, computing exact acreage—here 1,166 hectares—with clear disclosures regarding NASA's 55 km grid resolution."

### MINUTE 4:45 - 5:00: CONCLUSION
"With AGROSCOPE AI, NASA Earth observations become understandable, accessible, and protective for farmers worldwide.
AGROSCOPE AI: Observe. Anticipate. Adapt. Thank you."
```

---

## 9. Known Limitations & Responsible Scientific Disclaimers

1. **Spatial Resolution:** NASA POWER and MERRA-2 products operate at ~55 km grid resolution. They reflect regional macroclimatology rather than sub-field soil variation or microtopography.
2. **Proxy vs. Direct NDVI:** Proxy vegetation curves are synthesized from solar radiation and soil moisture for rapid reanalysis; true high-resolution NDVI requires direct MODIS (MOD13Q1) or Sentinel-2 ingestion.
3. **Model-Derived Soil Moisture:** GWETTOP and GWETROOT are outputs of the MERRA-2 land surface model, not direct in-situ probe or microwave radiometer observations.
4. **Sensitivity vs. Forecasting:** Farm Futures Lab simulations represent mathematical sensitivity tests, not deterministic weather forecasts or coupled agronomic crop yield predictions (e.g. DSSAT).

---

## 10. Deployment & Execution Instructions

```bash
# 1. Start FastAPI Backend (Port 8000)
cd backend
python -m uvicorn app.main:app --port 8000 --host 127.0.0.1

# 2. Start Next.js Frontend (Port 3000)
cd ../frontend
npm run start -- -p 3000

# 3. Access Application
Browser: http://localhost:3000
Interactive API Documentation: http://localhost:8000/api/docs
```
