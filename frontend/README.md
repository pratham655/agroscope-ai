# AGROSCOPE AI — Frontend

The Next.js 16 / React 19 interface for the AGROSCOPE AI agricultural intelligence platform.

## Requirements

- Node.js 22 LTS
- pnpm 10 (the repository's canonical package manager)
- Backend API available at `http://127.0.0.1:8000` for live data features

## Setup

From this directory:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

The frontend runs at [http://localhost:3000](http://localhost:3000).

## Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm build
```

The production build uses the webpack bundler explicitly. CI runs these checks on pull requests and pushes to `main`.

## Backend connection

Configure the frontend API base URL using the environment variable documented in the root README. Never commit local environment files or API credentials.

## Project structure

- `src/app` — App Router pages and route handlers
- `src/components` — shared interface and map components
- `src/lib` — API clients and shared utilities

See the root [README](../README.md) for the complete project overview, backend setup, data provenance, and scientific limitations.
