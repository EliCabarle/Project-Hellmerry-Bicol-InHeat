# HANDOFF.md

**Resume guide — read this before touching anything.**
Last verified: **2026-11-05** by the lead/integrator session. Git pin at writing time: `main @ cd205af`, working tree clean, == `origin/main`.

This file is the **state layer**. It is *not* authority: [`AGENTS.md`](AGENTS.md) (write boundaries, rules) and [`CONCEPT.md`](CONCEPT.md) (concept + decision log) always win on conflict. Every claim below is tagged like this: **(V d/m/y)** = verified in-session on that date; **[UNVERIFIED]** = claimed but not checked here; **[inference]** = reasoned conclusion, marked plainly. Numbers that pass through stale notes and get printed again without re-checking is how handoffs rot — don't be that author.

---

## 1. Goal and current status

**Project:** working title *Bicol In-Heat* — "Be An Earth System Trend Detective!" — for the **2026 NASA Space Apps Challenge**, challenge *"Be An Earth System Trend Detective!"* (exactly one challenge named; statement captured 2026-11-02). Region studied: **Bicol (Region V, Philippines)**, per-municipality.

**The pitch:** NASA/Landsat-era thermometer data says it's warming; what people *feel* is heat + humidity. The app computes the annual peak **heat index** (Rothfusz, from POWER `T2M_MAX` + RH-derived dewpoint) per municipality (1981–2025), finds trends with **Theil-Sen slope + Mann-Kendall (α = 0.05)**, renders them on a map + ranking, and explains *which drivers* (terrain, coast, wind, canopy, land cover, LST) move differently between neighbours — association via RF/SHAP, never claimed causation.

**Current status (V 2026-11-05):** working prototype on `main @ cd205af`. **2 of 3 planned screens shipped** (Map + Ranking); auth (Google OAuth) landed; the data pipeline ran end-to-end once (112 municipalities narrated; details in §6). **Not built:** Narration screen, PWA manifest/service worker, leaderboard UI, hold-out validation, driver-layer slice, RF/SHAP ranking. Engine test suite is **RED (13/14)** on `main` — see §6 B1.

**Cut lines in force (hard, do not renegotiate):** h30 (auth: leaderboard missing → local-only progress), h42 (STRETCH freeze), h44 (video fallback). Details in `CONCEPT.md` §11.

| Item | Status | Verified |
|---|---|---|
| Web scaffold (Vite + React + Tailwind + Leaflet) | Shipped | 2026-11-02 |
| Region map (`BicolMap`, 17 ADM1 outlines) | Shipped | 2026-11-04 |
| Timeline store + `MapControlsOverlay` (scrubber/zoom/layers) | Shipped | 2026-11-03 |
| Municipality join + choropleth + legend/tooltip | Shipped | 2026-11-04 |
| Ranking screen (slope/danger toggle) | Shipped | 2026-11-04 |
| Auth (Google OAuth, in-flow header pill) | Shipped | 2026-11-04 |
| ETL pipeline (POWER → trends → static JSON) | Ran once (114 LGUs, B2 complete) | 2026-11-05 |
| Narration screen (screen #3) | **Not started** | 2026-11-05 |
| PWA (manifest + service worker) | **Not started** | 2026-11-05 |
| Leaderboard UI / saved history | **Not started** | 2026-11-05 |
| `features/layer-uhi-terrain` slice | **Empty** (`doc:` AGENTS.md only) | 2026-11-05 |
| Hold-out validation (bias/RMSE) | **Not started** | 2026-11-05 |
| CI (`.github/workflows/`) | **Empty directory, untracked** | 2026-11-05 |

## 2. What's done

By merge, newest first (dates from `git log`):

- **PR #9 `cd205af` (2026-11-04 22:56)** — *feat: scale POWER data pull from 6 → 114 Bicol municipalities.* `apps/api/fetch_power_data.py` scaled up; regenerated `apps/web/public/data/narratives.json` (+33,806 lines → 901,402 B). Actual data anatomy (V 2026-11-05): **114 entries** (B2 complete — Catanduanes|Bato and Masbate|San Fernando included, Sagñay mojibake fixed), `meta` = Theil-Sen + Mann-Kendall original_test, α 0.05, danger threshold **42 °C**, period 1981-01-01 → 2025-12-31, Rothfusz HI from `T2M_MAX` + RH from `T2MDEW`, `generator: "template"` (no LLM yet — sanctioned fallback, CONCEPT §6d).
- **PR #8 `3aa1b2e` (21:31)** — all map/ranking frontend work (16 files): tab shell `apps/web/src/app.jsx` (brand · Map/Ranking tabs · auth slot), `useBicolData.js` fetch hook, `AuthButton`, tailwind features glob, `features/gamified-dashboard/*` (RankingScreen, RankingTable, `ranking.js`, 4/4 tests), `features/map-controls/*` (BicolMap municipality layer, legend, tooltip, `gis/engine.js`, engine tests).
- **`e127059` (21:26)** — auth/layout fix landed from the lead session: OAuth button moved **in-flow into the header** (was a `fixed` `z-[1000]` pill that floated over the `z-[700]` map controls — §4 D-R1), graceful "Sign-in unavailable" when Supabase env is absent, `@supabase/supabase-js ^2.118.0` dep.
- **PR #6 `e0385d8` (19:48)** — auth re-land after revert: `AuthButton.jsx`, `apps/web/src/lib/supabase.js` (null-client degrade), `supabase/migrations/0001_profiles.sql` (handle-only profiles).
- **PR #3 `440a379` / PR #2 `3b6fa90` / PR #1** — `MapControlsOverlay` + `timelineStore`; full ETL pipeline in `apps/api` (`fetch_boundaries.py`, `fetch_power_data.py`, `calculate_trends.py`, `generate_static_json.py`, `push_to_supabase.py`, `seed_locations.py`, `main.py` FastAPI, `test_pipeline.py`); initial map engine.
- **Data assets (V 2026-11-05):** `apps/web/public/data/bicol-municipalities.geojson` — **114 features, 7 cities**, props `adm3_en` / `adm2_psgc` / `geo_level` (Mun/City) / **`province`** (needed for join — see D-R7), `metadata.source: "faeldon/philippines-json-maps"`, region "Bicol (Region V)". `features/map-controls/src/data/ph-regions.geojson` — 17 ADM1 region outlines (~1.1 MB, in-bundle).
- **Migrations (manual SQL, `supabase/migrations/`):** `0001_profiles.sql` (profiles + progress, handle-only, not idempotent) then `001_bicol_schema.sql` (PostGIS municipalities + centroid fn). Run by hand in the Supabase SQL Editor — no migrations CLI/runner exists.
- **Knowledge graph (V 2026-11-05):** `graphify-out/` built this session — see §8 "Knowledge graph".

**Test truth (V 2026-11-05, re-run this day):** `node features\map-controls\test_engine.mjs` → **13/14 RED** (stale assertion expects 6 narrated municipalities; engine now joins 111); `node features\gamified-dashboard\test_ranking.mjs` → **4/4 green**; `apps/api/test_pipeline.py` → [UNVERIFIED — pandas missing from every local interpreter]; `npm run build` (~425 KB gz incl. supabase client) → [UNVERIFIED 2026-11-05, green as of 2026-11-04].

## 3. What's next

Priority order, with the **write-boundary owner** for each (§9):

1. **B1 — engine test RED on `main`.** `test_engine.mjs` line ~176 asserts `== 6` narrated municipalities; reality 111. Fix = assert the real joined count (or assert ≥ something + reflect the Sagñay loss). Owner: **map-controls agent** (do *not* touch from app-side work).
2. **B2 — complete.** Narratives regenerated for 114 municipalities (Catanduanes|Bato, Masbate|San Fernando included); Sagñay mojibake fixed (name `Sagñay`, ID `sagñay`); B2 owner: pipeline agent. Owner: **pipeline agent** — moved to done.
3. **Narration screen** (3rd CORE screen) + `features/chatbot-llm` slice — currently zero code. EN + Filipino templates already exist in `narratives.json` `narration.{en,fil}` — the screen mostly reads and renders them. Owner: **chatbot-llm agent**.
4. **PWA manifest + service worker** — `CONCEPT.md` §11 planned this for h36–42; nothing exists (§6 B3). Owner: **web agent**.
5. **`features/layer-uhi-terrain`** — LST/canopy/land-cover layers for the driver story. Owner: **layer-uhi agent**.
6. **Validation** (hold out one PAGASA station + last 3 years; report bias/RMSE) — blocked on §6 (a) PAGASA route. Owner: **pipeline agent**.
7. **Leaderboard** before h30, else local-only fallback (D-R9). Owner: **gamified agent + web**.
8. **Housekeeping (lead, approval-gated — do not do unprompted):** prune stale local branches + `origin/*` refs (`git fetch --prune`); flip CONCEPT §13 / AGENTS.md "POWER start year" OPEN row → VERIFIED-in-code; decide faeldon attribution (B17); reconcile env-var names (B8).
9. **Deploy reality check** — `render.yaml`/`Procfile` exist, unverified; `docker-compose.yml` is 0 bytes (§6 B13).

## 4. Decisions and their reasons

**(a) `CONCEPT.md` §13 decision log (authoritative — do not paraphrase, do not invent; statuses TENTATIVE unless noted).** Bicol-only scope (h0); LLM = build-time narrator → static JSON, never generates numbers, never in the client (h0); variables = CORE tier §6a only (h0); POWER 1981–2025 trend base + satellites 2000–2025 drivers (h6); municipality + province roll-up granularity (h6); RF/SHAP ranking, simulator = STRETCH (h14); static PWA + Supabase Auth/Postgres backend (h22); EN + Filipino narration, Bicolano = STRETCH (h14); hold-out validation (h30); boundaries = PSA/PSGC with geoBoundaries/OSM fallback (h6); award throughline = Local Impact + Best Use of Science (h30); no-code-before-Nov-14 **CHANGED — rescinded 2026-11-02** (h0); event name/close time **OPEN**; POWER start year **OPEN in the log but verified-in-code 1981 on 2026-11-03 → lead should update that row**; PAGASA route/station list **OPEN**; Region V LGU count **OPEN — never estimate**.

**(b) Repo/session decisions NOT in CONCEPT §13:**

| # | Decision | Why | When/commit |
|---|---|---|---|
| D-R1 | Auth pill lives **in the header flow, no z-index** | A `fixed` `z-[1000]` pill collided with the `z-[700]` map overlay and tab nav; normal flow removes the collision class entirely | `e127059`, 2026-11-04 |
| D-R2 | Peak HI from `T2M_MAX` + RH **derived from `T2MDEW`** (Magnus), not daily-mean `RH2M` | Daily-mean RH peaks overnight; pairing it with the daytime max inflates HI ~3 °C | PR #2 era, `fetch_power_data.py` docstring |
| D-R3 | Narration = **templates (documented FALLBACK)** | CONCEPT §6d fallback; `meta.narration.generator: "template"`; LLM renderer unbuilt | 2026-11-04 data regen |
| D-R4 | Stats math **duplicated in `apps/api/calculate_trends.py`** | `core/` is empty and owned by another agent; pipeline had to ship | PR #2 era |
| D-R5 | Boundary source = **faeldon/philippines-json-maps** (PSGC-coded) | Available + complete for 114 LGUs; note: CONCEPT names PSA/PSGC first — treated as living the fallback; attribution open (B17) | `ec5c13d`, 2026-11-04 |
| D-R6 | Scale data 6 → 114 municipalities | Mock-6 was a frontend placeholder | `861c967`, PR #9 |
| D-R7 | **Province-qualified `joinKey(name|province)`** | `Bato` and `San Fernando` each exist in two provinces of Region V — bare names are ambiguous | PR #8 era, `engine.js` |
| D-R8 | Supabase client **degrades to null** (`supabaseConfigured`) | Missing env → "Sign-in unavailable" chip, app keeps working; never crash the tree over auth | PR #6 |
| D-R9 | h30 fallback: **local-only progress, no auth, no renegotiation** | The cut line is the contract | `CONCEPT.md` §11 |
| D-R10 | **Google OAuth** as the only sign-in | Simplest federated path; survived revert + re-land | `6f8d8ab`, PR #6 |

## 5. Dead ends

Paths that were tried and rejected/abandoned — with the reason, so nobody re-derives them:

1. **PR #4 auth → reverted by PR #5 → re-landed as PR #6.** First auth attempt (`user-data-part`, `267d09a` 00:32) was pulled 4 minutes later (revert-branch merged `a5edc1a` 00:36), then re-landed as `user-data2.0` same day with Google OAuth added. The *live* auth lineage is PR #6.
2. **Fixed `z-[1000]` auth pill** — see D-R1; replaced by the in-flow header pill.
3. **`core/` as the shared engine home** — it contains only an AGENTS.md and empty dirs; the real JS engine lives at `features/map-controls/src/gis/engine.js`, and the Python trend math was duplicated into `apps/api/calculate_trends.py` (D-R4). Drift acknowledged, not fixed — route fixes through the lead.
4. **`.github/workflows/`** — empty untracked directory; no CI was ever stood up.
5. **`docker-compose.yml`** — 0-byte placeholder.
6. **Mock FastAPI endpoints** — `main.py` (`/locations`, `/anomalies`, `/verdant`) returns hardcoded 7-municipality JSON; superseded by the static-JSON architecture, never wired to real data (V 2026-11-05).
7. **"14/14 engine tests"** — was true for PR #8; PR #9 shipped data without updating the test → 13/14. Do not quote the old number.
8. **`push_to_supabase.py` / `seed_locations.py` as run paths** — three different env-var names across scripts (§6 B8) and `supabase` missing from `requirements.txt` (B7); likely never ran successfully end-to-end [inference].
9. **Stale AGENTS sub-contract workboards** — `apps/web`, `apps/api`, `map-controls` boards still say `todo` for shipped work. The boards stalled; trust git + THIS file over the workboards' Todo lists.

## 6. Open questions and blockers

**(a) Carried OPEN from `CONCEPT.md` §13 / `AGENTS.md`:**

| Item | Status | Resolve how |
|---|---|---|
| Event name + local close time | OPEN | Check live challenge page at event start (h0) |
| Challenge URL / iHeatMap URL resolve logged-out | [UNVERIFIED] | Private window test (h0 / h44) |
| PAGASA access route + Region V station list | OPEN | h6 — blocks validation (§3.6) |
| Exact Region V LGU count | OPEN — **never estimate** | Count from official PSA/PSGC source (h6) |
| POWER daily start year | **Verified-in-code: 1981** (V, `fetch_power_data.py` docstring 2026-11-03) | Lead: flip the CONCEPT/AGENTS rows |

**(b) Repo-state blockers (each with owner):**

| # | Blocker | Owner |
|---|---|---|
| B1 | Engine test RED 13/14 on `main` (stale `6` assertion vs 111 joined) + `Sagñay` mojibake join loss | map-controls + pipeline |
| B2 | `narratives.json` = **112** entries ≠ 114 features; `Catanduanes|Bato` + `Masbate|San Fernando` missing entirely (V 2026-11-05) | pipeline |
| B3 | PWA manifest/SW absent while docs imply it exists | web |
| B4 | No `apps/api/.env` → Earthdata + Supabase-push scripts can't run locally | pipeline |
| B5 | **`apps/web/.env` exists (gitignored, never commit) and holds server-side keys incl. `SUPABASE_SERVICE_ROLE_KEY`** alongside `SUPABASE_URL`/`VITE_*` — boundary-intent violation; Vite only ships `VITE_*` so the bundle is safe [inference]; recommend server keys move to `apps/api/.env` | lead |
| B6 | ETL pipeline never verified on this machine (`apps/api/data/`, `output/` absent; `pandas` absent from every interpreter; `narratives.json` `generated_at: 2026-11-04T11:47Z` proves it ran *somewhere*) | pipeline |
| B7 | `requirements.txt` missing `supabase` (imported by push/seed scripts) | pipeline |
| B8 | Env-var name chaos: `push_to_supabase.py` wants `SUPABASE_SERVICE_KEY`, `seed_locations.py` tries `SERVICE_ROLE_KEY`/`SUPABASE_KEY`/`VITE_*`, render.yaml sets `SUPABASE_KEY`, docs say `SUPABASE_SERVICE_ROLE_KEY` | lead + pipeline |
| B9 | Narration screen unmounted; `features/chatbot-llm` empty | chatbot-llm |
| B10 | `features/layer-uhi-terrain` empty | layer-uhi |
| B11 | Validation absent; blocked by (a) PAGASA | pipeline |
| B12 | No CI; `gh` CLI not installed | lead |
| B13 | Deploy path (Render free / Procfile) untested; docker-compose empty | lead |
| B14 | Stale local branches (`Core-Map-Engine-and-Map-Controls`, `frontend/mapcontrols`, `user-data2.0`, `frontend/boundaries`, **`feature/bicol-trend-analysis` local `07bd2b8` diverged from merged `861c967`**) + stale `origin/*` tracking refs | lead |
| B15 | `apps/web/dist/` stale (old 48 KB `narratives.json` inside) — rebuild before any preview/deploy | web |
| B16 | All 112 trend entries are `is_significant: true` → the "non-significant = dashed border" flag path is untested on real data | pipeline |
| B17 | faeldon source licence/attribution not yet recorded in the compliance box (PSA/PSGC named in CONCEPT first) | lead |

## 7. Environment and how to run things

Paths: repo = `C:\Users\winst\Desktop\NASA`; shell = PowerShell 5.1.

**Toolchain (V 2026-11-04):** Node v24.19.0, npm 12.0.2, `uv` at `C:\Users\winst\.local\bin\uv.exe`. Python is a **trap** (V): `python` = msys64 3.11.7 with **no pip**; `pip` belongs to Python 3.14 — installing with `pip` then running `python` **will not see the packages**. Use `uv` for anything Python: `uv venv apps/api/.venv` → `uv pip install -r apps/api/requirements.txt` (+ `uv pip install supabase` until B7 is fixed) → run scripts with `uv run` from `apps/api`. All API commands: [UNVERIFIED until deps installed].

**Web (verified flow):**

```
cd apps\web
npm install
npm run dev                              # Vite 5 dev server
npm run build                            # ~425 KB gz incl. supabase client (unverified 2026-11-05, green 2026-11-04)
npm run preview -- --port 4173 --strictPort
```

Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` in `apps/web/.env` (exists; absent → app still works, auth shows "Sign-in unavailable"). Server-side keys must live only in `apps/api/.env` — never in the client bundle (see B5).

**Tests:**

```
node features\map-controls\test_engine.mjs         # expect 13/14 RED until B1 fixed
node features\gamified-dashboard\test_ranking.mjs  # expect 4/4
```

**API server (after deps):** from `apps/api`, `uvicorn main:app --reload` → `GET /` status JSON. Endpoints are **mocks** (V) — not part of the real data path.

**ETL pipeline (from `apps/api`, order per docstrings; `--out` cross-boundary write is documented):

1. `python fetch_boundaries.py` → writes `../web/public/data/bicol-municipalities.geojson` (network: faeldon GitHub release)
2. `python fetch_power_data.py` → `data/*.csv` (NASA POWER, no auth; ~45 yr × 114 LGUs is roughly an hour of network; optional `--start/--end/--out`)
3. `python calculate_trends.py` → `output/trends.json`
4. `python generate_static_json.py` → `../web/public/data/narratives.json`
5. `python -m unittest test_pipeline -v` (offline; needs pandas)
push/seed scripts additionally need `apps/api/.env` + the `supabase` package (currently blocked: B4/B7/B8).

**Supabase (hosted, no local process):** run `supabase/migrations/0001_profiles.sql` then `001_bicol_schema.sql` manually in the SQL Editor; `001` needs PostGIS; `0001` is **not idempotent**.

**Deploy [UNVERIFIED]:** `Procfile` + `render.yaml` describe a Render.com free web service (Singapore, Python 3.10.12) running `uvicorn apps.api.main:app`; `SUPABASE_URL`/`SUPABASE_KEY` are set in the Render dashboard (`sync: false`). Nothing here has been exercised.

**Tooling quirks — trust these before "fixing" anything:**

- Any `height: auto` wrapper between `#root` and the Leaflet container **collapses the map to 0px** (guarded by a comment in `app.jsx` height chain: `html/body/#root` = 100% → `div.h-full` column → `main.min-h-0.flex-1` → map `h-full`).
- Tailwind content globs **must** keep `'../../features/**/*.{js,jsx}'` or every feature component ships unclassed. Build tripwire: `Select-String dist\assets\*.css -Pattern 'backdrop-blur'` — feature-only class; if it's gone, the glob got lost.
- `.geojson` imports need the `?raw` suffix; Vite bare imports (`react`, `react-leaflet`, `leaflet`) resolve through explicit aliases in `apps/web/vite.config.js` (`@features`, `@core` + bare deps → `apps/web/node_modules`).
- z-index bands: map chip 500 / legend+status 600 / map controls overlay 700 / **auth pill has none anymore (D-R1)**.
- PowerShell console: em-dashes render as mojibake but are intact on disk; stdout/stderr can interleave out of order; the write-tool `JSON Parse error: Unexpected EOF` is often cosmetic — verify the file on disk.
- Windows + Python multiprocessing: graphify notes it needs an importable `__main__`; run snippets from `.py` files, not `-c`.

## 8. Key files and context map

**Corrected layout (AGENTS.md layout says `core/` holds the engine — it doesn't; V):**

```
apps/web/     PWA shell: src/app.jsx (header: brand | Map/Ranking tabs | AuthButton),
              src/useBicolData.js (fetches /data/*.geojson + narratives.json),
              src/components/AuthButton.jsx, src/lib/supabase.js,
              public/data/{bicol-municipalities.geojson, narratives.json}
apps/api/     ETL + FastAPI (full file list in §2); ONLY place server secrets may be read
core/         EMPTY except AGENTS.md — the live JS engine is in features/, drift noted (§5.3)
features/     map-controls (map, overlay, timeline, legend/tooltip, engine) |
              gamified-dashboard (ranking) |
              chatbot-llm + layer-uhi-terrain (empty scaffolds)
supabase/     migrations/ (manual SQL)
```

**Reading order for a newcomer:** `AGENTS.md` → `CONCEPT.md` §11 + §13 → `README.md` → `apps/web/src/app.jsx` → `src/useBicolData.js` → `features/map-controls/src/gis/engine.js` (join + styles) → `features/map-controls/src/components/MapControlsOverlay.jsx` → `apps/web/public/data/narratives.json` **meta only** (it's 901 KB) → `apps/api/fetch_power_data.py` docstring.

**Data contract (V 2026-11-05):** `narratives.json` top keys `generated_at / meta / municipalities[]`; entry ≈ `{id, name, province, lat, lon, trend{slope_c_per_year, p_value, is_significant, direction}, sample{n_years, n_days}, latest, danger fields, narration{en, fil}, series}`. Join is **province-qualified**: `joinKey(name, province)` (D-R7). Currently 112 entries join 114 features, engine joins 111 (B2).

**Write-boundary table (verbatim from `AGENTS.md` — the one rule nobody breaks):** `features/<name>/` → that feature's agent; `core/` → core engine owner (others import); `apps/web/` → web agent; `apps/api/` → pipeline agent; `CONCEPT.md`, `AGENTS.md`, `README.md` (and this HANDOFF.md) → lead/integrator; `.opencode/` → tooling; static JSON narrative bank is written by pipeline, read by web.

**Knowledge graph (built 2026-11-05, private-window openable):**

- [`graphify-out/GRAPH_REPORT.md`](graphify-out/GRAPH_REPORT.md) — audit report
- [`graphify-out/graph.html`](graphify-out/graph.html) — interactive graph, open in a browser, no server
- [`graphify-out/graph.json`](graphify-out/graph.json) — raw graph data (GraphRAG-ready)

Built from the **project content only** (47 files; `.opencode/` tooling docs and the 901 KB `narratives.json` data dump deliberately excluded). Corpus: 324 nodes · 615 edges · 15 communities · 98% EXTRACTED / 2% INFERRED / 0 AMBIGUOUS · 0 LLM tokens (semantic extraction by session agent, not a paid API). Integrity note surfaced by graphify's own diagnostics: 54 dangling-endpoint edges, 29 collapsed same-endpoint edges — the graph is usable but known-lossy; treat it as a map, not ground truth.

- **Communities:** Project Concept and Rules · Web Package Dependencies · Trend Calculation Pipeline · Map Screen Slice · Timeline Map Controls · Narration Rendering · Ranking Table UI · FastAPI Mock Endpoints · POWER Fetch and Heat Index · Render Deploy Config · Root Package Metadata (+4 thin communities omitted from the report).
- **God Nodes** (core abstractions): `render_narration()` (14 edges), `NarrationTest` (13), "Bicol In-Heat Project Concept" (13), `annual_means()` (12), `MapControlsOverlay()` (12).
- **Surprising connections:** `pymannkendall` (pip dep) —semantically-similar→ **Core Trend Engine** — the graph's own arrow on the Python/JS math duplication (D-R4); Narration concept linked to the Landsat LST dataset (narration must explain satellite variables).
- **Hyperedges:** full trend-method pipeline (POWER → Theil-Sen/MK → RF/SHAP → narrative bank); the write-boundary sliced architecture; the satellite-driver data sources.
- **Knowledge gaps:** 9 isolated concept nodes (iHeatMap prior art, SEDAC GPW, PSA/PSGC source, award shaping) — these are the concepts nobody has wired into the code yet, i.e. §3.

## 9. Constraints and warnings

**Process:**
- **Write boundaries are hard** (§8 table). Cross-boundary needs go through the lead, never a direct write.
- **No commit / merge / push without explicit user approval.**
- Cut lines **h30 / h42 / h44** are hard and non-negotiable: leaderboard not done by h30 → drop to local-only progress, no auth.
- Exactly **one challenge** named; only **CORE** items (CONCEPT §8) may be claimed on the project page/video; an unshipped STRETCH item is never presented as a feature; the OUT list is final (no runtime LLM, no LSTM forecasting, no SMAP, no barangay-level HI, no variables beyond §6a).

**Secrets:** the client bundle contains **zero** keys and zero passwords — no exceptions. `EARTHDATA_USERNAME/PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`, optional `FIRMS_MAP_KEY` live only in `apps/api/.env` (never committed; root `.gitignore` covers `.env`/`*.env`). Supabase URL + anon key are public-by-design and RLS-guarded. ⚠️ `apps/web/.env` currently also holds the service-role key (B5) — it is gitignored, but **never reference it via `import.meta.env`** and move it to `apps/api/.env` when convenient.

**Science (carry verbatim):** LST ≠ heat index — satellite skin temperature is much hotter than air; HI comes from POWER `T2M_MAX`+RH, and the LST→HI bridge is quantified by hold-out, never assumed. Municipality is the smallest unit (POWER 0.5° ≈ 55 km can't resolve barangays). Landsat 7 post-2003 SLC-off gaps = no clean pre-2013 LST from L7. Cloud contamination → always report per-municipality sample counts; every result carries its `n`. RF/SHAP ranks drivers as **association, not causation**. Opposite trends in neighbouring municipalities can share one cause — that's the challenge's point, not a bug. Non-significant trends are still reported — significance is a flag (dashed border), not a filter (note: zero non-significant entries in current data, B16).

**Privacy/compliance:** leaderboard and any user-facing identity use a **user-chosen handle, never a real name** — the auth button currently shows the email prefix, which is temporary and must swap to `profiles.username` before any leaderboard exists (code comment in `AuthButton.jsx`). No minor's name/voice/likeness in video or materials. UI in English; narration EN + Filipino (Bicolano = STRETCH, needs a native speaker). Every link must resolve in a logged-out private window (test h44). Attribution box: PAGASA station data, PSA/PSGC boundaries (+ faeldon source pending lead decision, B17), fonts/icons, FIRMS notice if STRETCH ships.

**Document discipline:** this file goes stale the moment `main` moves — its "last verified" date is the first thing a reader should check. When you land work, update §1/§2 status rows and re-stamp the facts you changed. CONCEPT/AGENTS win any conflict with this file.
