# Bicol In-Heat

> **Be An Earth System Trend Detective!** — 2026 NASA Space Apps Challenge.
> A heat-trend detective tool for Bicol (Region V, Philippines): which municipalities are heating, why, how fast, and whether the trend is statistically significant.
>
> **Status: working prototype.** This repository is the home of the prototype (near-final-product target); code work is expected here. Challenge-weekend cut lines h30/h42/h44 (see `CONCEPT.md` §11) are the hard constraints.

## Why

Every dry season, Bicol breaks its own heat record — but the **heat index** (what the body actually feels) climbs into PAGASA's **Danger range (42–51 °C)** and past it, far above what thermometers report. Advisories track the spike *after* it happens; nobody answers the **why**. Bicol In-Heat explains it: driver attribution at municipality scale over decades, with statistical significance — and it answers the challenge's key question: *the same process can drive opposite trends in neighboring municipalities.*

## What it does (3 screens, map-first)

1. **Map** — Region V heat layer + time scrubber, municipality tooltips, significance flags.
2. **Ranking** — municipalities sorted by warming trend and danger-band exceedance (slope + p-value; non-significant trends are still shown).
3. **Narration** — plain-language (EN + Filipino) explanation of *why* a municipality is heating, drivers ranked, with a mitigation list. Every variable carries a plain-language definition.

## Tech stack

- **Frontend:** Vite + React + Tailwind PWA (installable, offline last-view), static hosting.
- **Core engine:** Theil–Sen slope + Mann–Kendall test (α = 0.05), Rothfusz heat index, Random Forest / SHAP driver ranking (association, not causation).
- **Backend:** static PWA + Supabase Auth/Postgres (accounts, saved history, leaderboard — user-chosen handle only, never a real name).
- **LLM:** build-time, open-weights — renders *computed* numbers into the narrative bank as static JSON; never generates numbers; **no LLM key anywhere**.

## Repo layout

```
apps/web/                Frontend PWA shell (3 screens)
apps/api/                Python: server-side ETL, Earthdata auth, narrative-bank build
core/                    Shared trend engine (Theil–Sen, Mann–Kendall, Rothfusz, RF/SHAP)
features/                Feature slices (map-controls, layer-uhi-terrain, gamified-dashboard, chatbot-llm)
```

Team working rules, write boundaries, and verified status: **`AGENTS.md`**. Concept, data plan, decisions: **`CONCEPT.md`**.

## Run

- **Web** (`apps/web/`): `npm install` → `npm run dev` → `npm run build` (static PWA bundle) → `npm run preview`.
- **API/pipeline** (`apps/api/`): `pip install -r requirements.txt` → `uvicorn main:app --reload`; ETL runs are invoked as scripts.
- **Supabase:** hosted; dev config via `.env`.
- Scaffolding script entries fill in as the prototype is built out (see `AGENTS.md` verified-status table).

## Data & attribution

NASA: POWER (T2M/RH2M → heat index), Landsat C2 L2 (LST), MOD44B.061 (tree cover), MCD12Q1.061 (land cover), SEDAC GPW (exposure). Non-NASA (attributed): PAGASA station data, PSA/PSGC boundaries, fonts/icons per licence, FIRMS notice.

## Links

- Challenge: https://www.spaceappschallenge.org/2026/challenges/be-an-earth-system-trend-detective/ *(verify resolves logged-out)*
- Prior art: DOST-PAGASA iHeatMap — https://bagong.pagasa.dost.gov.ph/weather/heat-index *(verify resolves logged-out)*

## Installation

```bash
# Web app (Vite + React + Tailwind PWA)
cd apps/web
npm install

# API / data pipeline (Python)
cd apps/api
pip install -r requirements.txt
```

No lockfile-managed workspace tooling is required — the root `package.json` has no scripts and each app installs independently. Node.js and Python 3 with `pip` must already be installed; exact version floors are not pinned in the repository (`<!-- VERIFY: minimum Node.js / Python versions -->`).

## Quick start

1. Install the web dependencies:

   ```bash
   cd apps/web && npm install
   ```

2. *(Optional — accounts/leaderboard only)* create `apps/web/.env.local` with the public Supabase config:

   ```bash
   VITE_SUPABASE_URL=https://<your-project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```

   The client must only ever hold the **anon** key — secrets live server-side in `apps/api/.env`.

3. Start the dev server and open the printed local URL:

   ```bash
   cd apps/web && npm run dev
   ```

4. *(Pipeline work)* run the API/dev services:

   ```bash
   cd apps/api && uvicorn main:app --reload
   ```

   `main.py` has no `__main__` block — `uvicorn` is the entry point.

## Usage examples

- **Which municipality is heating fastest?** Open the **Ranking** screen: municipalities are ordered by warming trend (Theil–Sen slope) with Mann–Kendall p-values. Non-significant trends are still listed — significance is a flag, not a filter.
- **Is a place actually in the danger band?** On the **Map** screen, drag the time scrubber to move through years and hover a municipality to see its heat-index tooltip and significance marker.
- **Why is it heating?** Open the **Narration** screen for a municipality: drivers are ranked by Random Forest / SHAP importance (association, not causation) and rendered as plain-language EN + Filipino text, with every variable given a plain-language definition.

## License

No license has been granted yet: the repository contains no `LICENSE` file, and the root `package.json` is `"private": true` with no `license` field. Treat all code and outputs in this repository as all rights reserved until a `LICENSE` file is added.
