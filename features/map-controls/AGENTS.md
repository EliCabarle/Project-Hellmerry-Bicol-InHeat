# features/map-controls — Agent Guide

> Sub-contract under root `AGENTS.md` + `CONCEPT.md`. **Owner: map-controls feature agent.**
> Feature slice: the map screen — Region V map, time scrubber, municipality tooltips, significance flags.

## Jurisdiction

- **Owns (write ONLY here):** `features/map-controls/**`.
- **Must NOT touch:** `features/layer-uhi-terrain/**` internals, `features/gamified-dashboard/**`, `features/chatbot-llm/**`, `apps/web/**` shell/routes, `apps/api/**`, `core/**`, root docs.
- **Cross-boundary protocol:** request via the lead — never a direct write into another boundary.

## Interface contracts

- **Depends on (read-only):** layer rendering from `layer-uhi-terrain` (via the layer-registry contract); trend/series JSON loaded by the web shell; `core/` outputs as precomputed data.
- **Provides:** the map screen + time-scrubber components the web shell mounts; scrubber state (year/range) consumable by other layers.

## Guardrails — project-wide (root AGENTS.md)

- Only CORE items (CONCEPT §8) may be claimed on the project page/video.
- UI English. Cut lines h30/h42/h44 are hard. Links resolve logged-out (h44 check).

## Guardrails — this slice

- **Municipality is the smallest unit** — no barangay-level rendering (POWER's ~55 km grid cannot resolve finer; CONCEPT §10-5).
- Significance renders as a **flag, not a filter** — non-significant municipalities stay on the map.
- Tooltips/labels always carry sample size where sample counts exist (cloud contamination, CONCEPT §10-6).
- Opposite trends in neighboring municipalities are the challenge's point — render them as-is, no smoothing away.
- Time-scrubber changes must notify layers via the agreed state contract, not by reaching into other slices' internals.

## Workboard (editable by owner)

| Item                                       | CORE/STRETCH | Status                                                       | Owner        |
| ------------------------------------------ | ------------ | ------------------------------------------------------------ | ------------ |
| Region V basemap + municipality polygons   | CORE         | built (tests green)                                          | map-controls |
| Time scrubber (Trend/Year/Day modes)       | CORE         | built — Day mode needs lead's `/data/daily/` files           | map-controls |
| Municipality tooltips + significance flags | CORE         | built (tests green)                                          | map-controls |
| Day view + date search                     | CORE         | built — 404 fallback is the live path until daily files ship | map-controls |
| Demo seed: warming municipality view       | CORE         | todo                                                         | map-controls |
| Demo seed: opposite/flat trend view        | CORE         | todo                                                         | map-controls |

## Status

| Item                                                      | Verified?               | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scaffolding files 0 lines                                 | Verified                | checked on disk 2026-11-02                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| LGU boundary source (PSA/PSGC)                            | **No**                  | verify at h6 (CONCEPT §13)                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Progressive selection trace (3D)                          | **Verified 2026-11-12** | `gis/trace.js` + `test_trace.mjs` (7 pass). A ribbon extrusion at `depth + lift + 2 m`, not a line: MapLibre 5.24.1 has no line elevation and lines depth-test against extrusions; partial draw is a sliced ring prefix (no `line-trim-offset`). `TRACE_MS` 620 vs the 700 ms camera settle, starts at the ring vertex nearest the pre-move centre, deselect clears, reduced motion paints once. In-browser at 1280×800 and 390×844 by pixel count, not by eye |
| Camera frame (country bounds/zoom floor/wrap)             | **Verified (code)**     | `gis/countryFrame.js` single source: COUNTRY_BOUNDS padded 0.15°, STUDY_REGION_BOUNDS = reset target, MIN_ZOOM/FLOOR_ZOOM, BOUNDS_VISCOSITY 0.6. Applied to Leaflet (maxBounds+viscosity+noWrap+minZoom) and MapLibre (maxBounds+min/maxZoom). Tiles have noWrap; reset/study-region fits unchanged. Plus START_ZOOM 6 / FLIGHT_MS 1500: a cold load opens on the country box, then makes one eased flight to the study region once per session (guarded by an `opened` ref, skips on deep link/preselection, reduced motion lands on the first painted frame). Reset still returns to the study region without replaying the opening move. |
| Per-area records (id/name/centroid/vertex range)          | **Verified (code)**     | 3D builds `records` with id/name/centroid/vertexRange; `centroids`/`rings` Maps added. Centroid computed from bounds.                                                                                                                                                                                                                                                                                                                                          |
| Fill colour fade (3D)                                     | **Verified**            | `gis/lift.js` adds `COLOR_LERP` 0.18, `COLOR_THRESHOLD` 1.5, `lerpColor`/`colorDistance`. `Municipality3DLayer.jsx` keeps current+target fill per key and lers current→target through the shared rAF loop; stops writing once within threshold (idle frames cost nothing); settles exactly on target with no residue; mid-transition target change continues from current colour; `prefers-reduced-motion` jumps immediately. No geometry rebuild — `_fill` written via `source.updateData`. `node test_colorLerp.mjs` 5 pass. |
| Tests `test_colorLerp` `test_date` `test_daily` `test_engine` `test_year`  | Verified                | all green 2026-11-13 (`node *.mjs` from this dir)                                                                                                                                                                                                                                                                                                                                                                                                              |
| `apps/web` production build with this slice               | Verified                | `npm run build` green 2026-11-12                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Daily files `/data/daily/index.json` + `{YYYY}.json`      | **No**                  | lead-built, absent from client → disabled-Day + year-only search is the live path                                                                                                                                                                                                                                                                                                                                                                              |
| Visual/keyboard checks (320/375/768/1440, reduced motion) | **No**                  | Playwright MCP dead in env — manual pass pending                                                                                                                                                                                                                                                                                                                                                                                                               |
