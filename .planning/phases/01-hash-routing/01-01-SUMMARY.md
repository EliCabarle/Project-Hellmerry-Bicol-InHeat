---
phase: 01-hash-routing
plan: 01
subsystem: ui
tags: [react, vite, url-hash, routing, pwa, accessibility]

requires:
  - phase: guest-landing-verify
    provides: landing screen with #main focus target and skip-link behavior this plan preserves
provides:
  - "parseRoute()/hashFor() route grammar (single source of truth) in apps/web/src/lib/routes.js"
  - "load-time restore: URL hash → screen / dashboard sub-tab / #muni= selection at document load"
  - "skip link that moves focus without displacing the route token"
affects: [01-hash-routing plan 02 (navigate writes + back/forward), verify-work, h44 logged-out link matrix]

actuals:
  tokens: 2801
  tasks: 2
  commits: 3
plan_head_before: 39afd70ac16a13449815382fddd8f19f1494e6dd

tech-stack:
  added: []
  patterns:
    - "exact-match route token table with legacy #muni= prefix checked first"
    - "load-time restore via useState initializers carrying token 1"
    - "skip-link handler owns the hash (preventDefault + ensure tabindex before focus)"

key-files:
  created:
    - apps/web/src/lib/routes.js
    - apps/web/test_routes.mjs
  modified:
    - apps/web/src/app.jsx

key-decisions:
  - "Route grammar is an exact-match token table: seven screen tokens, '' → landing, everything else null → Landing (lead ruling 2026-11-14); #muni= legacy decode runs first and unchanged."
  - "Load-time restore feeds the three useState initializers (screen / focus / focusTab) with token 1; navigate(), showOnMap() and history listeners untouched — that write half is plan 01-02."
  - "Skip link keeps href=\"#main\" for semantics but its onClick owns the hash; because Dashboard/Account/Settings render #main without a tabindex, the handler sets tabindex=-1 idempotently before focusing — keeps the fix inside apps/web (features/ write boundary untouched)."

patterns-established:
  - "src/lib/routes.js is the single source of truth for URL ↔ state; plan 02 must render hashes through hashFor(), never string-concatenate."
  - "Skip/focus targets must be programmatically focusable; handlers ensure tabindex rather than assuming every screen's #main has one."

requirements-completed: []

coverage:
  - id: D1
    description: "Route grammar module parseRoute()/hashFor() with the full token table, legacy #muni= decode, unknown-hash null fallback, and round-trip tests"
    requirement: UI-SPEC
    verification:
      - kind: unit
        ref: "node apps/web/test_routes.mjs (7/7 pass)"
        status: pass
      - kind: unit
        ref: "node apps/web/test_privacy.mjs (4/4) + node apps/web/test_profile.mjs (3/3)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Load-time restore: cold document load of any of the seven route hashes renders that screen, dashboard hashes land on the matching sub-tab, #muni= opens the map with the selection, empty/foreign hashes render Landing"
    requirement: UI-SPEC
    verification:
      - kind: e2e
        ref: "headless Chrome CDP: tabrestore.mjs (#leaderboard/#quests/#dashboard tab active, /#main → Landing) — PASS"
        status: pass
      - kind: e2e
        ref: "headless Chrome CDP: munideeplink.mjs (/#muni=bato%7Ccamarines%20sur → map + 'Details for Bato' card, hash preserved) — PASS"
        status: pass
      - kind: e2e
        ref: "headless Chrome CDP: skipcheck.mjs cold-load rows (/#map, /, /#dashboard, /#account, /#settings) — PASS"
        status: pass
      - kind: other
        ref: "npm --prefix apps/web run build — green"
        status: pass
    human_judgment: false
  - id: D3
    description: "Skip to content moves focus to #main on all five screens while the URL keeps its route token, and a refresh after skipping restores the same screen"
    requirement: UI-SPEC
    verification:
      - kind: e2e
        ref: "headless Chrome CDP: skipcheck.mjs — 20/20 PASS (hash kept + focus lands + refresh restores, on map/landing/dashboard/account/settings)"
        status: pass
      - kind: other
        ref: "npm --prefix apps/web run build — green"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-11-15
status: complete
---

# Phase 01 Plan 01: Hash Routing Load Restore Summary

**URL-hash route grammar (`parseRoute`/`hashFor`) wired into load-time state so shared links, bookmarks and refresh reopen the right screen/sub-tab/municipality logged-out — plus a skip link that no longer displaces the route token.**

## Performance

- **Duration:** 20 min (continuation session; Task 1 ran in the prior session — RED/GREEN artifacts 10:29–10:36 local, not instrumented)
- **Started:** 2026-11-15T10:57:16Z (continuation)
- **Completed:** 2026-11-15T11:17:00Z
- **Tasks:** 2
- **Files modified:** 3 (`apps/web/src/lib/routes.js`, `apps/web/test_routes.mjs`, `apps/web/src/app.jsx`)

## Accomplishments

- Route grammar module with an exact-match token table: seven screen tokens, dashboard sub-tab tokens implying the dashboard screen, `''` → landing, `#muni=` legacy decode first (guarded `decodeURIComponent`, malformed → null), everything else null → Landing (lead ruling 2026-11-14 intact for guests and signed-in users alike).
- Load-time restore: `parseRoute(window.location.hash)` drives the `screen` / `focus` / `focusTab` useState initializers (token 1 so DashboardScreen's focusTab effect activates the restored tab on first mount); `#muni=<joinKey>` restores the map selection through the same decode path as before.
- Skip link (`href="#main"`) now `preventDefault()`s and focuses `#main`, so skipping never rewrites `location.hash` — refresh after skipping stays on the current screen; `focusMain()`/FLAG-3 path untouched.
- Full browser proof (logged-out headless Chrome against `npm run preview`): 7 route cold-loads, sub-tab activation for `#quests`/`#leaderboard`/`#dashboard`, `#muni=` Bato selection card, `#main`→Landing fallback, and 20/20 skip-link checks across all five screens.

## Task Commits

Each task was committed atomically:

1. **Task 1: Route grammar module + load-time restore (tracer/TDD)** — `08fe793` (test, RED) · `6225631` (feat, GREEN)
2. **Task 2: Skip link keeps the route token intact** — `bb5edb5` (fix)

**Plan metadata:** this `docs(01-01)` commit.

_TDD note: Task 1 carried `tdd="true"` — RED (`test(01-01)`) precedes GREEN (`feat(01-01)`); no REFACTOR commit needed (no post-GREEN refactor performed)._

## Files Created/Modified

- `apps/web/src/lib/routes.js` — `parseRoute(hash)` / `hashFor(target, muniKey)` grammar, dependency-free, single source of truth.
- `apps/web/test_routes.mjs` — node:test suite asserting the grammar token by token, incl. legacy `#muni=`, foreign-fragment rejection, and round-trips (7 tests).
- `apps/web/src/app.jsx` — load-time initializers from `parseRoute`, grammar head-comment, and the hash-preserving skip-link handler (incl. idempotent `tabindex="-1"` on `#main`).

## Resolved Checkpoints

- **Task 1 tracer human-verify (gate `blocking`, end-of-phase mode)** — returned by the prior executor with automated verify green (routes 7/7, privacy 4/4, profile 3/3, build green). User approved: *"continue with the remaining tasks"* — checkpoint cleared; execution resumed at Task 2. The Task 1 `<human-check>` items (cold loads per hash, sub-tab activation, `#muni=` selection, `#main` fallback) were subsequently automated and are all green (see Accomplishments / coverage D2).

## Decisions Made

- Exact-match token table over prefix parsing — an unknown fragment can never partially match a route, which is what makes `#access_token=...` and `#mapx` safely fall through to Landing (threats T-01-01/T-01-02).
- Restore uses `useState` initializers with token 1 rather than a mount effect — no post-paint screen flash, and DashboardScreen's existing focusTab contract activates the restored tab without changes to `features/`.
- Skip-link focusability fixed in the handler (`tabindex="-1"` before `focus()`) instead of editing `DashboardScreen.jsx`/`AccountScreen.jsx`/`SettingsScreen.jsx` — those screens render `#main` without a tabindex, but `features/**` is outside this plan's write boundary (root AGENTS.md cross-boundary protocol).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Skip-link focus was a no-op on 3 of 5 screens**
- **Found during:** Task 2 (Skip link keeps the route token intact) — headless Chrome check failed `skip on dashboard focuses #main (active=A)`.
- **Issue:** The plan assumed `document.getElementById('main').focus()` works on every screen, but Dashboard (`<div id="main">`), Account and Settings (`<main id="main">`) render `#main` with no `tabindex`, so `focus()` silently did nothing and focus stayed on the skip anchor.
- **Fix:** The skip handler sets `tabindex="-1"` on `#main` (idempotently, only when absent) before focusing — a standard skip-target pattern, applied inside `app.jsx` only.
- **Files modified:** `apps/web/src/app.jsx`
- **Verification:** `skipcheck.mjs` 20/20 PASS (focus + hash + refresh on map, landing, dashboard, account, settings); build green; all three test files green.
- **Committed in:** `bb5edb5` (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug)
**Impact on plan:** The fix was required for the plan's own done criterion ("skip link moves focus … on all five screens"). No scope creep — single file already in `files_modified`.

## Issues Encountered

- None beyond the deviation above. A `vite preview` server on `http://localhost:4173` from the prior executor was reused for browser verification and left running for plan 01-02.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Plan 01-02** (navigate writes + back/forward + full browser matrix incl. h44 logged-out private window) is ready: grammar and load restore are in place; `navigate()`/`showOnMap()` are untouched byte-for-byte as specified.
- Shared requirement `UI-SPEC` is declared by both plans in this phase — it stays open until 01-02's SUMMARY exists (shared-ID gate).
- The pre-existing STATE.md blocker stands: `.planning/UI-SPEC.md` row 277 ("All other loads land on landing") under-describes refresh restore — lead-owned doc, flagged, not edited here.

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED | `08fe793` `test(01-01): add failing test for route grammar` | ✓ |
| GREEN | `6225631` `feat(01-01): implement route grammar and load-time restore` | ✓ |
| REFACTOR | — (none needed) | n/a |

---
*Phase: 01-hash-routing*
*Completed: 2026-11-15*

## Self-Check: PASSED

- Files exist: `apps/web/src/lib/routes.js`, `apps/web/test_routes.mjs`, `apps/web/src/app.jsx`, `01-01-SUMMARY.md` — all FOUND.
- Commits exist: `08fe793`, `6225631`, `bb5edb5`, `97f4169` — all FOUND in `git log --oneline --all`.
- Full verify set green at Task 2 completion: `test_routes` 7/7, `test_privacy` 4/4, `test_profile` 3/3, `npm --prefix apps/web run build` green.
