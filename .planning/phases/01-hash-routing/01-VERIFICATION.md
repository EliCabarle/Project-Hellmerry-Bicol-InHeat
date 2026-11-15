---
phase: 01-hash-routing
verified: 2026-11-15
method: goal-backward inline verification (gsd-verifier subagent spawn cancelled; documented fallback)
status: passed
success_criteria:
  total: 3
  passed: 3
  failed: 0
---

# Phase 01 Verification: hash-routing

**Verdict: PASSED.** The URL hash names the active screen and dashboard sub-tab in both directions — load-time restore (01-01) and write/traversal (01-02) — and every success criterion is supported by traceable code paths plus green automated checks.

## Criterion 1 — Refresh stays on screen; URL carries a shareable route hash — PASS

- **Restore (URL → state):** `apps/web/src/app.jsx:44-58` — `parseRoute(window.location.hash)` runs once and feeds the three `useState` initializers: `screen` (`route?.screen ?? 'landing'`), `focus` (`#muni=` key with token 1), `focusTab` (`{ id: route.tab, token: 1 }` when the route is dashboard). A refresh re-runs exactly this grammar, so Map (`#map`), Dashboard (`#dashboard`/`#quests`/`#history`/`#leaderboard`), Account (`#account`) and Settings (`#settings`) all restore.
- **Write (state → URL):** `navigate()` (`app.jsx:190-255`) computes the token via `hashFor()` (`routes.js`) and `pushState()`es it only when the grammar accepts it and it differs from `location.hash` — re-clicks do not stack history entries. The `history` branch (`app.jsx:235-239`) makes the History tab a first-class token (`#history`, routes.js:16), added per user scope in `22eb676`.
- **Dashboard tab clicks** reach the grammar through the shell-side MutationObserver on the feature tablist's `aria-selected` (`app.jsx:266-277`), hardened with an `isConnected` guard in `4fd614c` (WR-01, 01-REVIEW.md).
- Browser-level proof: 01-02-SUMMARY matrix rows 2, 4, 5, 6, 7, 8, 12 (all PASS, headless Chrome CDP) + `history02.mjs` 9/9 for `#history`.

## Criterion 2 — Empty/unknown hash → Landing; `#muni=` deep link works logged-out — PASS

- `routes.js:34` — empty hash parses to `{ screen: 'landing' }`; the exact-match token table (lines 12-21) returns `null` for every other unknown fragment, and `parseRoute() === null` → Landing in both the load-time initializers and the traversal handler (`app.jsx:313`).
- `#muni=` legacy decode runs first (`routes.js:8, 35-38`), guarded against malformed percent-encoding, and yields `{ screen: 'map', muniKey }` — restored into `focus` with token 1 regardless of auth state (no session check on this path; logged-out deep link verified in matrix row 10, `__sawLanding=false`).
- Matrix rows 1 (empty hash → Landing, no NavBar), 8 (`#landing` → Landing), 15 (`#garbage` inert, zero console errors) — PASS.

## Criterion 3 — Back/forward walks; tests + build green — PASS

- Single stable `popstate`+`hashchange` handler (`app.jsx:293-344`) replays `location.hash` through the same `parseRoute()`: empty entry → Landing restore (D-02), unknown fragment inert (whitelist-only state writes), same-route idempotence guard prevents the paired-event double-bump of `navTokenRef`, fresh tokens on restore so `DashboardScreen`'s focusTab effect refires, `focusMain()` on landing/map crossings. Listener add/remove is symmetric (StrictMode-safe).
- Selection write untouched: `showOnMap` keeps its `replaceState('#muni=…')` (`app.jsx:174-176`, verified absent from the 01-02 diff — matrix row 11 counters: len 3→3, replaces 0→1).
- Automated checks re-run this session after the final fix commit (`4fd614c`): `node apps/web/test_routes.mjs` EXIT=0 (7/7, incl. the `#history` round-trip), `node apps/web/test_privacy.mjs` EXIT=0, `node apps/web/test_profile.mjs` EXIT=0, `npm --prefix apps/web run build` EXIT=0.
- Back/forward proof: 01-02-SUMMARY matrix row 9 (9/9 walk across rows 1-8 entries) + `traversal02.mjs` 22/22 (Back past first entry → Landing, Forward, skip-link-then-Back, `#muni=` roundtrip, zero console errors).

## Concerns / notes

- **Browser-level rows are SUMMARY attestation, not re-run here.** The 18-row matrix, `traversal02.mjs` and `history02.mjs` were executed by the executor session against `npm run preview` in headless Chrome CDP; this verification re-ran the automated suites + build and traced every claimed behaviour to its code path, but did not re-execute the CDP harness. Two disclosed interpretations stand from 01-02-SUMMARY: matrix row 3 exercised via `showOnMap` (on-map polygon clicks are internal to `features/map-controls` — open ledger entry `.planning/WINDOWS.md` #1), and row 10 approximates a private window with a fresh tab + cleared origin storage.
- `.planning/UI-SPEC.md` row ~277 still under-describes refresh restore — lead-owned doc, flagged in STATE.md.
- One code-review warning (WR-01) was fixed in `4fd614c`; 6 info findings remain open in 01-REVIEW.md (all benign today, none blocking).
