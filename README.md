# AGROSCOPE AI
### Observe. Anticipate. Adapt.

AGROSCOPE AI is a global agricultural intelligence platform that combines NASA Earth-observation imagery, NASA POWER agroclimatic and MERRA-2 model data, geospatial tools, and an evidence-grounded AI assistant. It is designed to help users explore regional agricultural conditions and understand climate-related risks.

> **Scientific scope:** NASA POWER/MERRA-2 telemetry is regional grid-cell data (approximately 0.5° × 0.625°, around 55 km). It is not a field sensor and must not be interpreted as sub-field precision. Crop rankings and scenario outputs are screening/sensitivity tools, not validated yield forecasts.

## Repository layout

- `frontend/` — Next.js 16, React 19, TypeScript, Tailwind CSS v4, Leaflet and Recharts
- `backend/` — FastAPI services and scientific processing
- `docs/` — architecture, data provenance, methodology and project notes

## Requirements

- Node.js 22 LTS
- pnpm 10 (canonical frontend package manager)
- Python 3.12+

## Quick start

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows PowerShell: .venv\\Scripts\\Activate.ps1
# macOS/Linux: source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API: [http://127.0.0.1:8000](http://127.0.0.1:8000)  
Interactive docs: [http://127.0.0.1:8000/api/docs](http://127.0.0.1:8000/api/docs)

### 2. Frontend

In a second terminal:

```bash
cd frontend
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Frontend: [http://localhost:3000](http://localhost:3000)

## Environment configuration

Create local environment files from the relevant `.env.example` files when present. Configure the frontend API base URL to point to the backend. Configure `OPENROUTER_API_KEY` only in the backend environment if using the hosted AI provider.

- Never commit `.env`, API keys, access tokens, or private credentials.
- Do not paste secrets into issues, pull requests, logs, or screenshots.
- The backend should remain usable through its documented fallback behavior when optional AI credentials are unavailable.

## Quality checks

Frontend, from `frontend/`:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm build
```

Backend, from `backend/`:

```bash
python -m pip install -r requirements.txt
python -m pytest -q
```

GitHub Actions runs the backend test suite and frontend lint, TypeScript, and production-build checks for pull requests and pushes to `main`. A green CI run verifies these automated checks only; it does not prove live NASA service availability, scientific validity of every interpretation, or end-to-end behavior across every browser and location.

## Main workspaces

- Earth Explorer
- Field Intelligence
- Farmer Action Copilot
- Farm Futures Lab
- Smart Water Intelligence
- Crop Phenology Tracker
- Regional Agricultural Risk Radar
- Satellite Change Detective
- Field Boundary Intelligence
- Satellite Time Machine
- Reports and History

## Data sources and limitations

- **NASA POWER / MERRA-2:** regional daily agroclimatic and land-surface-model variables. Soil wetness values are model outputs, not in-situ measurements.
- **NASA GIBS:** satellite imagery layers for visual exploration. Imagery availability, cloud cover, acquisition timing and tile coverage vary by layer and date.
- **OpenStreetMap / Nominatim:** place lookup and map context, subject to the provider's usage policy and attribution requirements.
- **Derived indicators:** proxy indicators and screening heuristics must be interpreted according to the methodology and limitations disclosed in the interface and `docs/`.

Do not describe regional reanalysis as a parcel-level observation. Do not describe a vegetation proxy as direct MODIS NDVI unless the corresponding satellite product is actually ingested and processed. Do not describe a scenario as a validated forecast.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the team's branch, review, and testing workflow.
