<!-- generated-by: gsd-doc-writer -->

# Feature Slices — `features/`

Cross-slice index of the `features/` directory. Bicol In-Heat is organized as four **feature slices**, each a self-contained vertical with its own agent sub-contract (`AGENTS.md`), source, and tests. This doc says what each slice owns, its state, how the write-boundary contract holds them apart, and how `FEATURE-PROMPTS.md` maps onto them.

**State authority:** the root `AGENTS.md` "What exists now" table (verified 2026-11-10) is authoritative for built vs. not-started. Several per-slice workboards are stale (e.g. `map-controls/AGENTS.md` still lists "todo" items that are built); trust the root code map and re-confirm on disk before relying on a workboard row.

## Overview

```
features/
├── FEATURE-PROMPTS.md        10 engineering briefs (M1-M3 / L1-L3 / G1-G2 / N1-N2)
├── map-controls/             map + time scrubber            — built
├── layer-uhi-terrain/        LST / canopy / land-cover      — contract only, not started
├── gamified-dashboard/       ranking / progress / leaderboard — built
└── chatbot-llm/              narration + glossary           — contract only, not started
```

Two slices have source today; two hold only their `AGENTS.md` contract. The four slices plus `apps/web` (shell), `apps/api` (ETL + secrets), and `core/` (shared math) make up the whole product layout.

## Slice index

| Slice | Owns | State (root code map, 2026-11-10) | Real files on disk |
|---|---|---|---|
| `map-controls` | Map screen: Region V basemap, 114-municipality layer, time scrubber, tooltips, significance-as-border-pattern | **built** | `src/BicolMap.jsx`, `src/components/{MapControlsOverlay,MunicipalityIndex,MunicipalityInfoCard,MunicipalityLegend,Icons}.jsx`, `src/components/municipalityTooltip.js(.css)`, `src/gis/engine.js`, `src/gis/yearRamp.js`, `src/state/timelineStore.js`, `src/data/ph-regions.geojson`, `test_engine.mjs`, `test_year.mjs` |
| `gamified-dashboard` | Ranking screen, progress, leaderboard | **built** | `src/{DashboardScreen,RankingScreen}.jsx`, `src/{ranking,savedStore,leaderboardStore,progressStore}.js`, `src/components/{RankingTable,QuestsTab,Leaderboard,HistoryTab,HeatBar}.jsx`, `test_{ranking,saved,progress}.mjs`, `ATTRIBUTION.md` |
| `layer-uhi-terrain` | Layer registry, LST, canopy, land-cover overlays | **not started** | `AGENTS.md` only |
| `chatbot-llm` | Narration renderer, variable glossary, template fallback | **not started** | `AGENTS.md` only |

Both started slices expose a barrel at `{slice}/index.js`:

- `features/map-controls/index.js` — default-exports `BicolMap.jsx`, plus the GIS engine helpers (`joinKey`, `buildNarrativeIndex`, `joinNarratives`, style selectors), the timeline store (`timelineStore`, `createTimelineStore`, `canToggleLayer`, …), and the scrubber hooks (`useTimelineState`, `useTimelineActions`).
- `features/gamified-dashboard/index.js` — default-exports `DashboardScreen.jsx` and `rankMunicipalities` from `src/ranking.js`.

## AGENTS.md sub-contract

Each slice directory carries its own `AGENTS.md`, a sub-contract under the root `AGENTS.md` + `CONCEPT.md`, owned by that slice's feature agent. All four share the same shape:

- **Jurisdiction** — the one path the slice may write (`features/<name>/**`), an explicit must-not-touch list, and the cross-boundary rule: request via the lead, never a direct write into another boundary.
- **Interface contracts** — what the slice depends on read-only and what it provides to the web shell and sibling slices.
- **Guardrails — project-wide** — CORE-only claims, UI English, hard cut lines h30/h42/h44.
- **Guardrails — this slice** — the science and product rules that are regressions if broken, e.g.:
  - `map-controls`: municipality is the smallest unit; significance is a flag, not a filter; no smoothing of neighbouring opposite trends; scrubber notifies layers through the state contract, not by poking internals.
  - `layer-uhi-terrain`: LST ≠ heat index (skin vs. air, never one ramp); Landsat 7 SLC-off gaps never shown as clean; sample counts surfaced.
  - `gamified-dashboard`: handle-only leaderboard, never a real name; h30 cut line — leaderboard not done → local-only progress, no auth, no renegotiation; no daily tasks.
  - `chatbot-llm`: the narration bank has no runtime LLM; the QA chatbot is the one exception and calls only the server-side `POST /api/qa` endpoint (key stays in `apps/api/.env`). The LLM never generates numbers — it retrieves and cites; EN + Filipino narration, Bicolano = STRETCH; association-not-causation wording.
- **Workboard** — owner-editable CORE/STRETCH status table (verify against the root code map).
- **Status** — what has been verified on disk and when.

## Write-boundary contract

The root `AGENTS.md` Role / Write-Boundary Contract governs everyone; each slice's Jurisdiction section restates it locally.

| Path(s) | Owner | Note |
|---|---|---|
| `features/<name>/` | That feature's agent only | Its `AGENTS.md` is the sub-contract |
| `core/` | Core engine owner | Others import; nobody edits |
| `apps/web/` | Web/PWA agent | Client bundle source |
| `apps/api/` | Data-pipeline agent | Only place server secrets are read |
| `CONCEPT.md`, `AGENTS.md`, `README.md` | Lead / integrator | CONCEPT edits need a decision-log entry with a lock hour |
| Static JSON narrative bank | Pipeline writes, web reads | Produced in `apps/api`, consumed by `apps/web` |

Rules that follow from it:

1. A slice writes **only** inside its own directory; cross-boundary needs go through the lead.
2. Dependencies between slices are read-only and go through agreed seams — the layer-registry seam (`MapControlsOverlay` takes `layerRegistry` / `onLayerChange`, guarded by `timelineStore.canToggleLayer`) and the timeline state contract. `layer-uhi-terrain` owns the registry; build on the seam, do not add booleans.
3. Colour comes from exactly two sources (`gis/yearRamp.js`: `YEAR_*` and `TREND_*` ramps). No component invents a local ramp.
4. Style updates happen in place — one persistent GeoJSON layer in `BicolMap.jsx`, never a remount of 114 features.

## Key interfaces (per slice)

**map-controls**

- `src/gis/engine.js` — `joinKey(name, province)` (the province-qualified join key; a bare-name join is a known bug), `buildNarrativeIndex` / `joinNarratives`, `getMunicipalityStyle` and the other style selectors.
- `src/state/timelineStore.js` — owns year, playback (`PLAYBACK_MS`), zoom clamping, and `canToggleLayer`.
- `src/components/MapControlsOverlay.jsx` — exposes `useTimelineState` / `useTimelineActions` hooks and the `layerRegistry` / `onLayerChange` seam.

**gamified-dashboard**

- `src/ranking.js` — `rankMunicipalities` (slope/danger ordering, flag-not-filter).
- `src/savedStore.js`, `src/leaderboardStore.js`, `src/progressStore.js` — saved places, public leaderboard read (handle-only), local progress state.
- `LEADERBOARD_ENABLED = false` gate in `src/components/Leaderboard.jsx` — leaderboard tab currently renders "coming soon" + skeleton with zero network.

**layer-uhi-terrain / chatbot-llm** — no exports yet; the contract lives in their `AGENTS.md`.

## Usage examples

Run a slice's tests directly with Node from the slice directory (no test runner config):

```bash
cd features/map-controls
node test_engine.mjs
node test_year.mjs

cd ../gamified-dashboard
node test_ranking.mjs
node test_saved.mjs
node test_progress.mjs
```

Consume a slice from the web shell through its barrel:

```js
import BicolMap, { timelineStore, canToggleLayer } from '../../features/map-controls/index.js';
import DashboardScreen, { rankMunicipalities } from '../../features/gamified-dashboard/index.js';
```

## FEATURE-PROMPTS.md

`features/FEATURE-PROMPTS.md` is the **brief layer**: ten engineering briefs, one per slice-prefixed ID, written in the same pack grammar as the external interaction packs — **ROLE / GOAL / WHY / FIND FIRST / CHANGE / CONSTRAINTS / CUSTOMIZE / DONE WHEN** — plus a shared context block and a customisation contract. It complements `CONCEPT.md` and the `AGENTS.md` sub-contracts; jurisdiction and the workboard still live in each slice's `AGENTS.md`.

**How to use it:** one brief per session; paste the shared context block first; the brief is executed only by the slice that owns the path (a brief that seems to need another slice is a request to the lead); verify `DONE WHEN` yourself; a `BUILT` brief is a harden-and-verify job, never a re-plan.

**Status legend:** `BUILT` (verify and finish) · `PARTIAL` (some exists; the brief names what's missing) · `NOT STARTED` (contract only) · `STRETCH` (never start before h42, never claimed as CORE).

| # | Brief | Slice | Status |
|---|---|---|---|
| M1 | Municipality layer and significance as a border pattern | map-controls | `BUILT` |
| M2 | Time scrubber state contract | map-controls | `PARTIAL` |
| M3 | Municipality detail surface | map-controls | `BUILT` |
| L1 | Layer registry contract | layer-uhi-terrain | `NOT STARTED` |
| L2 | Land-surface temperature layer | layer-uhi-terrain | `NOT STARTED` |
| L3 | Canopy and land-cover overlays | layer-uhi-terrain | `NOT STARTED` |
| G1 | Ranking screen | gamified-dashboard | `BUILT` |
| G2 | Progress and handle-only leaderboard | gamified-dashboard | `PARTIAL` |
| N1 | Narrative-bank renderer | chatbot-llm | `NOT STARTED` |
| N2 | Variable glossary | chatbot-llm | `NOT STARTED` |

**Suggested order:** M1 → M3 → M2 → L1 → L2 → L3 → G1 → G2 → N1 → N2. The only hard dependency is L1 before L2/L3 (the overlays need the layer seam); N2 before N1 is a soft preference (the glossary fixes the vocabulary narration reuses).

Nothing in a brief is claimable on the project page or video unless it is a CORE item in `CONCEPT.md` §8.

## Cross-slice facts worth knowing

- **114 municipality features** (geoBoundaries `adm3`, CC BY 4.0) — the current fallback, not the published LGU count.
- **Join key is province-qualified** (`joinKey(name, province)`); `"bato|camartines sur"` style keys. `savedStore.savedKey` is deliberately exact-match — do not add normalised matching elsewhere.
- **Significance is rendered, never filtered** — filled shapes stay; non-significant get `dashArray` + muted border. Changing that is a science regression.
- **No slice may invent colour, remount the map layer, or add a second layer-toggle seam.**
