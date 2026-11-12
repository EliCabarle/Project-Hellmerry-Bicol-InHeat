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

| Item | CORE/STRETCH | Status | Owner |
|---|---|---|---|
| Region V basemap + municipality polygons | CORE | todo | map-controls |
| Time scrubber | CORE | todo | map-controls |
| Municipality tooltips + significance flags | CORE | todo | map-controls |
| Demo seed: warming municipality view | CORE | todo | map-controls |
| Demo seed: opposite/flat trend view | CORE | todo | map-controls |

## Status

| Item | Verified? | Notes |
|---|---|---|
| Scaffolding files 0 lines | Verified | checked on disk 2026-11-02 |
| LGU boundary source (PSA/PSGC) | **No** | verify at h6 (CONCEPT §13) |
| Progressive selection trace (3D) | **Verified 2026-11-12** | `gis/trace.js` + `test_trace.mjs` (7 pass). A ribbon extrusion at `depth + lift + 2 m`, not a line: MapLibre 5.24.1 has no line elevation and lines depth-test against extrusions; partial draw is a sliced ring prefix (no `line-trim-offset`). `TRACE_MS` 620 vs the 700 ms camera settle, starts at the ring vertex nearest the pre-move centre, deselect clears, reduced motion paints once. In-browser at 1280×800 and 390×844 by pixel count, not by eye |
