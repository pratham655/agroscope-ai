# Contributing to AGROSCOPE AI

Thanks for helping improve AGROSCOPE AI. Please keep scientific accuracy, reproducibility and data provenance central to every change.

## Development workflow

1. Start from an up-to-date `main` branch.
2. Create a focused branch: `feat/<topic>`, `fix/<topic>`, `docs/<topic>` or `test/<topic>`.
3. Keep changes scoped and add or update tests for behavioral changes.
4. Run the relevant checks locally before opening a pull request.
5. Open a pull request against `main`; describe the change, evidence, limitations and any required environment variables.
6. Wait for both CI jobs to pass and request review from a teammate before merging.

Do not push directly to `main`.

## Required checks

### Backend

From `backend/`:

```bash
python -m pip install -r requirements.txt
python -m pytest -q
```

### Frontend

From `frontend/` (pnpm 10 is the canonical package manager):

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm build
```

GitHub Actions runs these checks for pull requests and pushes to `main`. A successful CI run is necessary but not sufficient for release approval.

## Scientific and data requirements

- Distinguish direct satellite observations, reanalysis/model outputs, derived indicators and heuristics.
- Include spatial resolution, temporal coverage, missing-data behavior and uncertainty where relevant.
- Do not describe NASA POWER/MERRA-2 regional grid-cell values as parcel-level measurements.
- Do not call a vegetation proxy direct NDVI unless the actual satellite product is processed.
- Do not call a short rolling precipitation proxy standard SPI-3.
- Treat crop suitability and scenario outputs as screening/sensitivity tools unless validated independently.
- Do not infer temporal coincidence from aggregate statistics.
- Preserve location and coordinate integrity across API requests and cached responses.

## Secrets and configuration

- Never commit `.env` files, API keys, access tokens or credentials.
- Use local environment files and sanitized example files.
- Do not include secrets in test fixtures, screenshots, logs or pull-request descriptions.

## Pull request checklist

- [ ] Change is focused and described.
- [ ] Tests cover changed behavior.
- [ ] Backend tests pass (if backend changed).
- [ ] Frontend lint, typecheck and build pass (if frontend changed).
- [ ] Scientific claims match the implementation.
- [ ] Data limitations and user-visible fallbacks are documented.
- [ ] No secrets or generated build artifacts are included.
