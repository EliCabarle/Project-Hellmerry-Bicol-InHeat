# HANDOFF.md

**Resume guide — read this before touching anything.**
Last verified: **2026-11-09** by the handoff-refresh pass for the PR #14 frontend/map/ranking work. Git pin: `main @ 0a55b26` — merge of PR #14 (`EliCabarle/frontend/Agila-Map-Adaptation`; branch commits `dd1398e` 2026-11-08 00:17 + `3f98e8c` 2026-11-08 23:12; main parent `a53df8c`). Working tree clean at verification, before this HANDOFF edit (V 2026-11-09). The prior pin `9f03657` (PR #13) is obsolete.

This file is the **state layer**. It is *not* authority: [`AGENTS.md`](AGENTS.md) (write boundaries, rules) and [`CONCEPT.md`](CONCEPT.md) (concept + decision log) always win on conflict. Every claim below is tagged like this: **(V d/m/y)** = verified in-session on that date; **[UNVERIFIED]** = claimed but not checked here; **[inference]** = reasoned conclusion, marked plainly. Numbers that pass through stale notes and get printed again without re-checking is how handoffs rot — don't be that author.

---

## 1. Goal and current status

**Project:** working title *Bicol In-Heat* — "Be An Earth System Trend Detective!" — for the **2026 NASA Space Apps Challenge**, challenge *"Be An Earth System Trend Detective!"* (exactly one challenge named; statement captured 2026-11-02). Region studied: **Bicol (Region V, Philippines)**, per-municipality.

**The pitch:** NASA/Landsat-era thermometer data says it's warming; what people *feel* is heat + humidity. The app computes the annual peak **heat index** (Rothfusz, from POWER `T2M_MAX` + RH-derived dewpoint) per municipality (1981–2025), finds trends with **Theil-Sen slope + Mann-Kendall (α = 0.05)**, renders them on a map + ranking, and explains *which drivers* (terrain, coast, wind, canopy, land cover, LST) move differently between neighbours — association via RF/SHAP, never claimed causation.

**Current status (V 2026-11-09):** working prototype. **2 of 3 planned screens shipped** — Map + Ranking; Narration is still unbuilt. The map is now satellite-first (Esri World Imagery + reference labels), supports **Trend mode** and **Year mode**, persistent municipality GeoJSON, click-to-fly-to, reset-to-Bicol, a responsive info card/index, and roving-tabindex keyboard navigation. Ranking now has summary stats, search, Warming-rate vs Danger-days sort, saved-only filtering, a sticky desktop table + mobile cards, and a public leaderboard panel. Auth (Google OAuth) + **chosen-handle onboarding** landed; the old “email prefix” display is gone. Data pipeline complete: **114/114 municipalities, 5,130 series rows (114 × 45), all 114 trends significant, zero mojibake** (V 2026-11-09 re-check). `dist/` rebuilt; public and `dist` `narratives.json` SHA-256 identical. **Leaderboard/saved places: partial** — UI states ship, but the live Supabase path is **[UNVERIFIED]** (§6 B18). **Not built:** Narration screen, PWA manifest/service worker, `features/layer-uhi-terrain` driver-layer slice, hold-out validation on real PAGASA data. Tests: engine **14/14 PASS**, year-ramp **4/4 PASS**, ranking **4/4 PASS**, pipeline **32/32 GREEN** (last pipeline run V 2026-11-07). B1/B2 remain **RESOLVED**; B4/B6/B7/B15 are reconciled in §6.

**Cut lines in force (hard, do not renegotiate):** h30 (auth: leaderboard missing → local-only progress), h42 (STRETCH freeze), h44 (video fallback). Details in `CONCEPT.md` §11.

| Item | Status | Verified |
|---|---|---|
| Web scaffold (Vite + React + Tailwind + Leaflet) | Shipped | 2026-11-02 |
| Region map (`BicolMap`) | Shipped — Esri World Imagery + labels, persistent GeoJSON, click-to-fly-to, reset-to-Bicol, z18 | 2026-11-09 |
| Timeline store + `MapControlsOverlay` | Shipped — Trend/Year modes, prev/next/play/slider, initializes at 2025, HUD receives Leaflet map instance | 2026-11-09 |
| Municipality join + choropleth + legend/tooltip | Shipped — 114/114 joined, 5,130 series rows | 2026-11-09 |
| Map a11y (roving tabindex, arrows, Enter/Space, Escape, Home/End, region label) | Shipped | 2026-11-09 |
| Municipality info card + municipality index | Shipped — responsive `bottom-[10.5rem] min-[360px]:bottom-36`; z-760 | 2026-11-09 |
| Ranking screen (summary stats, search, slope/danger sort, saved-only) | Shipped — sticky table + mobile cards, accessible caption, significance pills | 2026-11-09 |
| Saved places (Supabase table + `savedStore`) | Code shipped; **live path [UNVERIFIED]** (migration run state not proven) | 2026-11-09 |
| Leaderboard (public read view) | **Partial** — unavailable/loading/error/empty states ship; **live Supabase path [UNVERIFIED]**; no task/score writes yet | 2026-11-09 |
| Auth (Google OAuth + handle onboarding) | Shipped — `AuthButton` loads/saves `user_profiles.handle`, never email | 2026-11-09 |
| ETL pipeline (POWER → trends → static JSON) | **Complete: 114/114, 5,130 rows, all significant, mojibake 0** | 2026-11-09 |
| Narration screen (screen #3) | **Not started** | 2026-11-09 |
| PWA (manifest + service worker) | **Not started** | 2026-11-09 |
| `features/layer-uhi-terrain` slice | **Empty** (`doc:` AGENTS.md only) | 2026-11-09 |
| Hold-out validation (bias/RMSE) | **Not started** | 2026-11-09 |
| CI (`.github/workflows/`) | **No directory present** | 2026-11-09 |

## 2. What's done

By merge, newest first (dates from `git log`). **Prior phase entry (V 2026-11-07, bug-resolution session — B1/B2/PR-claim fixes):**

- **2026-11-09 — PR #14 merged (`0a55b26`; branch commits `dd1398e` 2026-11-08 00:17 + `3f98e8c` 2026-11-08 23:12; main parent `a53df8c`; working tree clean, V 2026-11-09).** Satellite-first map redesign inspired by Agila: Esri `World_Imagery` basemap + `Reference/World_Boundaries_and_Places` labels (`BicolMap.jsx`); imagery attribution is currently recorded as `Imagery © Esri, Maxar, Earthstar Geographics`, but the live service metadata now says `Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community`; labels metadata says `Esri, HERE, Garmin, (c) OpenStreetMap contributors, and the GIS user community` and is **not yet wired into the labels layer** (B17). `maxZoom=18` verified. One persistent municipality GeoJSON layer with in-place `setStyle` (no 114-feature remount), click-to-select fly-to, reset-to-Bicol, stable styling. HUD now receives the Leaflet map instance from `BicolMap` (`ref={setMap}` → `map={map}`) because `MapControlsOverlay` sits outside `MapContainer`; this fixes the prior `useMap` crash. Roving-tabindex keyboard nav: one tab stop, arrow keys move between municipalities, Enter/Space select, Escape closes, Home/End jump, `role="region"` + per-feature `aria-label`. Trend/Year modes: fixed trend ramp `[0.03, 0.065]`, fixed year ramp `[31, 36.5]` with breaks `31,32,33,34,35,36.5` (`yearRamp.js`); timeline prev/next/play/slider switch to Year mode and initialize at 2025; significance remains a solid/dashed border flag, never a filter. New UI/files: `MunicipalityLegend`, `MunicipalityInfoCard`, `MunicipalityIndex`, `Icons`, `yearRamp.js`, `test_year.mjs`; responsive info card clears the timeline at 320/375 px; local `favicon.svg` fixes the `/favicon.ico` 404. Ranking redesign: summary stats, search, Warming-rate vs Danger-days sort, result count, empty state, sticky desktop table + mobile cards, accessible `<caption>`, significance pills, saved-only filter + save/unsave, public leaderboard `<details>` with unavailable/loading/error/empty states. Auth: `AuthButton` loads/saves a chosen handle via `apps/web/src/lib/profile.js` (`user_profiles.handle`, 3–20 `[A-Za-z0-9_]`, case-insensitive unique); the old email-prefix behavior is gone. Supabase: `supabase/migrations/0002_saved_municipalities.sql` + `0003_user_profiles.sql` (creates public `leaderboard` view) added — **run state not re-verified**; `apps/api/migrations/0002_top_drivers.sql` is the separate top-drivers migration, operator-confirmed run 2026-11-09, but its schema state still deserves the SQL check in §6. `dist/` rebuilt. **Follow-ups:** live Supabase leaderboard/saved paths [UNVERIFIED]; `0002_top_drivers.sql` is not absent — it lives outside `supabase/migrations/`, so the old “absent” note was a path error.

- **2026-11-07 (uncommitted at writing time, lead approval pending)** — the root cause of the user-reported "not fixed" symptoms: PR #11 fixed the *code* but (a) never regenerated the artifacts the PWA reads, (b) its Supabase push had never succeeded (tables empty, migration unrun), (c) the working checkout didn't even contain it. This session: re-applied Wave-1 pipeline hardening that a mid-session pull wiped (province-qualified slug ids in `generate_static_json.py` via NFKD `slugify()`, explicit `encoding="utf-8"` on `calculate_trends.py` `read_csv`, regression tests incl. the 5-LGU id/mojibake matrix; **wrote the missing `apps/api/validate_pagasa.py`** that PR #11's tests imported but never committed); regenerated `output/narratives.json` + `apps/web/public/data/narratives.json` from the recovered clean 1,873,704-row CSV (re-pull NOT needed — CSV verified 114 pairs × 45 years, UTF-8 clean); ran `calculate_drivers.py` on the full 1.5M-row model (R²_test 0.72, drivers.json 114 rows); Playwright `@cli`-driven E2E on `npm run dev` verified: legend **"Data: 114 of 114"**, 0 `Trend data pending` tooltips, Bato(CS +0.031)/Bato(Cat +0.056) + San Fernando(CS +0.031)/San Fernando(Mas +0.042) as distinct ranking rows with 45-year samples, `Sagñay` correct everywhere, **0 mojibake occurrences on the map + ranking DOM**, no React duplicate-key console warnings; `dist/` rebuilt (was a stale 48 KB mock), secret-scan of bundle clean; screenshots in `.playwright-cli/page-2026-11-0*.png`. **Follow-ups since resolved:** the service-role secret was supplied and the Supabase push completed 114/114 (see §6a); the commit landed. The historical snapshot above is preserved so the failure mode is not forgotten.

- **PR #9 `cd205af` (2026-11-04 22:56)** — *feat: scale POWER data pull from 6 → 114 Bicol municipalities.* `apps/api/fetch_power_data.py` scaled up; regenerated `apps/web/public/data/narratives.json` (+33,806 lines → 901,402 B). Actual data anatomy at the time (V 2026-11-05; historical — now 114/114, see §6 B2): **112 entries** (two LGUs missing entirely), `meta` = Theil-Sen + Mann-Kendall original_test, α 0.05, danger threshold **42 °C**, period 1981-01-01 → 2025-12-31, Rothfusz HI from `T2M_MAX` + RH from `T2MDEW`, `generator: "template"` (no LLM yet — sanctioned fallback, CONCEPT §6d).
- **PR #8 `3aa1b2e` (21:31)** — all map/ranking frontend work (16 files): tab shell `apps/web/src/app.jsx` (brand · Map/Ranking tabs · auth slot), `useBicolData.js` fetch hook, `AuthButton`, tailwind features glob, `features/gamified-dashboard/*` (RankingScreen, RankingTable, `ranking.js`, 4/4 tests), `features/map-controls/*` (BicolMap municipality layer, legend, tooltip, `gis/engine.js`, engine tests).
- **`e127059` (21:26)** — auth/layout fix landed from the lead session: OAuth button moved **in-flow into the header** (was a `fixed` `z-[1000]` pill that floated over the `z-[700]` map controls — §4 D-R1), graceful "Sign-in unavailable" when Supabase env is absent, `@supabase/supabase-js ^2.118.0` dep.
- **PR #6 `e0385d8` (19:48)** — auth re-land after revert: `AuthButton.jsx`, `apps/web/src/lib/supabase.js` (null-client degrade), `supabase/migrations/0001_profiles.sql` (handle-only profiles).
- **PR #3 `440a379` / PR #2 `3b6fa90` / PR #1** — `MapControlsOverlay` + `timelineStore`; full ETL pipeline in `apps/api` (`fetch_boundaries.py`, `fetch_power_data.py`, `calculate_trends.py`, `generate_static_json.py`, `push_to_supabase.py`, `seed_locations.py`, `main.py` FastAPI, `test_pipeline.py`); initial map engine.
- **Data assets (V 2026-11-05):** `apps/web/public/data/bicol-municipalities.geojson` — **114 features, 7 cities**, props `adm3_en` / `adm2_psgc` / `geo_level` (Mun/City) / **`province`** (needed for join — see D-R7), `metadata.source: "faeldon/philippines-json-maps"`, region "Bicol (Region V)". `features/map-controls/src/data/ph-regions.geojson` — 17 ADM1 region outlines (~1.1 MB, in-bundle).
- **Migrations (manual SQL):** `supabase/migrations/0001_profiles.sql` (profiles + progress, handle-only, not idempotent) → `001_bicol_schema.sql` (PostGIS municipalities + centroid fn) → `0002_saved_municipalities.sql` (saved places, RLS) → `0003_user_profiles.sql` (merged profile/handle + public `leaderboard` view). Run by hand in the Supabase SQL Editor — no migrations CLI/runner exists. Separate pipeline migration: `apps/api/migrations/0002_top_drivers.sql` adds `municipality_trends.top_drivers` and the `(name, province)` unique index; operator-confirmed run 2026-11-09, schema not re-checked here.
- **Knowledge graph (V 2026-11-05):** `graphify-out/` built this session — see §8 "Knowledge graph".

**Test truth (V 2026-11-09 unless noted):** `node features\map-controls\test_engine.mjs` → **14/14 PASS**; `node features\map-controls\test_year.mjs` → **4/4 PASS**; `node features\gamified-dashboard\test_ranking.mjs` → **4/4 PASS**; `uv run python -m unittest test_pipeline` → **32/32 GREEN** (last run V 2026-11-07; needs `.venv` in `apps/api`). `npm run build` succeeds: 141 modules; JS **1,772,177 B** (~1,772.18 kB) minified / **433.57 kB** gzip; CSS **39,768 B** (~39.77 kB) / **12.17 kB** gzip; only the Vite >500 kB chunk warning. Playwright QA at 320/375/768/1440 px: no horizontal overflow, no console/page errors, z18 zoom, Year mode, keyboard selection, info card above timeline, 114 ranking rows, search + responsive table/card switching verified (session evidence, V 2026-11-09). Re-checked read-only this pass: `narratives.json` = 114 entries / 5,130 series rows / all 114 significant / 492,876 bytes / `generated_at 2026-11-07T13:41:45+00:00`; public and `dist` copies SHA-256 identical (V 2026-11-09).

## 3. What's next

Priority order, with the **write-boundary owner** for each (§9):

1. **~~B1 — engine test RED~~ RESOLVED (V 2026-11-09):** `test_engine.mjs` is 14/14 PASS.
2. **~~B2 — data completeness~~ RESOLVED (V 2026-11-09):** 114/114 municipalities, 5,130 series rows, all significant; `Sagñay` clean; ids are province-qualified slugs.
3. **Narration screen** (3rd CORE screen) + `features/chatbot-llm` slice — currently zero code. EN + Filipino templates already exist in `narratives.json` `narration.{en,fil}` — the screen mostly reads and renders them. Owner: **chatbot-llm agent**.
4. **PWA manifest + service worker** — `CONCEPT.md` §11 planned this for h36–42; nothing exists (§6 B3). Owner: **web agent**.
5. **`features/layer-uhi-terrain`** — LST/canopy/land-cover layers for the driver story. Owner: **layer-uhi agent**.
6. **Validation** (hold out one PAGASA station + last 3 years; report bias/RMSE) — blocked on §6 (a) PAGASA route. Owner: **pipeline agent**.
7. **Leaderboard/saved live-path verification** — UI ships; verify `user_saved_municipalities`, `user_profiles`, and the `leaderboard` view are actually applied in the hosted project, and that save/unsave + Top-10 read work with a real session. If unverified by h30, keep local-only fallback (D-R9). Owner: **gamified agent + web**.
8. **Housekeeping (lead, approval-gated — do not do unprompted):** prune stale local branches + `origin/*` refs (`git fetch --prune`); flip CONCEPT §13 / AGENTS.md "POWER start year" OPEN row → VERIFIED-in-code; decide faeldon attribution (B17); reconcile env-var names (B8).
9. **Deploy reality check** — `render.yaml`/`Procfile` exist, unverified; `docker-compose.yml` is 0 bytes (§6 B13).
10. **Supabase migration reconciliation** — confirm whether `0002_top_drivers.sql` (in `apps/api/migrations/`) and the `supabase/migrations` sequence were actually applied; the top-drivers run is operator-confirmed 2026-11-09 but schema state remains [UNVERIFIED] (§6 B18).

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
| D-R11 | Basemap = **Esri World Imagery + Reference/World_Boundaries_and_Places labels** | Satellite-first Agila-inspired look; labels improve place legibility; attribution should follow each service's `copyrightText` metadata (B17) | PR #14, `dd1398e` |
| D-R12 | **One persistent municipality GeoJSON layer**; styles updated in place; **HUD receives the Leaflet map instance** from `BicolMap` | Remounting 114 features on every selection felt janky; `useMap` only works inside `MapContainer`, and `MapControlsOverlay` is a sibling | PR #14, `dd1398e` |
| D-R13 | **Fixed Trend/Year ramps** (`0.03–0.065 °C/yr`; `31–36.5 °C`) + significance as solid/dashed border, never a filter | Stable colour meaning across municipalities/years; keeps non-significant trends visible (CONCEPT science rule) | PR #14, `dd1398e` |
| D-R14 | **Responsive info card + roving-tabindex keyboard map** | 114 tab stops is unusable; card must clear the timeline at 320/375 px; one tab stop + arrows is the accessible pattern | PR #14, `dd1398e` |
| D-R15 | **No new runtime dependencies** for the redesign | Reused React/Leaflet/Tailwind; `apps/web/package.json` unchanged between `9f03657` and `0a55b26` (V 2026-11-09) | PR #14 |

## 5. Dead ends

Paths that were tried and rejected/abandoned — with the reason, so nobody re-derives them:

1. **PR #4 auth → reverted by PR #5 → re-landed as PR #6.** First auth attempt (`user-data-part`, `267d09a` 00:32) was pulled 4 minutes later (revert-branch merged `a5edc1a` 00:36), then re-landed as `user-data2.0` same day with Google OAuth added. The *live* auth lineage is PR #6.
2. **Fixed `z-[1000]` auth pill** — see D-R1; replaced by the in-flow header pill.
3. **`core/` as the shared engine home** — it contains only an AGENTS.md and empty dirs; the real JS engine lives at `features/map-controls/src/gis/engine.js`, and the Python trend math was duplicated into `apps/api/calculate_trends.py` (D-R4). Drift acknowledged, not fixed — route fixes through the lead.
4. **`.github/workflows/`** — no directory present; no CI was ever stood up.
5. **`docker-compose.yml`** — 0-byte placeholder.
6. **Mock FastAPI endpoints** — `main.py` (`/locations`, `/anomalies`, `/verdant`) returns hardcoded 7-municipality JSON; superseded by the static-JSON architecture, never wired to real data (V 2026-11-05).
7. **“13/14 engine tests” as a stable truth** — historical: PR #9 shipped data without updating the test. As of `0a55b26` the suite is **14/14 PASS** (V 2026-11-09); do not quote 13/14 as current.
8. **`push_to_supabase.py` / `seed_locations.py` as unverified run paths** — `push_to_supabase.py` did complete successfully on 2026-11-07 (114 rows verified by REST read-back); `seed_locations.py` remains unverified, and env-var names still differ (§6 B8). `supabase` is now in `requirements.txt` (B7 resolved).
9. **Stale AGENTS sub-contract workboards** — `apps/web`, `apps/api`, `map-controls` boards still say `todo` for shipped work. The boards stalled; trust git + THIS file over the workboards' Todo lists.
10. **HUD calling `useMap()` outside `<MapContainer>`** — `MapControlsOverlay` is a sibling of `MapContainer`, so `useMap()` had no context and crashed. Fixed by lifting the instance: `ref={setMap}` on `MapContainer` → `map={map}` prop. Do not reintroduce `useMap` in the overlay.
11. **Remounting the municipality `<GeoJSON>` layer on every selection** — 114 features re-created per click made zoom feel janky. Rejected for one persistent layer + in-place `setStyle`; react-leaflet does not re-run `style()` on state change, hence the explicit effect.

## 6. Open questions and blockers

**(a) Supabase push: RESOLVED (V 2026-11-07):**

| Item | Status | Resolve how |
|---|---|---|
| Real service-role secret | **Placed** | The lead provided the real JWT (`eyJ...`) via `apps/web/.env` `SUPABASE_SERVICE_ROLE_KEY`; staged into `apps/api/.env` as `SUPABASE_SERVICE_KEY` (gitignored). ⚠️ B5 residual: the secret still lives in `apps/web/.env` — lead should remove it there and keep it in `apps/api/.env` only |
| Migration `apps/api/migrations/0002_top_drivers.sql` | **RAN — operator-confirmed 2026-11-09; schema re-check pending** | Adds `municipality_trends.top_drivers` + the `(name, province)` unique index. The 114 successful conflict upserts are evidence the index was live; run the §6 B18 schema queries to re-confirm |
| Push result | **114/114 pushed, verified** | REST read-back: 114 rows, all with `top_drivers` + `narration_en`, 2×Bato (CS/Cat), 2×San Fernando (CS/Mas), `Sagñay` clean UTF-8, 0 mojibake; slopes 0.030–0.0623 °C/yr |
| Stale pre-PR-11 rows | **Deleted** | 5 orphan rows (bare `Naga`/`Legazpi`/`Sorsogon`/`Masbate` + garbage `meta` row) removed via REST DELETE → final count exactly 114 |
| Env-var name mix | Residual (B8) | Script reads `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`; `apps/web/.env` uses `SUPABASE_SERVICE_ROLE_KEY`/`VITE_*` — reconcile names later, harmless now |

**(b) Carried OPEN from `CONCEPT.md` §13 / `AGENTS.md`:**

| Item | Status | Resolve how |
|---|---|---|
| Event name + local close time | OPEN | Check live challenge page at event start (h0) |
| Challenge URL / iHeatMap URL resolve logged-out | [UNVERIFIED] | Private window test (h0 / h44) |
| PAGASA access route + Region V station list | OPEN | h6 — blocks validation (§3.6) |
| Exact Region V LGU count | OPEN — **never estimate** | Count from official PSA/PSGC source (h6) |
| POWER daily start year | **Verified-in-code: 1981** (V, `fetch_power_data.py` docstring 2026-11-03) | Lead: flip the CONCEPT/AGENTS rows |

**(c) Repo-state blockers (each with owner):**

| # | Blocker | Status / owner |
|---|---|---|
| B1 | Engine test RED 13/14 on `main` | **RESOLVED (V 2026-11-09):** 14/14 PASS — no action |
| B2 | `narratives.json` 112 entries ≠ 114 features | **RESOLVED (V 2026-11-09):** 114/114, 5,130 rows, all significant |
| B3 | PWA manifest/SW absent while docs imply it exists | OPEN — web |
| B4 | No `apps/api/.env` | **RESOLVED for file presence (V 2026-11-09):** `apps/api/.env` exists with `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`; Earthdata credentials not exercised [UNVERIFIED] — pipeline |
| B5 | **`apps/web/.env` still holds server-side keys incl. `SUPABASE_SERVICE_ROLE_KEY`** alongside `SUPABASE_URL`/`VITE_*` — boundary-intent violation; Vite only ships `VITE_*` so the bundle is safe [inference]; never print the value; move server keys to `apps/api/.env` | OPEN — lead |
| B6 | ETL pipeline never verified on this machine | **RESOLVED/CLOSED (V 2026-11-09):** `apps/api/data` + `output` exist (`power_daily_full.csv`, `trends.json`, `drivers.json`, `narratives.json`); last full run V 2026-11-07, not re-run this pass — pipeline |
| B7 | `requirements.txt` missing `supabase` | **RESOLVED (V 2026-11-09):** `supabase` present |
| B8 | Env-var name chaos: `push_to_supabase.py` wants `SUPABASE_SERVICE_KEY`, `seed_locations.py` tries `SERVICE_ROLE_KEY`/`SUPABASE_KEY`/`VITE_*`, render.yaml sets `SUPABASE_KEY`, docs say `SUPABASE_SERVICE_ROLE_KEY` | OPEN (partial) — lead + pipeline |
| B9 | Narration screen unmounted; `features/chatbot-llm` empty | OPEN — chatbot-llm |
| B10 | `features/layer-uhi-terrain` empty | OPEN — layer-uhi |
| B11 | Validation absent; blocked by (a) PAGASA | OPEN — pipeline |
| B12 | No CI; `gh` CLI not installed | OPEN — lead |
| B13 | Deploy path (Render free / Procfile) untested; docker-compose empty | OPEN — lead |
| B14 | Stale local branches (`Core-Map-Engine-and-Map-Controls`, `frontend/mapcontrols`, `user-data2.0`, `frontend/boundaries`, **`feature/bicol-trend-analysis` local `07bd2b8` diverged from merged `861c967`**) + stale `origin/*` tracking refs | OPEN — lead |
| B15 | `apps/web/dist/` stale | **RESOLVED (V 2026-11-09):** rebuilt/committed; JS 1,772,177 B, CSS 39,768 B; `narratives.json` public/dist SHA-256 identical |
| B16 | All trends significant → dashed-border path untested on real data | OPEN — pipeline; now **114/114** significant |
| B17 | faeldon source licence/attribution not recorded; **extend to Esri imagery + labels attribution** | OPEN — lead. Imagery metadata: `Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community`; labels: `Esri, HERE, Garmin, (c) OpenStreetMap contributors, and the GIS user community`; labels layer currently lacks an `attribution` prop |
| B18 | Supabase migration run state unverified | OPEN — pipeline/lead: `0002_top_drivers.sql` is operator-confirmed 2026-11-09 at `apps/api/migrations/`; `supabase/migrations/0001_profiles` → `001_bicol_schema` → `0002_saved_municipalities` → `0003_user_profiles` run order/state not proven. Query schema/index/policies before marking live |

**B18 schema check (run read-only in the Supabase SQL Editor, V 2026-11-09):**

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'municipality_trends'
  and column_name = 'top_drivers';

select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'municipality_trends';

select count(*) as total_rows, count(top_drivers) as rows_with_drivers
from public.municipality_trends;

select name, province, count(*)
from public.municipality_trends
group by name, province
having count(*) > 1;

select table_name, table_type
from information_schema.tables
where table_schema = 'public'
order by table_name;

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

select * from public.leaderboard limit 10;
```

Expected: `top_drivers` is `jsonb`; a unique index covers `(name, province)`; 114 total rows and 114 non-null `top_drivers`; zero duplicate pairs; `user_profiles`, `user_saved_municipalities`, and the `leaderboard` view exist with the expected policies. An empty `leaderboard` is valid until profiles exist.

**Live-path smoke test:** sign in, create a handle, save one municipality, refresh **Saved only**, then unsave it. In SQL, confirm one row appears/disappears in `user_saved_municipalities`, the handle appears in `user_profiles`, and `leaderboard` returns it. Only that signed-in round trip marks the live path verified.

## 7. Environment and how to run things

Paths: repo = `C:\Users\winst\Desktop\NASA`; shell = PowerShell 5.1.

**Toolchain (V 2026-11-04):** Node v24.19.0, npm 12.0.2, `uv` at `C:\Users\winst\.local\bin\uv.exe`. Python is a **trap** (V): `python` = msys64 3.11.7 with **no pip**; `pip` belongs to Python 3.14 — installing with `pip` then running `python` **will not see the packages**. Use `uv` for anything Python: `uv venv apps/api/.venv` → `uv pip install -r apps/api/requirements.txt` → run scripts with `uv run` from `apps/api`. Pipeline commands were verified V 2026-11-07; uvicorn/FastAPI and deploy paths remain [UNVERIFIED].

**Web (verified flow):**

```
cd apps\web
npm install
npm run dev                              # Vite 5 dev server
npm run build                            # 141 modules; JS 1,772,177 B / 433.57 kB gzip; CSS 39,768 B / 12.17 kB gzip; only >500 kB chunk warning
npm run preview -- --port 4173 --strictPort
```

Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` in `apps/web/.env` (exists; absent → app still works, auth shows "Sign-in unavailable"). `apps/api/.env` now exists with `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`; `apps/web/.env` still also contains `SUPABASE_SERVICE_ROLE_KEY` (B5). Server-side keys must live only in `apps/api/.env` — never in the client bundle.

**Tests:**

```
node features\map-controls\test_engine.mjs         # expect 14/14 PASS
node features\map-controls\test_year.mjs           # expect 4/4 PASS
node features\gamified-dashboard\test_ranking.mjs  # expect 4/4 PASS
uv run python -m unittest test_pipeline -v         # expect 32/32 (needs .venv in apps/api)
```

**Playwright QA caveat (V 2026-11-09):** the responsive/keyboard/zoom QA ran against the installed Chrome channel (`--channel chrome`), not bundled Chromium. Record the channel when reproducing so a future run does not silently differ.

**API server (after deps):** from `apps/api`, `uvicorn main:app --reload` → `GET /` status JSON. Endpoints are **mocks** (V) — not part of the real data path.

**ETL pipeline (from `apps/api`, order per docstrings; `--out` cross-boundary write is documented):**

1. `python fetch_boundaries.py` → writes `../web/public/data/bicol-municipalities.geojson` (network: faeldon GitHub release)
2. `python fetch_power_data.py` → `data/*.csv` (NASA POWER, no auth; ~45 yr × 114 LGUs is roughly an hour of network; optional `--start/--end/--out`)
3. `python calculate_trends.py` → `output/trends.json`
4. `python generate_static_json.py` → `../web/public/data/narratives.json`
5. `python -m unittest test_pipeline -v` (offline; needs pandas)
push/seed scripts additionally need `apps/api/.env` + the `supabase` package; B4/B7 are resolved, but env-var naming remains inconsistent (B8).

**Supabase (hosted, no local process):** run the manual SQL in this order in the SQL Editor: `supabase/migrations/0001_profiles.sql` → `001_bicol_schema.sql` → `0002_saved_municipalities.sql` → `0003_user_profiles.sql`. `001` needs PostGIS; `0001`, `0002`, and `0003` are not idempotent for `CREATE TABLE`. `0003` creates the public `leaderboard` view. The separate pipeline migration is `apps/api/migrations/0002_top_drivers.sql` (adds `top_drivers` + the `(name, province)` unique index); operator-confirmed run 2026-11-09, schema state [UNVERIFIED] (B18).

**Deploy [UNVERIFIED]:** `Procfile` + `render.yaml` describe a Render.com free web service (Singapore, Python 3.10.12) running `uvicorn apps.api.main:app`; `SUPABASE_URL`/`SUPABASE_KEY` are set in the Render dashboard (`sync: false`). Nothing here has been exercised.

**Tooling quirks — trust these before "fixing" anything:**

- Any `height: auto` wrapper between `#root` and the Leaflet container **collapses the map to 0px** (guarded by a comment in `app.jsx` height chain: `html/body/#root` = 100% → `div.h-full` column → `main.min-h-0.flex-1` → map `h-full`).
- Tailwind content globs **must** keep `'../../features/**/*.{js,jsx}'` or every feature component ships unclassed. Build tripwire: `Select-String dist\assets\*.css -Pattern 'backdrop-blur'` — feature-only class; if it's gone, the glob got lost.
- `.geojson` imports need the `?raw` suffix; Vite bare imports (`react`, `react-leaflet`, `leaflet`) resolve through explicit aliases in `apps/web/vite.config.js` (`@features`, `@core` + bare deps → `apps/web/node_modules`).
- z-index bands: map frame vignette **500** (`.bih-map-frame::after`, `index.css`) / legend + status **600** / map error **620** / controls overlay **700** / municipality index backdrop **755** / index panel + info card **760**; auth pill has **no z-index** (D-R1).
- PowerShell console: em-dashes render as mojibake but are intact on disk; stdout/stderr can interleave out of order; the write-tool `JSON Parse error: Unexpected EOF` is often cosmetic — verify the file on disk.
- Windows + Python multiprocessing: graphify notes it needs an importable `__main__`; run snippets from `.py` files, not `-c`.

## 8. Key files and context map

**Corrected layout (AGENTS.md layout says `core/` holds the engine — it doesn't; V):**

```
apps/web/     PWA shell: src/app.jsx (header: brand | Map/Ranking tabs | AuthButton),
              src/useSession.js (session owner), src/useBicolData.js,
              src/components/AuthButton.jsx, src/lib/profile.js, src/lib/supabase.js,
              public/favicon.svg, public/data/{bicol-municipalities.geojson, narratives.json}
apps/api/     ETL + FastAPI (full file list in §2); ONLY place server secrets may be read
core/         EMPTY except AGENTS.md — the live JS engine is in features/, drift noted (§5.3)
features/     map-controls (BicolMap, overlay, timeline, yearRamp, legend/index/info-card, engine) |
              gamified-dashboard (RankingScreen, RankingTable, ranking, savedStore, leaderboardStore) |
              chatbot-llm + layer-uhi-terrain (empty scaffolds)
supabase/     migrations/ (0001_profiles, 001_bicol_schema, 0002_saved_municipalities, 0003_user_profiles)
apps/api/migrations/  0002_top_drivers.sql (pipeline-side schema addition)
```

**Reading order for a newcomer:** `AGENTS.md` → `CONCEPT.md` §11 + §13 → `README.md` → `apps/web/src/app.jsx` → `src/useSession.js` → `src/useBicolData.js` → `features/map-controls/src/BicolMap.jsx` → `src/gis/engine.js` (join + styles) → `src/gis/yearRamp.js` → `src/components/MapControlsOverlay.jsx` → `src/components/MunicipalityInfoCard.jsx` → `features/gamified-dashboard/src/RankingScreen.jsx` → `src/components/RankingTable.jsx` → `apps/web/src/lib/profile.js` → `apps/web/public/data/narratives.json` **meta only** (492,876 B) → `apps/api/fetch_power_data.py` docstring.

**Data contract (V 2026-11-09):** `narratives.json` top keys `generated_at / meta / municipalities[]`; entry ≈ `{id, name, province, lat, lon, trend{slope_c_per_year, p_value, is_significant, direction}, sample{n_years, n_days}, latest, danger fields, narration{en, fil}, series}`. Join is **province-qualified**: `joinKey(name, province)` (D-R7). Currently **114 entries join 114 features** (114/114), **5,130 series rows** (114 × 45), **all 114 trends significant**; `generated_at 2026-11-07T13:41:45+00:00`, 492,876 bytes; public and `dist` copies SHA-256 identical.

**Write-boundary table (verbatim from `AGENTS.md` — the one rule nobody breaks):** `features/<name>/` → that feature's agent; `core/` → core engine owner (others import); `apps/web/` → web agent; `apps/api/` → pipeline agent; `CONCEPT.md`, `AGENTS.md`, `README.md` (and this HANDOFF.md) → lead/integrator; `.opencode/` → tooling; static JSON narrative bank is written by pipeline, read by web.

**Knowledge graph (built 2026-11-05, private-window openable):**

> **Staleness note (V 2026-11-09):** this graph predates the 2026-11-08 PR #14 frontend/map/ranking changes. Treat its Map Screen and Ranking Table communities as historical until rebuilt.

- [`graphify-out/GRAPH_REPORT.md`](graphify-out/GRAPH_REPORT.md) — audit report
- [`graphify-out/graph.html`](graphify-out/graph.html) — interactive graph, open in a browser, no server
- [`graphify-out/graph.json`](graphify-out/graph.json) — raw graph data (GraphRAG-ready)

Built from the **project content only** (47 files; `.opencode/` tooling docs and the large `narratives.json` data dump deliberately excluded). Corpus: 324 nodes · 615 edges · 15 communities · 98% EXTRACTED / 2% INFERRED / 0 AMBIGUOUS · 0 LLM tokens (semantic extraction by session agent, not a paid API). Integrity note surfaced by graphify's own diagnostics: 54 dangling-endpoint edges, 29 collapsed same-endpoint edges — the graph is usable but known-lossy; treat it as a map, not ground truth.

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

**Secrets:** the client bundle contains **zero** keys and zero passwords — no exceptions. `EARTHDATA_USERNAME/PASSWORD`, the Supabase service-role key (env-var name still inconsistent, B8), and optional `FIRMS_MAP_KEY` live only in `apps/api/.env` (never committed; root `.gitignore` covers `.env`/`*.env`). Supabase URL + anon key are public-by-design and RLS-guarded. ⚠️ `apps/web/.env` currently also holds the service-role key (B5) — it is gitignored, but **never reference it via `import.meta.env`** and move it to `apps/api/.env` when convenient.

**Science (carry verbatim):** LST ≠ heat index — satellite skin temperature is much hotter than air; HI comes from POWER `T2M_MAX`+RH, and the LST→HI bridge is quantified by hold-out, never assumed. Municipality is the smallest unit (POWER 0.5° ≈ 55 km can't resolve barangays). Landsat 7 post-2003 SLC-off gaps = no clean pre-2013 LST from L7. Cloud contamination → always report per-municipality sample counts; every result carries its `n`. RF/SHAP ranks drivers as **association, not causation**. Opposite trends in neighbouring municipalities can share one cause — that's the challenge's point, not a bug. Non-significant trends are still reported — significance is a flag (dashed border), not a filter (note: zero non-significant entries in current data, B16).

**Privacy/compliance:** leaderboard and any user-facing identity use a **user-chosen handle, never a real name** — `AuthButton` now onboards via `apps/web/src/lib/profile.js` (`user_profiles.handle`, 3–20 `[A-Za-z0-9_]`, case-insensitive unique) and displays that handle; it never shows the Google name/email. No minor's name/voice/likeness in video or materials. UI in English; narration EN + Filipino (Bicolano = STRETCH, needs a native speaker). Every link must resolve in a logged-out private window (test h44). Attribution box: PAGASA station data, PSA/PSGC boundaries, **Esri World Imagery (`Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community`) + Reference labels (`Esri, HERE, Garmin, (c) OpenStreetMap contributors, and the GIS user community`; labels-layer attribution still to be wired into the layer)**, faeldon source pending lead decision (B17), fonts/icons, FIRMS notice if STRETCH ships.

**Document discipline:** this file goes stale the moment `main` moves — its "last verified" date is the first thing a reader should check. When you land work, update §1/§2 status rows and re-stamp the facts you changed. CONCEPT/AGENTS win any conflict with this file.

**Recent Findings cuz of changes in the training model weve used**

 "Anything that quotes the old 0.72 (HANDOFF.md, project page, video script) is now contradicted by the artifact."