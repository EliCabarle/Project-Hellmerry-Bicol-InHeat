# Bicol In-Heat — Agent Guide

> Working title **Bicol In-Heat** — "Be An Earth System Trend Detective!" (2026 NASA Space Apps Challenge).
> Authoritative concept/decision log: `CONCEPT.md`. This file guides team members and agents.
> This repository hosts the **working prototype** — code work is expected here. The no-code-before-Nov-14 rule was rescinded by the lead on 2026-11-02 (CONCEPT.md decision log); challenge-weekend cut lines **h30 / h42 / h44** remain hard constraints.

## Layout

```
apps/web/                          Vite + React + Tailwind PWA shell — 3 screens (map / ranking / narration), map-first
apps/api/                          Python — server-side ETL & Earthdata-auth work ONLY (secrets live here)
core/                              Shared trend engine: Theil-Sen, Mann-Kendall, Rothfusz heat index, RF/SHAP driver ranking
features/map-controls/             Feature slice: map + time scrubber (has own AGENTS.md sub-contract)
features/layer-uhi-terrain/        Feature slice: UHI / terrain / LST layers (own AGENTS.md)
features/gamified-dashboard/       Feature slice: progress, leaderboard, tasks (own AGENTS.md)
features/chatbot-llm/              Feature slice: narration + variable glossary (own AGENTS.md)
features/FEATURE-PROMPTS.md        10 engineering briefs (M1-M3 / L1-L3 / G1-G2 / N1-N2) in pack grammar
CONCEPT.md                         Authoritative concept doc + decision log — edit only via lead
AGENTS.md                          This file
HANDOFF.md                         Session history + decision log — history, not a code map
README.md                          Project readme
package.json / docker-compose.yml  Root tooling — lead-owned
.opencode/                         Agent/tooling config, skills, plugins — tooling, not product code
```

What belongs where: UI → `apps/web`; data pulls + statistical math → `core`; feature verticals → `features/<name>/`; server-only code and secrets → `apps/api`; concept decisions → `CONCEPT.md`.

> Session state / resume guide: [`HANDOFF.md`](HANDOFF.md) — read for decisions and history.
> **Code map: `## What exists now` below.** Read that before exploring the tree.

## What exists now (verified on disk 2026-11-10)

Read this table before opening any source file. It is the cheapest way to find the code you need.

| Slice / area | Real files | State |
|---|---|---|
| `features/map-controls` | `src/BicolMap.jsx`, `src/Municipality3DLayer.jsx`, `src/components/{MapControlsOverlay,MunicipalityIndex,MunicipalityInfoCard,MunicipalityLegend}.jsx`, `src/components/municipalityTooltip.js(.css)`, `src/gis/{engine,yearRamp,lift,trace,countryFrame}.js`, `src/state/timelineStore.js`, `test_{engine,year,lift,trace}.mjs` | **built** — 114 municipality features, trend + year fill modes, significance as border pattern, roving-tabindex keyboard; **2D/3D toggle + hover lift + progressive selection trace added 2026-11-12**; **one-time opening flight: country → study region once per session** |
| `features/gamified-dashboard` | `src/RankingScreen.jsx`, `src/components/RankingTable.jsx`, `src/ranking.js`, `src/savedStore.js`, `src/leaderboardStore.js`, `test_ranking.mjs`, `test_saved.mjs` | **built** — slope/danger ordering, flag-not-filter, saved places, public leaderboard read |
| `features/layer-uhi-terrain` | `AGENTS.md` only | **not started** — layer registry, LST, canopy, land cover |
| `features/chatbot-llm` | `AGENTS.md` only | **not started** — narrative renderer, glossary, template fallback |
| `apps/web` | `src/app.jsx` (mounts `map` + `ranking` only — **no narration screen yet**), `useBicolData.js`, `useSession.js`, `lib/{supabase,profile}.js`, `components/AuthButton.jsx` | **built shell** |
| `apps/api` | `main.py` (FastAPI), `fetch_power_data.py`, `fetch_boundaries.py`, `calculate_trends.py`, `calculate_drivers.py`, `generate_static_json.py`, `push_to_supabase.py`, `sync_json_to_db.py`, `validate_pagasa.py`, `seed_locations.py`, `test_pipeline.py` | **built pipeline** — `sync_json_to_db.py` regenerates `apps/web/public/data/narratives.json` from `municipality_trends` (DB is the source of truth; the static file had drifted) |
| `core/` | empty | trend math currently lives in `apps/api/calculate_*.py` |

Facts already established — **do not re-derive these:**

- **LGU count in play is 114** (geoBoundaries `adm3`, CC BY 4.0). Official PSA/PSGC count still unverified — treat 114 as the current fallback, not the published number.
- **Join key is province-qualified** (`joinKey(name, province)` → `"bato|camartines sur"`). "Bato" and "San Fernando" exist in two provinces each; a bare name join is a known bug (V2 tripwire). Do not add normalised matching elsewhere — `savedStore.savedKey` is deliberately exact-match instead.
- **Significance is rendered, never filtered**: filled shapes stay, non-significant get `dashArray` + muted border. Changing that is a science regression, not a style choice.
- **Two colour sources only**: `gis/yearRamp.js` (`YEAR_*` heat ramp, `TREND_*` rate ramp) for fills, plus `SELECT_COLOUR` in `gis/engine.js` for the selection outline. No component may invent a local ramp or hue.
- **Style updates happen in place.** `BicolMap.jsx` keeps one persistent GeoJSON layer; remounting 114 features per selection was the cause of janky zoom. Never reintroduce a remount.
- **3D is a separate entity, not a mode of the 2D layer.** `Municipality3DLayer.jsx` (MapLibre GL JS) mounts only while `renderMode === '3d'`; `MunicipalityLayer` unmounts, so the two renderers never draw at once. It is `React.lazy`-loaded — the 2D bundle carries zero MapLibre bytes. It reuses `getMunicipalityStyle` for colour and `gis/lift.js` for height, so neither ramp nor join key is duplicated.
- **Lift is one case, never a sum.** `liftFor` returns `LIFT_RATIO` (0.30) of the area's own depth for *either* hover *or* selection, so hover-on-selected cannot double-lift. `LIFT_MS` 150, ease-out cubic, rAF loop stops when nothing animates, `prefers-reduced-motion` sets the offset instantly. Depth is metres (`DEPTH_BASE` 3000 + `DEPTH_SPAN` 9000 over the ramp domain), so the lift reads the same at every zoom.
- **MapLibre does not transition feature-state-driven paint**, so the lift animates via `source.updateData` on the `_lift` property. Fine at 114 features; revisit if a slice ever extrudes thousands.
- **The selection outline is a ribbon extrusion, not a line.** MapLibre 5.24.1 has no `line-z-offset`/`line-elevation-reference`, and `drawLine` runs `DepthMode.ReadOnly`, so a ground-level line is occluded by the extrusion. `gis/trace.js` builds a `TRACE_PX`-wide (1.5 px, metres from zoom) ribbon rendered as a flat `fill-extrusion` at `depth + lift + 2 m`, repainted on camera moves so it keeps its screen width.
- **Partial draw is sliced data, not a draw range.** This MapLibre version has no `line-trim-offset`; the trace reveals a growing prefix of the ring (`slicePrefix`). Cost is one small `setData` per frame for one area (23 vertices average, 49 max), never a per-area mesh.
- **The trace matches the camera, never the reverse.** `TRACE_MS` 620 ms against the 700 ms `fitBounds` settle; the start point is the ring vertex nearest `map.getCenter()`, read in the selection effect that runs before the camera effect. Deselect clears instantly (no reverse trace), a new selection restarts from zero, and `prefers-reduced-motion` paints the full ribbon once. Outline colour is `SELECT_COLOUR` in `engine.js` — the one outline token; do not add another cyan literal.
- **Layer-toggle seam already exists** (`MapControlsOverlay` takes `layerRegistry` / `onLayerChange`, guarded by `timelineStore.canToggleLayer`). `layer-uhi-terrain` is expected to own the registry — build on the seam, do not add booleans.
- `apps/api/data/` and `apps/api/output/` do not exist yet; they appear when the pipeline runs.

## Deliverables outside the repo

| File | What it is |
|---|---|
| `C:\Users\USER\Downloads\pilipiknow-map-teardown.pdf` | 8 pages — teardown of the reference site's 3D map engine, style, 4 animation behaviours, 13 upgrade suggestions |
| `C:\Users\USER\Downloads\map-interaction-prompt-pack.pdf` | 20 pages — 13 portable interaction prompts (pan, hover, spotlight, trace, pulse, rim, sheen…), front matter, token block |
| `C:\Users\USER\Downloads\region5-uhi-prompt-pack.pdf` | 16 pages — 10 Region V / UHI municipality prompts (A1-A3, B1-B4, C1-C3) |
| `features/FEATURE-PROMPTS.md` | 10 repo-scoped briefs for the four slices, same 8-field grammar |

All four share one grammar: **ROLE / GOAL / WHY / FIND FIRST / CHANGE / CONSTRAINTS / CUSTOMIZE / DONE WHEN**, plus the lock sentence *"Everything under CUSTOMIZE may be changed freely. If a requested value would break something under CONSTRAINTS, say so and propose the nearest safe value — never apply it silently."* Keep new briefs in that shape.

### PDF toolchain (only needed to regenerate a PDF)

Playwright MCP is dead in this environment (`Connection closed`, exit 255) — do not retry it.
The working path is a Chrome CDP printer at `%TEMP%\opencode\print.mjs`:

1. `python -m http.server 8899 --bind 127.0.0.1` from `%TEMP%\opencode` — Chrome blocks `file:` URLs here.
2. `node print.mjs "<url>" "<out.pdf>"` — headless Chrome, `Page.printToPDF`, A4, `printBackground`, footer page numbers.
3. It prints `[section, heightPx, ok|OVER]` per section. **Budget is 1032 px** at 710 px content width; anything taller splits a page. Trim text lines, never the constraints, to fix an `OVER`.
4. Kill the server afterwards: filter `Get-CimInstance Win32_Process -Filter "Name='python.exe'"` for `*http.server*8899*`.



## Run

Commands below are **verified to exist on disk 2026-11-10**. Root `package.json` has no scripts — run the web app from `apps/web`.

- **Web** (`apps/web/`): `npm install` → `npm run dev` (Vite dev server) → `npm run build` (static PWA bundle: manifest + service worker) → `npm run preview`.
- **API/pipeline** (`apps/api/`): `pip install -r requirements.txt` → `uvicorn main:app --reload` (there is no `__main__` block in `main.py`). ETL runs as scripts from `apps/api`, in order: `fetch_boundaries.py` → `fetch_power_data.py` → `calculate_trends.py` → `calculate_drivers.py` → `generate_static_json.py` → `push_to_supabase.py`. `test_pipeline.py` is the pipeline check; `validate_pagasa.py` is the hold-out validation.
- **Supabase**: hosted, no local process. Dev uses `.env` values (see Environment). Schema: `supabase/000{1,2,3}_*.sql`; `apps/api/migrations/` holds the driver-table migration.


## Environment

**Hard rule: no secrets ship in the client.** The web bundle contains zero API keys and zero passwords; LLM narration is build-time into static JSON. The model keys in the project live in `apps/api/.env` and are read solely by the server-side `POST /api/qa` endpoint and its embedding pipeline (CONCEPT 6d): `GEMINI_API_KEY` (embeddings) and the OpenRouter key (chat).

Server-side only — `apps/api/.env`, never committed:

- `EARTHDATA_USERNAME` / `EARTHDATA_PASSWORD` — Earthdata Login (Landsat C2 L2 LANDSAT_OT_C2_L2, MOD44B.061, MCD12Q1.061, ECOSTRESS STRETCH)
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY` — Google Gemini embeddings (`gemini-embedding-001`, 1536 dims) for the QA chatbot's RAG corpus
- `OPENROUTER_API_KEY` — chat completion for `POST /api/qa`
- `FIRMS_MAP_KEY` *(optional, STRETCH only)*

Config, not secrets (web, public-by-design, guarded by RLS):

- Supabase project URL + anon key — allowed in the client; do **not** paste the service-role key into the client.

No auth needed: NASA POWER API (power.larc.nasa.gov), SEDAC GPW, PSA/PSGC boundaries.

✅ **`.gitignore` now covers `node_modules/`, `dist/`, `build/`, `.env`, `*.env`, `.DS_Store`, `graphify-out/`** (fixed 2026-11-10). `apps/api/.gitignore` has its own rules. Never commit a `.env`; `!.env.example` is the only allowed exception.

Attribution (compliance box 8): PAGASA station data, PSA/PSGC boundaries, fonts/icons, FIRMS attribution notice.

## Backend

Settled architecture (CONCEPT Sect 13, static PWA + Supabase Auth/Postgres, lock h22):

1. NASA POWER daily T2M + RH2M → Rothfusz heat index, per municipality.
2. Per-municipality time series (1981–2025 baseline) → Theil-Sen slope + Mann-Kendall test, α = 0.05 → *the challenge's "significant"*.
3. Driver features: terrain (SRTM elevation, distance to coast), wind (U10M/V10M), canopy (MOD44B), land cover (MCD12Q1), LST (Landsat C2 L2).
4. Random Forest feature importance / SHAP → driver ranking, reported as **association, not causation**.
5. Build-time open-weights LLM renders computed numbers into plain-language narrative bank (EN + Filipino) → **static JSON** shipped with the app. LLM never generates numbers.
6. PWA reads static JSON — works offline on last-viewed content.

Supabase role: accounts, saved history, leaderboard displaying a **user-chosen handle, never a real name**. Auth behind feature flag from h14; **h30 cut line: leaderboard not done → drop to local-only progress, no auth. Do not renegotiate.**

Secrets boundary: Earthdata + Supabase service-role live only in `apps/api`/server-side; the client fetches only public data + static JSON.

Validation: hold out one PAGASA station + last 3 years; report bias and RMSE. **Non-significant trends still reported** — significance is a flag, not a filter.

⚠️ Open facts — verify, never estimate: POWER daily start year (assumed 1981) and PAGASA access route / Region V station list → **verify at h0/h6**; exact Region V LGU count → **count from official source, verify at h6**.

## Conventions / Gotchas

Scope discipline:

- **Exactly ONE challenge** named: Be An Earth System Trend Detective!
- **Only CORE items (CONCEPT Sect 8) may be claimed** on the project page or video. An unshipped STRETCH item is never presented as a feature.
- The OUT list is final: no LSTM forecasting, no SMAP, no barangay-level heat index, more variables than Sect 6a, etc. **One exception: runtime LLM is permitted for the server-side `POST /api/qa` endpoint only** (QA chatbot, promoted to CORE 2026-11-13 — CONCEPT 6d + decision log). The client never holds an LLM key.

Science gotchas:

- **LST ≠ heat index** — satellite skin temperature is much hotter than air; HI comes from POWER T2M+RH2M. The bridge is quantified (hold-out), not assumed.
- **Municipality is the smallest unit, not barangay** — POWER's 0.5° grid (~55 km) cannot resolve finer.
- Landsat 7 post-2003 SLC-off gaps: no clean pre-2013 LST from L7.
- Cloud contamination → report per-municipality sample counts; results always carry sample size.
- RF/SHAP ranks drivers — **association, not proof of causation**.
- Opposite trends in neighboring municipalities can share one cause — that is the challenge's point, not a bug.

Process gotchas:

- Repo hosts the working prototype — code work is expected here; challenge-weekend cut lines (h30/h42/h44) are the hard constraints.
- Language: UI English; narration EN + Filipino (Bicolano = STRETCH only, needs native speaker).
- Every link must resolve in a logged-out private window — test at h44.
- No minor's name, voice, or likeness in video or materials.
- Cut lines are hard: h30 (auth), h42 (STRETCH freeze), h44 (video fallback). Do not renegotiate.
- `.gitignore` populated 2026-11-10 (`node_modules`, `dist`, `build`, `.env`, `*.env`). Still never write a secret outside `apps/api/.env`.
- **`maplibre-gl` is the only non-Leaflet map dependency**: declared in `apps/web/package.json` and aliased in `apps/web/vite.config.js` (because `features/` sits outside the Vite root, bare imports need the alias). Cross-boundary dep add approved by the lead 2026-11-12. It is lazy-loaded — never import it from a non-lazy module or the 2D bundle pays for it.
- Parallel work follows the write-boundary contract below.

### Role / Write-Boundary Contract

Rule: an agent or team member writes **only inside its own boundary**; cross-boundary needs go through the lead, never a direct write.

| Path(s) | Owner | Notes |
|---|---|---|
| `features/<name>/` | That feature's agent only | Each dir has its own `AGENTS.md` as sub-contract |
| `core/` | Core engine owner | Others import; nobody edits |
| `apps/web/` | Web/PWA agent | Client bundle source |
| `apps/api/` | Data-pipeline agent | Only place server secrets are ever read |
| `CONCEPT.md`, `AGENTS.md`, `README.md` | Lead / integrator | CONCEPT edits must update the decision log with a lock hour |
| `.opencode/` | Tooling owner | Not product code |
| Root `package.json`, `docker-compose.yml` | Lead | |
| Static JSON narrative bank | Pipeline writes, web reads | Shared output: produced in `apps/api`/build, consumed by `apps/web` |

### Verified status

| Item | Status | Notes |
|---|---|---|
| Code state of all slices | **Verified 2026-11-12** | See `## What exists now` — map-controls and gamified-dashboard built; layer-uhi-terrain and chatbot-llm contracts only; **2D/3D toggle + hover lift implemented 2026-11-12** |
| Root `.gitignore` | **Verified** | Populated 2026-11-10; `.env` covered |
| Run commands | **Verified to exist** | `apps/web` has dev/build/preview scripts; `apps/api` has `main.py` + 9 pipeline scripts. Root `package.json` has no scripts |
| 2D/3D toggle + hover lift | **Verified in-browser 2026-11-12** | Headless Chrome against the dev server: hover lifts exactly one area at `0.30 ×` its own depth, ratio unchanged at z8/z10.5/z13, selection holds lift with no double, fast sweep leaves nothing stale, reduced-motion offset is instant, tooltip + 2D hover + 2D↔3D remount unchanged, FPS 198 vs 202. `node test_lift.mjs` 5 pass |
| MapLibre bundle split | **Verified** | `maplibre-gl` appears only in the lazy `Municipality3DLayer` chunk (1.06 MB / 288 kB gz); the `index` chunk contains zero MapLibre bytes |
| 3D selection trace | **Verified in-browser 2026-11-12** | Headless Chrome on `npm run preview`, 1280×800 and 390×844: trace-coloured pixels grow from 0 to 7773 / 141 by 700 ms and plateau to 2 s, 0 after deselect, three selections inside one window settle to one complete outline, reduced motion shows the full outline at 60 ms at the completed count. `node test_trace.mjs` 7 pass. Verified by pixel counts, not by eye |
| 3D keyboard picking | **Not implemented** | 3D has no roving-tabindex path to municipalities; the DOM municipality index still selects areas in either mode |
| Stack decisions (static PWA + Supabase, build-time LLM, RF/SHAP, Theil-Sen/Mann-Kendall) | **CONCEPT-derived** | Authoritative but TENTATIVE — lock hours h0–h22 per CONCEPT Sect 13 |
| Challenge statement verbatim | **Captured 2026-11-02** | Re-verify live page at h0 (page is JS-rendered) |
| Event name + local close time | **Unverified** | Verify at h0 — OPEN in CONCEPT Sect 13 |
| POWER daily start year (assumed 1981) | **Unverified** | Verify at h6 |
| PAGASA access route + Region V station list | **Unverified** | Verify at h6 |
| Exact Region V LGU count | **Unverified** | Official count still open. In code: **114** from geoBoundaries `adm3` — a fallback, not the published number. Never estimate; count from PSA/PSGC |
| LGU boundary source (PSA/PSGC) | **Unverified** | `engine.js` uses geoBoundaries as the interim source; swap when official is confirmed at h6 |
| Challenge URL / iHeatMap URL resolve logged-out | **Pending** | Test in logged-out private window (h0 / h44) |
| `## Run` commands actually execute | **Pending** | Paths and script names verified; a clean `npm install && npm run dev` has not been run in this session |



# Token Efficiency & Large Data Rules

To prevent context-window exhaustion and hallucination, you MUST strictly follow these rules when interacting with this repository:

1. **NEVER read raw data files directly.** 
   Do NOT use `cat`, `read_file`, or file-viewing tools on `*.csv` or `*.json` files larger than 100 KB (e.g., `power_daily_full.csv`, `narratives.json`). Reading these will consume the entire context window and crash the session.

2. **Use Python for Data Introspection.**
   If you need to understand the shape, columns, or sample of a dataset, write a short Python script using `pandas` and run it via the terminal. 
   *   *Example:* `python -c "import pandas as pd; df = pd.read_csv('data/power_daily_full.csv'); print(df.shape); print(df.head())"`

3. **Targeted Code Reading.**
   Do not read entire 500-line files. Use `grep` or view specific line ranges (e.g., "Read lines 40-60 of `calculate_drivers.py`") to isolate the specific function you need to modify.

4. **No "Teacher Mode".**
   Do not explain your code step-by-step unless explicitly asked. Output only the modified code block or the exact terminal commands to run.

5. **Start Fresh Sessions for New Tasks.**
   Do not use one massive chat session to do EDA, model training, and UI fixes. Once a specific script is working and committed, start a new session for the next feature.

6. **Skip generated data directories.**
   Do not scan or index `apps/api/data/`, `apps/api/output/`, or `apps/web/public/data/` — generated output, not source. (No `.agentignore` file exists; this rule is the substitute.)
