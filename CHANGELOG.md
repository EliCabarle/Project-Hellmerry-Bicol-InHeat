# Changelog

All notable changes to Bicol In-Heat are recorded here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · versions follow the hackathon milestone, not semver.

## [Unreleased] — 2026-11-12

### Added

- **2D/3D map toggle.** `features/map-controls/src/Municipality3DLayer.jsx` renders the 114 municipalities as extruded MapLibre GL JS polygons; `MapControlsOverlay` gains a 2D/3D `role="group"` beside the existing Trend/Year group.
- **Hover / selection lift.** `features/map-controls/src/gis/lift.js` — one lift case at `LIFT_RATIO` (0.30) of a municipality's own depth, 150 ms ease-out, rAF loop that stops when idle, and an instant offset under `prefers-reduced-motion`. `test_lift.mjs` (5 pass).
- **Installable PWA.** `apps/web/public/manifest.webmanifest`, `apps/web/public/sw.js` (precaches the shell + hashed build assets, caches data JSON as viewed), `apps/web/public/icons/icon-{192,512}.png`, manifest + theme-color + apple-touch-icon links in `apps/web/index.html`.
- Service-worker registration in `apps/web/src/main.jsx`, guarded by `import.meta.env.PROD` so a dev-registered worker cannot serve stale bundles over Vite HMR.
- **Progressive selection outline trace (3D).** Selecting a municipality draws its boundary from zero to full over `TRACE_MS` 620 ms (ease-out), starting at the ring vertex nearest the pre-move camera centre; deselect clears it immediately and a second selection mid-trace restarts from zero. `features/map-controls/src/gis/trace.js` holds the pure maths (ring extraction, length measure, nearest-vertex rotation, prefix slicing, ribbon quads, easing) with `test_trace.mjs` (7 pass).

### Changed

- `maplibre-gl` added to `apps/web/package.json` and aliased in `apps/web/vite.config.js` (needed because `features/` sits outside the Vite root). It is `React.lazy`-loaded: the `index` chunk carries zero MapLibre bytes, the lazy `Municipality3DLayer` chunk is 1.06 MB / 288 kB gzip.
- 3D colour reuses the single colour source (`getMunicipalityStyle` from `gis/yearRamp.js`); height comes from `gis/lift.js`. No second ramp and no second join key.
- `AGENTS.md` / `apps/web/AGENTS.md`: code map, invariants (3D is a separate entity; lift is one case, never a sum; MapLibre cannot transition feature-state paint so the lift animates via `source.updateData`), and verified-status rows for 2026-11-12.
- **One outline token.** `SELECT_COLOUR` is now exported from `features/map-controls/src/gis/engine.js` and read by the 2D selected style, the 3D line paint and the trace (was the literal `#67e8f9` in three places).
- **The trace is a ribbon extrusion, not a line.** MapLibre 5.24.1 has no `line-z-offset`/`line-elevation-reference` and `drawLine` runs `DepthMode.ReadOnly`, so a ground-level line is occluded by the extrusion. `gis/trace.js` builds a `TRACE_PX`-wide (1.5 px, metres derived from zoom) ribbon rendered as a flat `fill-extrusion` at `depth + lift + 2 m`, repainted on camera moves so it keeps its screen width. Partial draw is a sliced ring prefix — this version has no `line-trim-offset`.
- `Municipality3DLayer` `data` memo now also carries a per-area `rings` record (exterior rings keyed by `joinKey`), so the trace reads the same id the picking path uses. Camera timing is untouched: the trace matches the 700 ms `fitBounds` settle, never the reverse.
- `AGENTS.md` / `features/map-controls/AGENTS.md`: code map, outline/trace invariants, and a verified-status row for the trace.

### Verified

- Headless Chrome against the dev server: hover lifts exactly one area at 0.30 × its own depth, ratio unchanged at z8 / z10.5 / z13, selection holds its lift without doubling, a fast sweep leaves no stale lift, reduced-motion offset is instant, tooltip and 2D↔3D remount unchanged, 198 vs 202 FPS.
- `npm ci && npm run build && npm run preview`: installable in Chrome, service worker activates, offline reload still renders the map and dashboard.
- Headless Chrome against `npm run preview`, 1280×800 and 390×844, counting trace-coloured (`#67e8f9`) pixels per frame: 0 idle → 1354 / 4037 / 6410 / 7459 / 7773 at 60 / 150 / 300 / 500 / 700 ms, plateau at 7773 through 2 s; 0 after deselect; three selections inside one trace window settle to one complete outline (4432 at 1 s and 2 s); `prefers-reduced-motion` shows the full outline at 60 ms at the same count as the completed trace. Mobile is the same shape at a smaller screen scale (0 → 78 → 141, 0 after deselect, reduced 141).

### Known limitations

- No keyboard path into the 3D view — 3D has no roving-tabindex picking. The DOM municipality index still selects areas in either render mode.
- Old hashed assets stay in the service-worker cache until `CACHE` is renamed, so it grows slowly across deploys (`shortcut:` comment in `sw.js`; upgrade to `vite-plugin-pwa`/Workbox when that matters).
- The trace ribbon is depth-tested, so a taller neighbouring extrusion in front correctly hides part of it — on a narrow viewport that is why fewer trace pixels are visible.
- Multi-part municipalities trace every exterior ring in sequence; interior holes are skipped (`shortcut:` comment in `gis/trace.js`).
