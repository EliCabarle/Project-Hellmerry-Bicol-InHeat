<!-- generated-by: gsd-doc-writer -->

# Development Guide

How to set up this repository for development, what the build commands are, and the conventions that apply when contributing code.

## Local setup

The repo has two runnable components (a Vite web app and a Python API) plus shared feature slices. The root `package.json` has **no scripts** — all commands run from subdirectories.

1. Clone the repo:

```bash
git clone <repository-url>
cd NASA-ProjectHellMerry
```

2. Web app setup (`apps/web/`):

```bash
cd apps/web
npm install
npm run dev
```

3. API setup (`apps/api/`):

```bash
cd apps/api
pip install -r requirements.txt
uvicorn main:app --reload
```

4. Create `apps/api/.env` by hand (no `.env.example` exists in the repo). Environment variables are server-side only — never committed, never exposed to the client:

| Variable | Required | Purpose |
|---|---|---|
| `EARTHDATA_USERNAME` / `EARTHDATA_PASSWORD` | For data pulls | Earthdata Login (Landsat, MODIS, ECOSTRESS) |
| `SUPABASE_SERVICE_ROLE_KEY` | For Supabase writes | Server-only Supabase access |
| `FIRMS_MAP_KEY` | Optional | STRETCH-only FIRMS layer |

Supabase project URL and anon key are public-by-design config used by the web client; the service-role key must never reach the client bundle.

## Build commands

Run from the directory noted in each row.

| Command | Location | Description |
|---|---|---|
| `npm run dev` | `apps/web/` | Start Vite dev server |
| `npm run build` | `apps/web/` | Production build (static PWA bundle: manifest + service worker) |
| `npm run preview` | `apps/web/` | Preview the production build locally |
| `uvicorn main:app --reload` | `apps/api/` | Start the FastAPI server (there is no `__main__` block) |
| `python fetch_boundaries.py` | `apps/api/` | ETL step 1 — pull LGU boundaries |
| `python fetch_power_data.py` | `apps/api/` | ETL step 2 — pull NASA POWER data |
| `python calculate_trends.py` | `apps/api/` | ETL step 3 — Theil-Sen / Mann-Kendall trends |
| `python calculate_drivers.py` | `apps/api/` | ETL step 4 — RF/SHAP driver ranking |
| `python generate_static_json.py` | `apps/api/` | ETL step 5 — build static JSON narrative bank |
| `python push_to_supabase.py` | `apps/api/` | ETL step 6 — push outputs to Supabase |
| `python test_pipeline.py` | `apps/api/` | Pipeline check script |
| `python validate_pagasa.py` | `apps/api/` | Hold-out validation against PAGASA data |
| `node test_engine.mjs` | `features/map-controls/` | Map engine unit checks (similar `test_*.mjs` files exist in other feature slices) |

ETL scripts run **in order** from `apps/api`.

## Code style

**No linting or formatting tooling is configured in this repository.** There is no ESLint, Prettier, Biome, or `.editorconfig` — do not look for a `npm run lint` command; it does not exist. Style is enforced only by review. When writing code, match the style of the file you are editing (the codebase mixes plain JS/JSX in the web app and plain Python in the API).

If you add tooling, propose it to the lead first — the root `package.json` is lead-owned.

## Branch conventions

- Default branch: `main`.
- Feature work happens on branches merged via GitHub pull requests (history shows PRs #8–#14 merged into `main`).
- Observed branch naming (no formal convention is documented anywhere in the repo):

| Pattern | Example |
|---|---|
| `feature/<name>` | `feature/dashboard`, `feature/bicol-trend-analysis` |
| `frontend/<name>` | `frontend/Agila-Map-Adaptation` |
| `data/<name>` | `data/scientific-upgrade` |
| `<area>-<description>` | `b2-narratives-fix` |

Prefer `feature/<short-name>` or `<area>/<short-name>` for new branches.

## PR process

There is **no PR template** (`.github/` does not exist) and no `CONTRIBUTING.md`. The process in practice:

- Open a pull request against `main`; merges are done by the lead or repo owner.
- Commit messages are informal; conventional-style prefixes (`feat:`, `docs:`) appear in history but are not enforced.
- **Respect the write-boundary contract in `AGENTS.md`**: you write only inside your own boundary (`apps/web/`, `apps/api/`, `features/<name>/`, `core/`, root docs, `.opencode/`). Cross-boundary needs go through the lead — never a direct write into another owner's path.
- Do not commit secrets. `.env` files are gitignored; the only exception allowed is `.env.example`.
- Test locally before opening the PR: `npm run build` in `apps/web/`, and the pipeline check (`python test_pipeline.py`) for API changes.
