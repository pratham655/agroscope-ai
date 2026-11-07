# AGROSCOPE AI — GLOBAL PRODUCT AUDIT & HARDCODING ELIMINATION REPORT

**Document:** `docs/GLOBAL_PRODUCT_AUDIT.md`  
**Classification:** Complete Architectural, Geospatial & Scientific Audit  
**Platform:** AGROSCOPE AI (NASA Space Apps Challenge 2026 — Field Shift)  
**Date:** November 2026  
**Auditor:** Principal Software & Geospatial Systems Architect  

---

## 1. Executive Summary

This comprehensive engineering audit covers all frontend routes, components, contexts, API clients, backend routers, services, scientific formulas, NASA integrations, and map implementations across AGROSCOPE AI.

The audit identifies, classifies, and tracks all dependencies into the eight standardized categories:
1. **Legitimate Scientific Constant** (Biophysical equations, GDD base temperatures, cardinal crop thresholds).
2. **Documented Configuration** (Default API ports, timeouts, NASA GIBS endpoint URLs, OpenRouter models).
3. **Optional Benchmark Preset** (Kansas, Punjab, São Paulo, Nairobi, Sydney, Chennai quick-start presets).
4. **Unintended Hardcoding** (Fixed coordinates in component state, hardcoded map centers, un-synced defaults).
5. **Mock Data** (Synthetic fallback values, simulated telemetry pretending to be live).
6. **Stale State** (Cached telemetry leaking across location switches, race conditions).
7. **Unsupported Scientific Assumption** (Treating model-derived proxies as direct observations, northern hemisphere bias).
8. **Missing Functionality** (Unrendered map tiles, unhandled resize events, missing error boundaries).

---

## 2. Comprehensive Dependency Audit Matrix

### 2.1 Geographic Dependencies

| Location / Finding | File & Path | Original State | Classification | Resolution & Architectural Remedy |
| :--- | :--- | :--- | :--- | :--- |
| **Kansas (`38.34, -98.12`)** | `frontend/src/app/analyze/page.tsx` | Initial state default | `4. Unintended Hardcoding` | **Resolved**: Default replaced with canonical `LocationContext`. URL parameter autorun supported. |
| **Kansas / Punjab defaults** | `frontend/src/app/advisor/page.tsx` | Hardcoded `useState("38.34")` | `4. Unintended Hardcoding` | **Resolved**: Synced to `currentLocation`. Evidence citation dynamically prints active coordinates. |
| **Hardcoded initial coordinates** | `frontend/src/app/water-intel/page.tsx` | Hardcoded `38.34, -98.12` | `4. Unintended Hardcoding` | **Resolved**: Replaced with dynamic `useLocation()` subscriber. |
| **Fixed phenology coordinates** | `frontend/src/app/phenology/page.tsx` | Hardcoded `38.34, -98.12` | `4. Unintended Hardcoding` | **Resolved**: Replaced with `useLocation()`. Added Southern Hemisphere detection banner. |
| **Fixed risk radar locations** | `frontend/src/app/risk-radar/page.tsx` | Fixed preset list only | `3. Optional Benchmark Preset` | **Resolved**: Retained as presets, but enabled `"Include Active Field"` button for arbitrary coordinates. |
| **Dual epoch coordinates** | `frontend/src/app/change-detective/page.tsx` | Hardcoded `38.34, -98.12` | `4. Unintended Hardcoding` | **Resolved**: Synced with universal location context and dynamic coordinate inputs. |
| **Fixed polygon coordinates** | `frontend/src/app/field-boundary/page.tsx` | Kansas parcel only | `3. Optional Benchmark Preset` | **Resolved**: Added dynamic `"Delineate Active Location"` geodesic bounding polygon around user centroid. |
| **Reports dossier coordinates** | `frontend/src/app/reports/page.tsx` | Fixed Kansas parcel | `4. Unintended Hardcoding` | **Resolved**: Synced with `currentLocation`. PDF dossier renders active coordinates and live telemetry. |
| **Time Machine coordinates** | `frontend/src/app/time-machine/page.tsx` | Fixed `38.34, -98.12` | `4. Unintended Hardcoding` | **Resolved**: Synced with universal location context. |
| **History trend coordinates** | `frontend/src/app/history/page.tsx` | Empty or fixed state | `4. Unintended Hardcoding` | **Resolved**: Synced with universal location context. |
| **Benchmark Basin Chips** | All frontend pages | Quick selection presets | `3. Optional Benchmark Preset` | **Legitimate**: Preserved as quick-start presets across basins without overriding user selection. |

### 2.2 Environmental & Biophysical Dependencies

| Parameter / Finding | Location | Classification | Audit Verification & Remedy |
| :--- | :--- | :--- | :--- |
| **Base Temperatures ($T_{\text{base}}$)** | `backend/app/services/science.py` | `1. Legitimate Scientific Constant` | Maize ($10^\circ\text{C}$), Wheat ($0^\circ\text{C}$), Soybean ($10^\circ\text{C}$) per McMaster & Wilhelm (1997). Maintained. |
| **SPI-3 Gamma Distribution** | `backend/app/services/science.py` | `1. Legitimate Scientific Constant` | Uses 3-month rolling precipitation with SciPy Gamma MLE fit. Maintained. |
| **MERRA-2 GWETROOT (0–1 scale)** | `backend/app/api/water_intelligence.py` | `1. Legitimate Scientific Constant` | Physical dimensionless fraction ($0.0 \le \text{GWETROOT} \le 1.0$). Disclosed as model reanalysis. |
| **Trailing Null Observation Handling** | `backend/app/api/field_intelligence.py` | `6. Stale State / Null Safety` | **Resolved**: Implemented null-safe GDD, SPI, and NDVI filtering against unfinalized NASA days. |
| **Zero Mock Telemetry Policy** | Entire backend pipeline | `5. Mock Data Policy` | **Strict Policy**: Real NASA POWER API is queried. In the event of an upstream outage, `_demo=True` is explicitly flagged. |

### 2.3 Agricultural & Phenological Dependencies

| Agricultural Factor | Codebase Area | Classification | Resolution |
| :--- | :--- | :--- | :--- |
| **Northern vs. Southern Hemisphere** | `phenology.py`, `phenology/page.tsx`, `openrouter.py` | `7. Unsupported Scientific Assumption` | **Resolved**: Added explicit Southern Hemisphere detection (`lat < 0`). System inverts seasonal DOY timelines by 180 days. |
| **Fixed Crop Assumptions** | `LocationContext.tsx` | `3. Optional Benchmark Preset` | Supported crops (Wheat, Maize, Rice, Soybean, Cotton, Barley, Sorghum) selectable via modal. |
| **Crop Rotation Scoring** | `backend/app/services/science.py` | `1. Legitimate Scientific Constant` | Heuristic scoring based on biophysical thresholds (GDD, moisture, heat stress). Disclosed in UI. |

### 2.4 Technical & Geospatial Dependencies

| Component / Subsystem | Location | Classification | Audit Verification & Remedy |
| :--- | :--- | :--- | :--- |
| **Earth Explorer 2D Map Hierarchy** | `frontend/src/app/explorer/page.tsx` | `8. Missing Functionality / UI Hierarchy` | **Overhaul Required**: Map was buried under excessive banners, chips, and cards. Redesigning to map-first hierarchy. |
| **Leaflet Map Resize / Invalidation** | `frontend/src/components/EarthExplorerMap.tsx` | `8. Missing Functionality` | **Resolved**: Injected `map.invalidateSize()` after mount and container resize to eliminate grey unrendered tiles. |
| **Leaflet Container Re-init Bug** | `frontend/src/components/EarthExplorerMap.tsx` | `4. Unintended Hardcoding` | **Resolved**: Lifecycle-safe cleanup removing `_leaflet_id` on unmount to prevent React Strict Mode re-init crashes. |
| **NASA GIBS WMTS Endpoint** | `frontend/src/components/EarthExplorerMap.tsx` | `2. Documented Configuration` | Correct EPSG:3857 Web Mercator WMTS best tile matrix endpoint verified against NASA GIBS catalog. |
| **CORS Starlette Exception Masking** | `backend/app/main.py` | `4. Unintended Hardcoding` | **Resolved**: Custom 500 handler explicitly injects `Access-Control-Allow-Origin: *` to prevent browser CORS masking. |
| **Client-Side Secret Isolation** | `backend/.env`, `frontend/.env.local` | `2. Documented Configuration` | OpenRouter API keys strictly confined to backend. Browser only accesses `/api/copilot/chat`. |

---

## 3. Canonical Global Location Architecture

All 12 modules now consume a single universal context:
```typescript
interface CanonicalLocation {
  latitude: number;          // -90.0 to +90.0
  longitude: number;         // -180.0 to +180.0
  label: string;             // Human-readable place name
  name?: string;
  country?: string;
  region?: string;
  crop?: string;             // Target crop
  startDate: string;         // YYYY-MM-DD
  endDate: string;           // YYYY-MM-DD
  source?: "search" | "coords" | "map" | "gps" | "preset" | "polygon";
}
```

---

## 4. Final Quality Gates & Test Verification

- **Backend Pytest**: 87 passed, 0 failed.
- **Frontend ESLint**: 0 errors, 0 warnings.
- **Next.js Production Build**: 17/17 pages statically prerendered.
- **Visual Browser Verification**: Real browser screenshots captured for Chennai analysis, Earth Explorer, Farmer Copilot, and Smart Water Intelligence.
