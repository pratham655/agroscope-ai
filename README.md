# AGROSCOPE AI

### Observe. Anticipate. Adapt.

**A Global Agricultural Intelligence Platform Powered by Earth Observation, Geospatial Analytics and Artificial Intelligence**
**Live Application:** [https://agroscope-ai-nine.vercel.app/](https://agroscope-ai-nine.vercel.app/)
**Backend API:** [https://agroscope-ai.onrender.com/](https://agroscope-ai.onrender.com/)
**GitHub Repository:** [https://github.com/pratham655/agroscope-ai](https://github.com/pratham655/agroscope-ai)

---

## 1. Introduction

Agriculture is increasingly influenced by changing climatic conditions, irregular precipitation, water availability, vegetation dynamics and regional environmental variability. Understanding these factors requires more than looking at individual weather measurements or satellite images.

Agricultural decision-making benefits from the ability to bring environmental datasets together, examine changes over time, identify potential risk indicators and interpret the results in a meaningful context.

**AGROSCOPE AI** is a global agricultural intelligence platform designed to bridge this gap.

It combines NASA Earth-observation imagery, NASA POWER agroclimatic datasets, MERRA-2 model-derived environmental variables, geospatial exploration tools and an AI-assisted analytical layer into a unified application.

The platform allows users to explore geographical regions, examine agricultural and environmental indicators, investigate potential climate-related risks, compare satellite imagery across different periods and obtain contextual explanations through an AI assistant.

Rather than presenting environmental data as isolated measurements, AGROSCOPE AI aims to connect geographical information, temporal observations and analytical interpretation into a single workflow.

Its central philosophy is:

- **Observe:** Explore Earth-observation imagery and regional environmental conditions.
- **Anticipate:** Examine potential agricultural stress indicators, environmental patterns and scenario sensitivities.
- **Adapt:** Use contextual intelligence to understand findings and explore possible responses.

AGROSCOPE AI is intended as a decision-support and exploratory intelligence platform, not a replacement for field measurements, professional agronomic advice or validated agricultural forecasting systems.

---

## 2. The Problem

Agricultural intelligence involves several interconnected challenges.

### Fragmented environmental information

Satellite imagery, precipitation records, temperature measurements, soil-related variables and geographical information are often accessed through different platforms and services.

Understanding a particular region may require manually collecting information from multiple sources.

### Limited geographical and temporal context

A single environmental measurement does not necessarily explain agricultural conditions. Understanding regional behaviour requires examining multiple variables and comparing their changes over time.

### Difficulty interpreting environmental indicators

Raw environmental datasets are not always easy to interpret. Users may need to understand what a particular indicator represents, what its limitations are and whether a change is meaningful.

### Identifying potential agricultural risks

Changes in precipitation, temperature and model-derived soil wetness can provide useful environmental context. However, interpreting these variables independently may overlook important relationships.

### Turning information into understandable insights

Even when environmental data is available, converting it into understandable explanations and practical analytical questions remains a challenge.

**AGROSCOPE AI addresses these challenges by bringing geospatial exploration, environmental indicators, temporal comparisons and AI-assisted interpretation into one integrated platform.**

---

## 3. Our Solution

AGROSCOPE AI provides a collection of interconnected analytical workspaces that allow users to investigate agricultural conditions from different perspectives.

The platform combines:

1. Satellite imagery exploration.
2. Regional agroclimatic data analysis.
3. Field-level geographical boundary exploration.
4. Agricultural risk screening.
5. Water-related environmental intelligence.
6. Crop development and phenology exploration.
7. Historical satellite comparison.
8. Scenario-based agricultural sensitivity analysis.
9. AI-assisted interpretation and recommendations.
10. Reports and historical analysis.

A shared geographical context connects the workspaces, allowing users to investigate a region across different analytical modules without repeatedly starting from scratch.

The platform is designed around an important idea:

**Environmental intelligence becomes more useful when geographical context, time, multiple indicators and understandable interpretation are considered together.**

---

## 4. Platform Architecture

AGROSCOPE AI follows a modular full-stack architecture.

### Frontend — The Intelligence Interface

Built using Next.js 16, React 19 and TypeScript, the frontend provides the interactive experience through which users explore maps, inspect environmental information and interact with analytical workspaces.

Its responsibilities include:

- Geographical navigation and location selection.
- Interactive satellite imagery exploration.
- Visualization of environmental indicators.
- Temporal comparisons and analytical dashboards.
- Communication with backend APIs.
- AI assistant interaction.
- Sharing geographical context between modules.
- Displaying reports, historical information and analysis results.

**Frontend technologies:**

- Next.js 16 — application framework and routing.
- React 19 — interactive user interface.
- TypeScript — structured application development.
- Tailwind CSS v4 — styling and responsive layouts.
- Leaflet — interactive geographical maps.
- Recharts — analytical charts and data visualization.
- Three.js — 3D visualization capabilities.

### Backend — Data Processing and Intelligence Services

The backend is developed using Python and FastAPI.

It acts as the central service layer between the frontend, external environmental datasets and AI-assisted analytical capabilities.

Its responsibilities include:

- Receiving geographical and analytical requests.
- Retrieving regional environmental information.
- Processing and organizing scientific datasets.
- Preparing indicators for visualization.
- Supporting agricultural screening and scenario analysis.
- Providing API endpoints to frontend modules.
- Handling AI-assisted interpretation requests.
- Managing external service communication and fallback behaviour.

### AI Layer — Contextual Agricultural Interpretation

AGROSCOPE AI integrates an AI-assisted analytical layer using OpenRouter and Google's Gemini 2.5 Flash model.

The AI layer is designed to interpret relevant environmental context rather than simply generate generic agricultural responses.

It can use available geographical context, environmental indicators and change-detection information to help explain:

- What the available indicators represent.
- Which environmental patterns are visible.
- What changes between comparison periods.
- Which potential agricultural concerns deserve further investigation.
- What assumptions and limitations affect an interpretation.

The assistant is designed to distinguish between measured or retrieved data, model-derived indicators, heuristic screening results and assumptions.

This distinction is important because an AI-generated explanation should not present an uncertain environmental interpretation as a scientifically established conclusion.

---

## 5. Detailed Platform Modules

AGROSCOPE AI is organized into specialized workspaces. Each workspace addresses a different part of the agricultural intelligence workflow.

### 5.1 Earth Explorer

**Purpose: Explore the Earth through satellite imagery and geographical context.**

Earth Explorer provides a geographical interface for investigating locations through satellite imagery and map layers.

Users can explore different geographical regions and examine available imagery to understand the environmental context of an area.

Key capabilities:

- Interactive geographical exploration.
- Location-based navigation.
- Satellite imagery layer visualization.
- Temporal imagery exploration where supported by the selected layer.
- Integration of NASA GIBS imagery.
- Geographical context through mapping services.

This module provides the visual foundation for the rest of the platform.

### 5.2 Field Intelligence

**Purpose: Investigate environmental conditions associated with a selected location.**

Field Intelligence brings together regional environmental variables to provide a structured overview of the selected geographical area.

Users can investigate available agroclimatic information and derived indicators to better understand environmental conditions.

Key analytical areas include:

- Temperature-related information.
- Precipitation patterns.
- Model-derived soil wetness.
- Environmental variability.
- Derived agricultural screening indicators.
- Location-specific analytical summaries.

The module helps users move from geographical exploration towards structured environmental investigation.

Important: the underlying regional datasets do not represent direct measurements from an individual farm.

### 5.3 Farmer Action Copilot

**Purpose: Convert environmental information into understandable analytical guidance.**

Farmer Action Copilot is the AI-assisted interpretation workspace.

It allows users to ask questions about agricultural conditions and receive explanations grounded in the environmental context available to the platform.

Examples of questions include:

- What environmental conditions should I investigate in this region?
- What does the available soil wetness information indicate?
- How have environmental indicators changed between two periods?
- Which indicators may suggest potential agricultural stress?
- What additional information would help validate this observation?

The Copilot is designed to consider available location context and analytical information when constructing responses.

It also supports contextual integration with Satellite Change Detective, allowing relevant change-detection information to be supplied to the assistant.

**Scientific guardrails:**

- A heuristic risk score is not a validated drought forecast.
- A reduction in a risk score does not independently establish recovery.
- A vegetation proxy must not automatically be interpreted as direct satellite-derived NDVI.
- Regional environmental information must not be presented as farm-level sensor measurements.
- AI-generated guidance should be interpreted alongside the underlying evidence and its limitations.

### 5.4 Farm Futures Lab

**Purpose: Explore how changing environmental assumptions may affect agricultural screening indicators.**

Farm Futures Lab provides a scenario-oriented environment for examining possible changes in agricultural conditions.

Instead of treating one set of environmental conditions as permanent, users can investigate how different assumptions affect analytical outputs.

This workspace supports exploratory sensitivity analysis.

Its purpose is to help users understand how changing selected inputs may influence screening results and highlight areas that deserve further investigation.

Scenario outputs are exploratory analytical results, not validated predictions of future crop yields or actual future weather conditions.

### 5.5 Smart Water Intelligence

**Purpose: Investigate water-related environmental conditions.**

Water availability and precipitation patterns are important components of agricultural environmental analysis.

Smart Water Intelligence provides a dedicated workspace for exploring available water-related variables and their geographical context.

It helps users investigate:

- Precipitation-related information.
- Available soil wetness indicators.
- Regional water-related environmental patterns.
- Temporal changes in available information.
- Potential areas requiring further investigation.

The module provides environmental context rather than direct groundwater measurements, irrigation-system telemetry or verified farm water balances.

### 5.6 Crop Phenology Tracker

**Purpose: Explore crop-development context and seasonal environmental patterns.**

Crop phenology describes the recurring stages of plant development throughout a growing season.

These stages can be influenced by temperature, precipitation, environmental conditions and seasonal variability.

Crop Phenology Tracker provides a dedicated workspace for examining crop-development context alongside available environmental information.

It is intended to support exploration of:

- Crop growth-stage context.
- Seasonal development patterns.
- Environmental conditions associated with crop development.
- Temporal interpretation of agricultural conditions.

The available indicators should not be interpreted as direct field observations of crop growth stages unless independently validated observations are available.

### 5.7 Regional Agricultural Risk Radar

**Purpose: Explore geographical patterns associated with potential agricultural risks.**

Agricultural risks can vary significantly between geographical regions.

Regional Agricultural Risk Radar provides a spatial perspective for examining available risk-related indicators.

The workspace supports the exploration of regional patterns and helps users identify areas that may warrant additional investigation.

Potential analytical dimensions include:

- Environmental stress indicators.
- Precipitation-related variability.
- Temperature-related conditions.
- Model-derived soil wetness.
- Combined screening indicators where supported by available data.

Risk outputs are screening-oriented and should not be interpreted as validated predictions of crop loss, drought severity or agricultural productivity.

### 5.8 Satellite Change Detective

**Purpose: Investigate changes in satellite imagery across different time periods.**

Satellite imagery can provide valuable visual context for examining how geographical areas appear at different points in time.

Satellite Change Detective provides a dedicated environment for comparing imagery and investigating visible changes.

Its analytical workflow focuses on:

- Selecting a geographical location.
- Comparing available imagery across different periods.
- Examining visible changes in the selected area.
- Reviewing available period-level indicators.
- Producing a structured interpretation of observed differences.

The module also connects with Farmer Action Copilot by supplying relevant change-detection context for further explanation.

This creates a workflow in which users can move from visual observation to AI-assisted interpretation.

**Important:** A visible difference between satellite images does not independently establish its cause. Cloud cover, image acquisition dates, sensor differences, seasonal conditions and image availability can influence comparisons.

### 5.9 Field Boundary Intelligence

**Purpose: Explore agricultural areas through geographical boundary analysis.**

Field Boundary Intelligence provides a workspace for examining geographical areas represented by user-defined or selected field boundaries.

Users can explore parcel geometry in a map-based environment and connect geographical boundaries with available regional environmental information.

Key capabilities include:

- Field boundary visualization.
- Polygon-based geographical exploration.
- Parcel area and perimeter calculations.
- Spatial context through map layers.
- Environmental context associated with the selected location.

The module helps bridge the gap between broad geographical exploration and the examination of specific agricultural areas.

**Important:** Parcel geometry measurements are approximate and should not be treated as cadastral survey measurements or legally verified land records.

### 5.10 Satellite Time Machine

**Purpose: Explore satellite imagery through a temporal perspective.**

Satellite Time Machine focuses on historical imagery exploration.

It allows users to examine how a selected geographical area appears across available imagery dates.

This provides a temporal perspective that complements the current geographical exploration experience.

The module supports investigation of:

- Historical satellite imagery.
- Available observation dates.
- Changes in visual environmental context.
- Temporal comparison of geographical areas.

Historical imagery availability depends on the selected layer, date, cloud conditions and underlying imagery service.

### 5.11 Reports and History

**Purpose: Organize analytical information and revisit previous investigations.**

Reports and History provide supporting workspaces for organizing and revisiting analytical activity.

Reports provide a structured way to present relevant findings, while History helps users return to previous analytical contexts where supported by the application.

Together, these workspaces support continuity between individual investigations and the broader agricultural intelligence workflow.

---

## 6. Data Sources and Scientific Foundation

AGROSCOPE AI integrates information from established geospatial and Earth-observation sources.

### NASA POWER

NASA POWER provides access to meteorological and solar-related data products.

Within AGROSCOPE AI, available agroclimatic variables provide regional environmental context for analytical workspaces.

Official resource: [https://power.larc.nasa.gov/](https://power.larc.nasa.gov/)

### NASA MERRA-2

Modern-Era Retrospective Analysis for Research and Applications, Version 2 (MERRA-2), is a NASA atmospheric reanalysis dataset.

It provides model-based environmental information that can support the investigation of regional atmospheric and land-surface conditions.

AGROSCOPE AI uses available MERRA-2-derived information as part of its environmental analysis.

Official resource: [https://gmao.gsfc.nasa.gov/reanalysis/MERRA-2/](https://gmao.gsfc.nasa.gov/reanalysis/MERRA-2/)

### NASA GIBS

The Global Imagery Browse Services (GIBS) system provides access to satellite imagery products through visualization services.

AGROSCOPE AI uses available imagery layers to support geographical exploration and temporal visual comparison.

Official resource: [https://www.earthdata.nasa.gov/eosdis/science-system-description/eosdis-components/gibs](https://www.earthdata.nasa.gov/eosdis/science-system-description/eosdis-components/gibs)

### OpenStreetMap

OpenStreetMap provides geographical map information used to support map visualization and geographical context.

Official resource: [https://www.openstreetmap.org/](https://www.openstreetmap.org/)

### Nominatim

Nominatim supports geographical place lookup and geocoding using OpenStreetMap data.

Official resource: [https://nominatim.org/](https://nominatim.org/)

---

## 7. Data Processing and Intelligence Workflow

The platform follows a modular data-to-insight workflow.

**Step 1 — Geographical selection**

The user selects a geographical location or explores an area through the interactive map interface.

**Step 2 — Environmental data retrieval**

The backend communicates with the relevant data services to obtain available environmental information for the selected location and time period.

**Step 3 — Data organization and processing**

Retrieved information is organized into structured responses. Available variables and derived indicators are prepared for visualization and analytical interpretation.

**Step 4 — Geospatial visualization**

The frontend presents relevant geographical context, satellite imagery and analytical visualizations.

**Step 5 — Analytical investigation**

Users can investigate environmental patterns, compare periods, explore field boundaries and examine screening indicators through specialized modules.

**Step 6 — AI-assisted interpretation**

When requested, relevant analytical context is supplied to the AI layer to generate an explanation.

**Step 7 — Further investigation**

Users can use the resulting information to identify questions, examine additional indicators and investigate environmental conditions in greater detail.

This workflow connects raw environmental information with geographical exploration and contextual interpretation.

---

## 8. Technology Stack

| Layer                | Technology       | Purpose                               |
| -------------------- | ---------------- | ------------------------------------- |
| Frontend framework   | Next.js 16       | Application architecture and routing  |
| UI library           | React 19         | Interactive interfaces                |
| Programming language | TypeScript       | Frontend development                  |
| Styling              | Tailwind CSS v4  | Responsive interface design           |
| Geospatial mapping   | Leaflet          | Interactive geographical maps         |
| Data visualization   | Recharts         | Charts and analytical displays        |
| 3D visualization     | Three.js         | 3D visualization capabilities         |
| Backend framework    | FastAPI          | API services                          |
| Backend language     | Python           | Data processing and scientific logic  |
| AI integration       | OpenRouter       | AI model connectivity                 |
| AI model             | Gemini 2.5 Flash | Contextual interpretation             |
| Earth observation    | NASA GIBS        | Satellite imagery                     |
| Agroclimatic data    | NASA POWER       | Regional environmental information    |
| Reanalysis data      | NASA MERRA-2     | Model-derived environmental variables |
| Geographical data    | OpenStreetMap    | Mapping context                       |
| Geocoding            | Nominatim        | Place lookup                          |
| Frontend hosting     | Vercel           | Application deployment                |
| Backend hosting      | Render           | API deployment                        |
| Testing              | Pytest, Vitest   | Automated testing and verification    |
| Version control      | Git and GitHub   | Source control and collaboration      |

---

## 9. Scientific Methodology and Limitations

Scientific transparency is an important part of AGROSCOPE AI.

Environmental datasets have different spatial resolutions, temporal characteristics and measurement methodologies. Their interpretation must reflect these differences.

### Spatial resolution

NASA POWER/MERRA-2 telemetry used by the platform represents regional grid-cell information, approximately 0.5° × 0.625°, or around 55 km in characteristic spatial scale.

It is not equivalent to an individual field sensor or high-resolution farm measurement.

### Model-derived soil wetness

Soil wetness values derived from MERRA-2 are model outputs.

They must not be described as direct in-situ soil moisture measurements.

### Derived indicators

Some agricultural screening indicators use derived values, proxies or heuristic thresholds.

These are intended to support exploratory analysis and must not be interpreted as independently validated agronomic models.

### Vegetation interpretation

A vegetation proxy must not be presented as direct MODIS NDVI unless the corresponding MODIS product has actually been ingested and processed.

### Precipitation interpretation

A short-window precipitation proxy must not automatically be described as standard SPI-3 without the required statistical methodology and validation.

### Scenario analysis

Scenario outputs represent sensitivity tests based on selected assumptions.

They are not validated forecasts of future agricultural productivity, crop yield or climate conditions.

### Satellite change detection

Visual differences between images may result from multiple factors, including seasonality, clouds, sensor differences and acquisition timing.

A visible difference alone cannot establish the underlying cause.

### AI interpretation

AI-generated explanations are contextual interpretations of available information. They may contain uncertainty and should be reviewed alongside the underlying data and methodology.

**AGROSCOPE AI is an exploratory agricultural intelligence and decision-support platform. It does not replace field observations, laboratory testing, verified agricultural forecasts or professional agronomic recommendations.**

---

## 10. Quality Assurance and Engineering Reliability

AGROSCOPE AI is developed with an emphasis on maintainability, reliability and scientific transparency.

Engineering practices include:

- Modular frontend and backend architecture.
- Structured API communication.
- Input validation and geographical consistency checks.
- Asynchronous backend processing where appropriate.
- Error handling and fallback behaviour.
- Automated backend tests.
- Frontend linting and TypeScript verification.
- Production build verification.
- GitHub Actions CI workflows.

The project includes automated checks for backend functionality and frontend quality.

A successful CI run verifies the configured automated checks; it does not establish the availability of every external data service or validate every scientific interpretation.

---

## 11. Installation and Local Development

### Prerequisites

- Node.js 22 LTS
- pnpm 10
- Python 3.12+
- Git

### Clone the repository

```bash
git clone https://github.com/pratham655/agroscope-ai.git
cd agroscope-ai
```

### Backend setup

```bash
cd backend

python -m venv .venv
```

Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
python -m pip install -r requirements.txt
```

Start the API:

```bash
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend:

[http://127.0.0.1:8000](http://127.0.0.1:8000)

API documentation:

[http://127.0.0.1:8000/api/docs](http://127.0.0.1:8000/api/docs)

### Frontend setup

Open another terminal:

```bash
cd frontend

corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Frontend:

[http://localhost:3000](http://localhost:3000)

### Environment configuration

Create local environment files from the relevant `.env.example` files when present.

Configure the frontend API base URL to point to the backend.

If using the hosted AI provider, configure `OPENROUTER_API_KEY` in the backend environment only.

Never expose API keys, access tokens or private credentials in frontend code or public repositories.

The backend should retain its documented fallback behaviour when optional AI credentials are unavailable.

---

## 12. Testing and Verification

### Frontend checks

Run from the `frontend/` directory:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

### Backend checks

Run from the `backend/` directory:

```bash
python -m pytest -q
```

GitHub Actions is configured to run backend tests and frontend lint, TypeScript and production-build checks.

These automated checks help detect regressions and maintain consistent engineering standards.

---

## 13. What Makes AGROSCOPE AI Different?

AGROSCOPE AI is designed around the integration of several analytical capabilities rather than treating satellite imagery, environmental data and AI as separate experiences.

**1. Integrated agricultural intelligence**

Combines geographical exploration, environmental information, satellite imagery and AI-assisted interpretation within one platform.

**2. Multiple specialized workspaces**

Provides dedicated environments for field intelligence, water-related analysis, risk screening, crop phenology, field boundaries and temporal satellite exploration.

**3. Geographical continuity**

Shared location context connects analytical modules and supports a more consistent investigation workflow.

**4. Change detection with AI context**

Connects satellite change investigations with Farmer Action Copilot, enabling users to move from observing changes to asking contextual questions about them.

**5. Scientific transparency**

Explicitly distinguishes regional model-derived information, proxies, heuristic indicators and exploratory scenarios from direct measurements and validated forecasts.

**6. Modular and extensible architecture**

Uses a separate frontend, Python backend and AI integration layer, allowing additional analytical capabilities and data sources to be incorporated over time.

---

## 14. Future Scope

AGROSCOPE AI can be extended into a more comprehensive agricultural intelligence ecosystem.

Potential future developments include:

- Integration of additional validated satellite-derived vegetation products.
- Higher-resolution environmental and agricultural datasets.
- Integration of ground-based soil and weather sensors.
- Crop-specific and region-specific validated agricultural models.
- Historical drought and environmental anomaly analysis.
- Improved crop-stage estimation using validated remote-sensing methods.
- More advanced geospatial processing and change-detection algorithms.
- Localized multilingual agricultural assistance.
- Improved uncertainty quantification and model validation.
- Integration of verified agricultural and government data sources.
- More comprehensive field-level decision-support workflows.

These developments would help move the platform towards more localized, validated and operational agricultural intelligence.

---

## 15. Project Vision

Agriculture needs more than access to environmental data. It needs the ability to understand that data in geographical, temporal and agricultural context.

AGROSCOPE AI aims to make Earth-observation information and environmental intelligence more accessible through an integrated platform that combines geospatial exploration, scientific data processing and AI-assisted interpretation.

By connecting observation with analysis and analysis with understandable insights, the project seeks to support a more informed approach to understanding agricultural and environmental conditions.

**Observe. Anticipate. Adapt.**

---

## 16. Acknowledgements and Resources

- [NASA POWER](https://power.larc.nasa.gov/)
- [NASA MERRA-2](https://gmao.gsfc.nasa.gov/reanalysis/MERRA-2/)
- [NASA Earthdata](https://www.earthdata.nasa.gov/)
- [NASA GIBS](https://www.earthdata.nasa.gov/eosdis/science-system-description/eosdis-components/gibs)
- [OpenStreetMap](https://www.openstreetmap.org/)
- [Nominatim](https://nominatim.org/)
- [Next.js](https://nextjs.org/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [OpenRouter](https://openrouter.ai/)

---

**Built with the goal of making agricultural environmental intelligence more accessible, understandable and actionable.**
