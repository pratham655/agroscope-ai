# AGROSCOPE AI — Data Provenance

**NASA Space Apps Challenge 2026 — Problem #7: Field Shift**  
Version: 1.0.0 (Competition Freeze)

---

## Overview

AGROSCOPE AI uses exclusively **publicly available NASA Earth observation data**. No proprietary datasets, paywalled APIs or simulated/mock data are used in production. This document provides complete provenance for every data source integrated into the platform.

---

## 1. NASA POWER (Prediction Of Worldwide Energy Resources)

### Description
NASA POWER provides meteorological and climatological data derived from NASA satellite observations and reanalysis models. It is the primary data backbone of AGROSCOPE AI.

| Attribute | Value |
|-----------|-------|
| **Source** | NASA Langley Research Center (LaRC) |
| **Underlying models** | MERRA-2 (GEOS-5.12.4), GEOS-5 FP, CERES SYN1deg |
| **Spatial resolution** | 0.5° latitude × 0.625° longitude (~55 km at equator) |
| **Temporal coverage** | 1981–present (daily) |
| **Temporal resolution** | Daily |
| **API base URL** | `https://power.larc.nasa.gov/api/temporal/daily/point` |
| **Community** | `AG` (Agroclimatology) |
| **Format** | JSON |
| **Authentication** | None required (public) |
| **Terms of use** | NASA Open Data — no restrictions on non-commercial use |

### Variables Used

| Variable Code | Long Name | Units | Used For |
|--------------|-----------|-------|----------|
| `T2M` | Temperature at 2 metres | °C | GDD, thermal anomaly, ETo |
| `T2M_MAX` | Maximum temperature at 2 metres | °C | GDD computation |
| `T2M_MIN` | Minimum temperature at 2 metres | °C | GDD computation |
| `PRECTOTCORR` | Precipitation (bias-corrected) | kg/m²/day (= mm/day) | SPI-3, dry spell, water balance |
| `WS10M` | Wind speed at 10 metres | m/s | Advisory context |
| `RH2M` | Relative humidity at 2 metres | % | Water intelligence, ETo |
| `GWETTOP` | Surface soil wetness (top layer) | 0–1 (fraction of saturation) | Soil wetness stress component |
| `GWETROOT` | Root zone soil wetness | 0–1 | Root zone water availability |
| `GWETPROF` | Profile soil wetness | 0–1 | Deep soil water context |

### Example API Call
```
GET https://power.larc.nasa.gov/api/temporal/daily/point
  ?parameters=T2M,PRECTOTCORR,WS10M,RH2M,GWETTOP,GWETROOT,GWETPROF
  &community=AG
  &longitude=75.87
  &latitude=30.90
  &start=20230101
  &end=20231231
  &format=JSON
```

### Citation
Stackhouse, P. W., Jr., et al. (2018). *NASA POWER: Prediction of Worldwide Energy Resource, the renewable energy and meteorology component.* Proceedings of ISES Solar World Congress 2017. DOI: 10.18086/swc.2017.19.02

---

## 2. NASA GIBS — Global Imagery Browse Services

### Description
NASA GIBS provides access to over 1,000 satellite imagery layers via the WMTS (Web Map Tile Service) standard. AGROSCOPE AI uses GIBS for all interactive map imagery, the Satellite Time Machine and the Change Detective.

| Attribute | Value |
|-----------|-------|
| **Source** | NASA Earthdata / EOSDIS |
| **Protocol** | WMTS (OGC standard) |
| **Projections** | EPSG:3857 (WebMercator) used by AGROSCOPE AI |
| **API base URL** | `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/` |
| **Tile format** | JPEG (imagery), PNG (overlays) |
| **Authentication** | None required (public) |
| **Terms of use** | NASA Open Data |

### WMTS URL Template
```
https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{layer}/default/{YYYY-MM-DD}/GoogleMapsCompatible/{z}/{y}/{x}.jpg
```

### Layers Used in AGROSCOPE AI

| Layer Identifier | Product Name | Resolution | Sensor | Temporal Coverage |
|-----------------|-------------|-----------|--------|-------------------|
| `MODIS_Terra_CorrectedReflectance_Bands721` | Terra MODIS Bands 7-2-1 (Agricultural False Colour) | 250m | Terra MODIS | 2000-02-24 to present |
| `MODIS_Terra_CorrectedReflectance_TrueColor` | Terra MODIS True Colour | 250m | Terra MODIS | 2000-02-24 to present |
| `VIIRS_SNPP_CorrectedReflectance_TrueColor` | VIIRS/S-NPP True Colour | 375m | Suomi NPP VIIRS | 2015-11-24 to present |
| `MODIS_Aqua_CorrectedReflectance_TrueColor` | Aqua MODIS True Colour | 250m | Aqua MODIS | 2002-07-04 to present |

### Band Interpretation (Bands 7-2-1)
The Bands 7-2-1 false-colour composite is designed specifically for **agricultural land cover discrimination**:
- **Red channel (Band 7, 2.1 μm — SWIR)**: Sensitive to vegetation moisture and soil
- **Green channel (Band 2, 0.86 μm — NIR)**: Vegetation reflectance (healthy vegetation = bright)
- **Blue channel (Band 1, 0.65 μm — Red)**: Chlorophyll absorption

**In this composite:**
- Healthy vegetation → bright green
- Stressed/sparse vegetation → brownish
- Bare soil → tan/pink
- Water bodies → dark blue/black
- Irrigated fields → vivid bright green

### Citation
NASA EOSDIS GIBS (2024). *Global Imagery Browse Services (GIBS) API for Developers.* Earthdata Wiki. Retrieved from https://nasa-gibs.github.io/gibs-api-docs/

---

## 3. MERRA-2 — Modern-Era Retrospective Analysis for Research and Applications

### Description
MERRA-2 is a NASA atmospheric reanalysis system (GEOS-5 model assimilating satellite observations). It is the underlying model for most POWER variables used in AGROSCOPE AI.

| Attribute | Value |
|-----------|-------|
| **Source** | NASA GMAO (Global Modeling and Assimilation Office) |
| **Model** | GEOS-5.12.4 |
| **Spatial resolution** | 0.5° × 0.625° (~55 km) |
| **Temporal coverage** | 1980-01-01 to present |
| **Assimilation** | MODIS aerosols, AMSR-E/2, GMI, MLS, OMI, MLS, GPS-RO, PIBAL, radiosonde |

### MERRA-2 Variables Used (via POWER)

| MERRA-2 Variable | POWER Code | Description |
|-----------------|-----------|-------------|
| `GWETTOP` | `GWETTOP` | Land surface model top-layer soil wetness |
| `GWETROOT` | `GWETROOT` | Land surface model root zone soil wetness |
| `GWETPROF` | `GWETPROF` | Land surface model profile soil wetness |

### Citation
Gelaro, R., et al. (2017). The Modern-Era Retrospective Analysis for Research and Applications, Version 2 (MERRA-2). *Journal of Climate*, 30(14), 5419–5454. DOI: 10.1175/JCLI-D-16-0758.1

---

## 4. GPM IMERG — Global Precipitation Measurement

### Description
GPM IMERG provides global precipitation estimates by merging microwave, infrared and gauge data. AGROSCOPE AI accesses IMERG data indirectly through NASA POWER's `PRECTOTCORR` bias-corrected precipitation, which blends IMERG with MERRA-2.

| Attribute | Value |
|-----------|-------|
| **Source** | NASA GSFC / JAXA |
| **Resolution** | 0.1° × 0.1° (~10 km) — resampled to 0.5° in POWER |
| **Temporal coverage** | 2000-06-01 to present |
| **Latency** | Final Run: ~3.5 months; Late Run: ~12 hours |

### Citation
Huffman, G. J., et al. (2019). NASA Global Precipitation Measurement (GPM) Integrated Multi-satellitE Retrievals for GPM (IMERG). *Algorithm Theoretical Basis Document*, Version 06.

---

## 5. Geocoding (Reverse Geocoding)

### Description
AGROSCOPE AI uses **OpenStreetMap Nominatim** (open-source, no API key required) for reverse geocoding (latitude/longitude → human-readable place name).

| Attribute | Value |
|-----------|-------|
| **Source** | OpenStreetMap Foundation |
| **Endpoint** | `https://nominatim.openstreetmap.org/reverse` |
| **Data** | OpenStreetMap contributors |
| **License** | ODbL (Open Database Licence) |
| **Usage policy** | Maximum 1 request/second (respected by AGROSCOPE AI) |

---

## 6. Basemap Tiles (Leaflet Default)

The default Leaflet basemap uses **OpenStreetMap** tiles:
```
https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```
© OpenStreetMap contributors. ODbL licence.

---

## 7. Data Freshness and Latency

| Dataset | Approximate Latency |
|---------|---------------------|
| NASA POWER (climatology) | 3–5 day lag from real-time |
| NASA GIBS MODIS Terra | ~1 day |
| NASA GIBS VIIRS | ~1 day |
| OpenStreetMap Nominatim | Real-time |

AGROSCOPE AI fetches recent data at request time. No data is cached on-disk between sessions.

---

## 8. Data Limitations and Disclaimers

1. **Spatial resolution**: NASA POWER data at 0.5° × 0.625° resolution cannot capture sub-field variability. Results represent grid-cell averages (~55 km × 55 km).

2. **Temporal gaps**: GIBS imagery may contain cloud-obscured tiles on specific dates. AGROSCOPE AI does not perform cloud masking or gap-filling on GIBS tiles.

3. **MERRA-2 soil wetness**: GWETTOP/GWETROOT represent land surface model outputs, not direct soil measurements. They may differ from in-situ sensor readings.

4. **POWER bias correction**: PRECTOTCORR is gauge-adjusted but may still contain regional biases in data-sparse areas (central Africa, polar regions, some Pacific islands).

5. **No real-time sensor data**: AGROSCOPE AI does not integrate IoT soil sensors, weather station networks or in-situ crop monitoring data.

6. **No proprietary data**: AGROSCOPE AI uses exclusively publicly available NASA and OpenStreetMap data. No commercial satellite data (Planet, Maxar, Sentinel-2 without credentials) is used.
