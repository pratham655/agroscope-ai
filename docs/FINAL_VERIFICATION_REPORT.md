# AGROSCOPE AI — Historical Verification Notes

**Context:** NASA Space Apps Challenge 2026 — Problem #7: Field Shift  
**Original report date:** November 7, 2026  
**Document status:** Historical snapshot; not a current release sign-off.

> **Important:** The figures and pass counts below were recorded in an earlier local verification session. They have not been independently rerun against the current repository revision by this document update. Do not use this report alone to claim that the current `main` branch is fully verified or release-ready. The current source of truth for automated checks is the GitHub Actions result attached to the commit or pull request being reviewed.

## Historical results

The original report recorded the following results at the time. These are retained as historical project notes, not current CI evidence:

- Backend tests: 87 passed in the reported run.
- Frontend production build: reported successful.
- Frontend ESLint: reported zero errors and warnings.
- Global NASA GIBS tile check: reported 35 of 36 checks successful.
- Backend health endpoint: reported HTTP 200.
- Global location synchronization: reported successful in the tested scenarios.

## What this report does not establish

- Current test status for the latest commit.
- Live availability of NASA POWER, NASA GIBS, OpenStreetMap or OpenRouter.
- Scientific validation of every derived metric, crop ranking or recommendation.
- Field-level measurement accuracy or suitability for operational farm decisions.
- Browser compatibility, accessibility, load performance or security certification.

## Current verification procedure

Run the commands in the root README and inspect the GitHub Actions checks for the exact commit under review. Record the commit SHA, date, command, environment, test count and outcome when updating this report.

For scientific claims, consult [SCIENTIFIC_METHODOLOGY.md](SCIENTIFIC_METHODOLOGY.md) and [DATA_PROVENANCE.md](DATA_PROVENANCE.md). Keep proxy indicators, model-derived variables, heuristics and direct observations clearly distinguished.
