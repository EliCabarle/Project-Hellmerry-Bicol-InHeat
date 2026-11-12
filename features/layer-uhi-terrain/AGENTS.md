# features/layer-uhi-terrain — Agent Guide

> Sub-contract under root `AGENTS.md` + `CONCEPT.md`. **Owner: layer-uhi-terrain feature agent.**
> Feature slice: map layers — LST (Landsat), UHI patterns, terrain/elevation, canopy/land-cover overlays.

## Jurisdiction

- **Owns (write ONLY here):** `features/layer-uhi-terrain/**`.
- **Must NOT touch:** `features/map-controls/**` (camera, controls, scrubber), other feature slices, `apps/web/**`, `apps/api/**`, `core/**`, root docs.
- **Cross-boundary protocol:** request via the lead — never a direct write into another boundary.

## Interface contracts

- **Depends on (read-only):** map canvas + scrubber state from `map-controls` (via the layer-registry contract); LST/canopy/land-cover data as precomputed JSON from the pipeline; `core/` outputs.
- **Provides:** the layer registry + rendering components `map-controls` composes.

## Guardrails — project-wide (root AGENTS.md)

- Only CORE items (CONCEPT §8) may be claimed on the project page/video.
- UI English. Cut lines h30/h42/h44 are hard. Links resolve logged-out (h44 check).

## Guardrails — this slice

- **LST ≠ heat index** — LST layers must be explicitly labeled skin/surface temperature; the felt metric comes from POWER (CONCEPT §10-1).
- Landsat 7 post-2003 SLC-off gaps — never present gappy pre-2013 LST as clean (CONCEPT §10-2).
- Cloud-affected views report per-municipality **sample counts** (CONCEPT §10-6).
- Municipality is the smallest unit — no barangay-level overlay (that is STRETCH and only per CONCEPT §8).
- ECOSTRESS (if shipped, STRETCH) is irregular-revisit — pattern only, never trend claims (CONCEPT §10-3).

## Workboard (editable by owner)

| Item | CORE/STRETCH | Status | Owner |
|---|---|---|---|
| Layer registry + toggle UI plumbing | CORE | todo | layer-uhi-terrain |
| LST (Landsat C2 L2) layer, 2013–2025 | CORE | todo | layer-uhi-terrain |
| Tree cover (MOD44B) overlay | CORE | todo | layer-uhi-terrain |
| Land cover (MCD12Q1) overlay | CORE | todo | layer-uhi-terrain |
| ST_QA uncertainty surfaced | CORE | todo | layer-uhi-terrain |
| ECOSTRESS diurnal layer | STRETCH | todo | layer-uhi-terrain |

## Status

| Item | Verified? | Notes |
|---|---|---|
| Scaffolding files 0 lines | Verified | checked on disk 2026-11-02 |
| Product IDs/imageries current | No | re-verify collections at h6 (CONCEPT §13) |
