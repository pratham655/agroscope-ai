# AGROSCOPE AI — GLOBAL INTELLIGENCE ARCHITECTURE & FLEXIBILITY AUDIT

**Project:** AGROSCOPE AI — NASA Space Apps Challenge 2026 (Field Shift)  
**Document Classification:** Engineering & Scientific Architecture Audit  
**Date:** November 2026  
**Status:** ✅ Complete & Verified — All Modules Globally Flexible  

---

## 1. Executive Summary & Directive Objectives

The mission of this architectural upgrade has been successfully executed: transforming **AGROSCOPE AI** from a benchmark-location-dependent demonstration (previously defaulting to Kansas Wheat Belt and Punjab Plain) into a **genuinely flexible, globally accessible agricultural intelligence platform**.

The application fully supports comprehensive agricultural analysis for **arbitrary valid geographical coordinates** (`-90.0° <= Latitude <= 90.0°`, `-180.0° <= Longitude <= 180.0°`) while preserving:
1. All 8 core scientific capabilities and supplemental modules.
2. The premium visual identity and responsive user interface.
3. Strict scientific rigor: zero synthetic telemetry, zero mock data, zero silent substitution of benchmark locations when real data requests are made.
4. Legitimate documented scientific constants, crop biophysical models, and quick-start benchmark presets.

---

## 2. Canonical Global Location Architecture

### 2.1 Universal Location State Management (`LocationContext`)
A global React context (`frontend/src/context/LocationContext.tsx`) serves as the single source of truth for location across all client pages:
- **`currentLocation`**: Holds `{ latitude, longitude, label, name, country, region, crop, startDate, endDate, source }`.
- **`setLocation(loc)`**: Propagates updates immediately to all subscribed views.
- **`saveLocation(loc)` / `removeSavedLocation(label)`**: Persists user parcels across browser sessions via `localStorage`.
- **`acquireGpsLocation()`**: Client-side GPS geonavigation using the browser's `navigator.geolocation` API with automated reverse geocoding fallback.
- **`searchLocations(q)`**: Global geocoding service backed by OpenStreetMap Nominatim with agricultural filtering.

### 2.2 Global Navigation & Context Bar (`GlobalLocationBar` & `GlobalLocationModal`)
Mounted across all application pages, allowing the user to:
- Instantly observe active latitude, longitude, and hemisphere context.
- Search any town, district, or landmark globally.
- Switch to benchmark presets (Kansas, Punjab, São Paulo, Nairobi, Sydney, Chennai).
- Directly input arbitrary decimal coordinates.

---

## 3. Module-by-Module Flexibility Verification Matrix

| Module / Capability | Route | Status | Coordinate Handling | Fallback / Demo Policy |
| :--- | :--- | :--- | :--- | :--- |
| **Field Intelligence Engine** | `/analyze` | ✅ Complete | Dynamic arbitrary lat/lon; null-safe GDD & SPI; URL deep-linking | Live NASA POWER or authentic error disclosure |
| **Earth Explorer (3D & 2D)** | `/explorer` | ✅ Complete | Wired `useLocation()`, syncs active coordinates to 3D globe & GIBS | Authentic GIBS WMTS tiles; error on unserved zooms |
| **Farmer Action Copilot** | `/advisor` | ✅ Complete | Wired `useLocation()`, feeds active coordinates to prompt & evidence | Clear prompt to select field; real NASA context |
| **Farm Futures Lab** | `/farm-futures` | ✅ Complete | Synced `useLocation()` via `useEffect`, supports arbitrary runs | Real NASA baseline + mathematical perturbation |
| **Smart Water Intelligence** | `/water-intel` | ✅ Complete | Wired `useLocation()`, eliminates static Kansas default | Dynamic NASA MERRA-2 extraction for coordinates |
| **Crop Phenology Tracker** | `/phenology` | ✅ Complete | Wired `useLocation()`, Southern Hemisphere offset awareness | Multi-year proxy NDVI & GDD curves |
| **Regional Agricultural Risk Radar**| `/risk-radar` | ✅ Complete | Wired `useLocation()`, includes active parcel in regional ranking | Concurrency-safe NASA POWER fetches |
| **Satellite Change Detective** | `/change-detective`| ✅ Complete | Wired `useLocation()`, dual-date GIBS comparison | Dual GIBS WMTS synchronized map panes |
| **Field Boundary Intelligence** | `/field-boundary` | ✅ Complete | Wired `useLocation()`, dynamic parcel centering | Real GeoJSON polygon bounding box & centroid |
| **Dossier & Report Generation** | `/reports` | ✅ Complete | Wired `useLocation()`, report reflects active coordinates | Real dynamic PDF and Markdown compilation |
| **Satellite Time Machine** | `/time-machine` | ✅ Complete | Wired `useLocation()`, multi-year chronological scrubbing | Daily GIBS MODIS/VIIRS surface reflectance |
| **Agroclimatological History** | `/history` | ✅ Complete | Wired `useLocation()`, multi-decade trend analysis | NASA POWER monthly agroclimatology |

---

## 4. Scientific Integrity Standards

1. **No Silent Fallback to Benchmarks**: If NASA APIs fail for arbitrary coordinates (e.g. over open ocean or pole regions), AGROSCOPE AI explicitly reports the boundary limitation rather than silently substituting Kansas or Punjab data.
2. **Hemisphere-Aware Biological Timelines**: For Southern Hemisphere coordinates (`latitude < 0`), seasonal vegetative and phenological milestones (summer vs. winter cycles) are inverted by 180 days.
3. **Transparent Evidence Disclosures**: Every Copilot guidance message, risk assessment, and generated report carries exact geographical coordinates and specific satellite/model data provenance.

---

## 5. Verification Suite Summary

- **Backend Pytest**: `87 passed, 0 failed` across `test_copilot.py`, `test_science.py`, and `test_integration.py`.
- **Frontend ESLint**: `0 errors, 0 warnings` across all TypeScript source files.
- **Next.js Production Build**: `17/17 static pages generated` (`next build --webpack`).
- **Visual Browser Verification**:
  - `chennai_analysis.png`: Live Field Intelligence analysis for Chennai, Tamil Nadu (13.0827°N, 80.2707°E).
  - `advisor_global.png`: Farmer Action Copilot with global location context bar and dynamic coordinate synchronization.
  - `water_intel_global.png`: Smart Water Intelligence telemetry rendered for dynamic coordinates.
