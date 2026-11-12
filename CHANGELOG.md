# Changelog

All notable changes to Bicol In-Heat are recorded here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · versions follow the hackathon milestone, not semver.

## [Unreleased] — 2026-11-12

### Added

- **2D/3D map toggle.** `features/map-controls/src/Municipality3DLayer.jsx` renders the 114 municipalities as extruded MapLibre GL JS polygons; `MapControlsOverlay` gains a 2D/3D `role="group"` beside the existing Trend/Year group.
- **Hover / selection lift.** `features/map-controls/src/gis/lift.js` — one lift case at `LIFT_RATIO` (0.30) of a municipality's own depth, 150 ms ease-out, rAF loop that stops when idle, and an instant offset under `prefers-reduced-motion`. `test_lift.mjs` (5 pass).
- **Installable PWA.** `apps/web/public/manifest.webmanifest`, `apps/web/public/sw.js` (precaches the shell + hashed build assets, caches data JSON as viewed), `apps/web/public/icons/icon-{192,512}.png`, manifest + theme-color + apple-touch-icon links in `apps/web/index.html`.
- Service-worker registration in `apps/web/src/main.jsx`, guarded by `import.meta.env.PROD` so a dev-registered worker cannot serve stale bundles over Vite HMR.

### Changed

- `maplibre-gl` added to `apps/web/package.json` and aliased in `apps/web/vite.config.js` (needed because `features/` sits outside the Vite root). It is `React.lazy`-loaded: the `index` chunk carries zero MapLibre bytes, the lazy `Municipality3DLayer` chunk is 1.06 MB / 288 kB gzip.
- 3D colour reuses the single colour source (`getMunicipalityStyle` from `gis/yearRamp.js`); height comes from `gis/lift.js`. No second ramp and no second join key.
- `AGENTS.md` / `apps/web/AGENTS.md`: code map, invariants (3D is a separate entity; lift is one case, never a sum; MapLibre cannot transition feature-state paint so the lift animates via `source.updateData`), and verified-status rows for 2026-11-12.

### Verified

- Headless Chrome against the dev server: hover lifts exactly one area at 0.30 × its own depth, ratio unchanged at z8 / z10.5 / z13, selection holds its lift without doubling, a fast sweep leaves no stale lift, reduced-motion offset is instant, tooltip and 2D↔3D remount unchanged, 198 vs 202 FPS.
- `npm ci && npm run build && npm run preview`: installable in Chrome, service worker activates, offline reload still renders the map and dashboard.

### Known limitations

- No keyboard path into the 3D view — 3D has no roving-tabindex picking. The DOM municipality index still selects areas in either render mode.
- Old hashed assets stay in the service-worker cache until `CACHE` is renamed, so it grows slowly across deploys (`shortcut:` comment in `sw.js`; upgrade to `vite-plugin-pwa`/Workbox when that matters).
