---
phase: 01-hash-routing
plan: 02
subsystem: ui
tags: [react, vite, url-hash, routing, history-api, pwa, accessibility]

requires:
  - phase: 01-hash-routing-01
    provides: route grammar parseRoute()/hashFor(), load-time restore, skip-link hash protection (this plan adds the write half and the traversal half on top)
provides:
  - "navigate() write half: every route target pushState()s its hash token through hashFor() with a token-diff + grammar guard (silent, no hashchange echo)"
  - "popstate/hashchange traversal sync: one idempotent handler replays location.hash into screen / focusTab / focus with fresh nav tokens (URL → state)"
  - "#history as a first-class grammar token (Dashboard History tab click/arrow writes it; cold load restores it)"
  - "18-row acceptance matrix results + #history route checks recorded below (all PASS)"
affects: [verify-work, h44 logged-out link matrix, any future phase that reads or writes location.hash]

actuals:
  tokens: 2985
  tasks: 3
  commits: 3
plan_head_before: 3ec0778214de2e78c83d2a40f46a8d26b189a55c

tech-stack:
  added: []
  patterns:
    - "silent pushState write inside navigate(): token computed once via hashFor(), pushed only when parseRoute accepts it and it differs from location.hash"
    - "single stable popstate+hashchange listener reading latest state through a render-time ref (latestRef), write-back for paired-event idempotence"
    - "MutationObserver mirror: feature-owned dashboard tab state (aria-selected) flows into navigate() because features/ cannot take new callbacks (C-01)"

key-files:
  created: []
  modified:
    - apps/web/src/app.jsx
    - apps/web/src/lib/routes.js
    - apps/web/test_routes.mjs

key-decisions:
  - "pushState (not hash assignment) for route writes: silent — no hashchange echo into the traversal listener — reuses the History API showOnMap already uses, and gives explicit push-vs-replace control (plan Task 1)."
  - "A hash without #muni= never clears focus on traversal: BicolMap only ever selects and features/ is out of write boundary (C-01), so clearing would desync state from the visible map (C-02, plan Task 2)."
  - "#history promoted to a first-class token (user-added scope): routes.js table, navigate() history branch, observer-bridge comment — dashboard History tab behaves exactly like Quests/Leaderboard in the URL."
  - "Tab clicks are internal to DashboardScreen (features/ boundary), so the shell mirrors aria-selected into navigate() via MutationObserver — user-approved at the Task 1 checkpoint."

patterns-established:
  - "Route writes go through navigate()/hashFor() only — never string-concatenate a hash; showOnMap keeps replaceState for the selection write (C-02)."
  - "Traversal restores by re-deriving state from parseRoute(location.hash); unknown fragments are inert (whitelist-only state writes, T-02-01)."
  - "When a feature owns state the shell cannot observe through props, mirror its DOM contract (aria-selected) instead of editing the feature file."

requirements-completed: [UI-SPEC]

coverage:
  - id: D1
    description: "Write half: every navigate() target (Home/Map/Manage Account/Top BECOlanos/Dashboard/Quests/History/Leaderboard/Settings) publishes its route hash; re-clicks do not grow history; showOnMap stays replaceState; refresh restores each screen"
    requirement: UI-SPEC
    verification:
      - kind: e2e
        ref: "headless Chrome CDP: matrix02.mjs rows 2,4,5,6,7,8,11,12,13,14 — PASS (incl. replaceState counters len 3→3, pushes 1→1, replaces 0→1 on Show on map)"
        status: pass
      - kind: e2e
        ref: "headless Chrome CDP: navwrite.mjs (Task 1 human-check: per-row AppMenu writes, muni dropped, showOnMap, re-click) — PASS"
        status: pass
      - kind: unit
        ref: "node apps/web/test_routes.mjs (7/7, incl. #history round-trip)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Traversal half: browser Back/Forward (and the empty first-visit entry) restores screen + dashboard sub-tab + #muni= selection with fresh focus tokens; unknown fragments inert; focus lands on #main crossing landing/map"
    requirement: UI-SPEC
    verification:
      - kind: e2e
        ref: "headless Chrome CDP: traversal02.mjs — 22/22 PASS (full walk, Back past first entry, Forward, skip-link-then-Back, #muni= roundtrip, zero console errors)"
        status: pass
      - kind: e2e
        ref: "headless Chrome CDP: matrix02.mjs row 9 — PASS (9/9 Back/Forward steps across the rows 1-8 history entries) + row 15 (/#garbage inert) + row 14 (Back past first entry)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Full 18-row acceptance matrix (refresh restore, back/forward walk, logged-out #muni= deep link, offline cached-shell boot, build+tests, code-path diff review) plus the #history route checks"
    requirement: UI-SPEC
    verification:
      - kind: e2e
        ref: "headless Chrome CDP: matrix02.mjs — 16 browser rows PASS (rows 1-15, 17); rows 16/18 shell-side PASS (build EXIT=0, 3 suites EXIT=0; diff review below)"
        status: pass
      - kind: e2e
        ref: "headless Chrome CDP: history02.mjs — 9/9 PASS (cold #history load, click/arrow writes, re-click no growth, Back/Forward restore)"
        status: pass
      - kind: other
        ref: "npm --prefix apps/web run build green; node apps/web/test_{routes,privacy,profile}.mjs all exit 0"
        status: pass
    human_judgment: true
    rationale: "Matrix row 3's 'select a municipality' was exercised through the showOnMap selection write (the plan's designated C-02 path) because on-map polygon clicks are internal to BicolMap and features/ is out of write boundary; row 10 approximates a private window with a fresh CDP tab + cleared origin storage. The lead should confirm both interpretations."

duration: 45min
completed: 2026-11-15
status: complete
---

# Phase 01 Plan 02: Hash-Routing Write & Traversal Summary

**navigate() pushState write half plus a single popstate/hashchange restore handler, so every refresh and Back/Forward press agrees with the URL — proven green by the full 18-row browser acceptance matrix (all PASS), the 22-check traversal walk, and the new #history route (9/9).**

## Performance

- **Duration:** 45 min across sessions (Tasks 1–2 in the prior session with a human-verify checkpoint in between; Task 3 matrix + this SUMMARY in the continuation session)
- **Started:** 2026-11-15 (after 01-01 completion; exact start not instrumented)
- **Completed:** 2026-11-15T06:30:00Z
- **Tasks:** 3
- **Files modified:** 3 (`apps/web/src/app.jsx`, `apps/web/src/lib/routes.js`, `apps/web/test_routes.mjs`)

## Accomplishments

- **Write half (Task 1):** `navigate()` computes one token per call through `hashFor()` (`'map'` renders `#muni=<key>` from a live selection) and `pushState()`es it only when the grammar accepts it and it differs from `location.hash` — silent, no hashchange echo, no duplicate entries on re-click; `showOnMap`'s replaceState selection write (C-02) untouched byte-for-byte.
- **Read half (Task 2):** one stable `popstate` + `hashchange` handler reads latest `screen`/`focusTab`/`focus` through a render-time ref and replays `location.hash` through `parseRoute()`: empty entry → Landing restore (D-02), unknown fragment → inert (T-02-01), same-route guard prevents the paired event double-bumping `navTokenRef`, focus never cleared by a hash that lacks `#muni=`, `focusMain()` on landing/map crossings (FLAG-3/C-05).
- **`#history` first-class route (user-added scope):** grammar token, `navigate()` history branch, and observer-bridge coverage — History tab click/arrow writes `#history`, cold load restores it, Back/Forward round-trips it (history02.mjs 9/9).
- **Acceptance matrix (Task 3):** all 18 rows PASS against the preview build in fresh CDP tabs — see the matrix table below — plus build green and all three apps/web test suites exit 0.

## Task Commits

Each task was committed atomically:

1. **Task 1: navigate() writes the route token for all seven targets** — `f5f033c` (feat; includes the user-approved MutationObserver tab mirror)
2. **Task 2: popstate/hashchange sync restores state on traversal** — `efa23df` (feat)
3. **Task 3: acceptance matrix** — no repo file (harness kept in `%TEMP%\opencode\matrix02.mjs` like the prior plans' browser checks; results recorded below)

**Added scope (user-requested):** `#history` first-class route — `22eb676` (feat; `routes.js` + `app.jsx` + `test_routes.mjs`)

**Plan metadata:** this `docs(01-02)` commit.

## Acceptance Matrix (Task 3)

Run against `npm run preview` (`http://localhost:4173`) in headless Chrome CDP (`127.0.0.1:9333`), fresh tab per session, origin storage cleared for logged-out rows; rows 6–7 seed the same localStorage stub session the prior plans used (expected 401s classified as notices, zero console errors everywhere).

| Row | Check | Result |
|-----|-------|--------|
| 1 | load `/` no hash → Landing, no NavBar | **PASS** (hash="", menuBtns=0) |
| 2 | Menu → Map → refresh → Map `#map` | **PASS** |
| 3 | select → `#muni=` → refresh → same selection | **PASS** (`#muni=vinzons%7Ccamarines%20norte`, card restored) |
| 4 | Top BECOlanos → refresh → Leaderboard tab | **PASS** |
| 5 | Quests tab → refresh → Quests active | **PASS** |
| 6 | Manage Account → refresh → Account | **PASS** (stub session) |
| 7 | Settings → refresh → Settings | **PASS** (stub session) |
| 8 | Home → refresh → Landing | **PASS** (hash `#landing`, no NavBar) |
| 9 | Back/Forward walk across rows 1–8 entries | **PASS** (9/9 steps; focus `#main` on landing/map stops) |
| 10 | literal `#muni=bato%7Ccamarines%20sur` logged-out fresh tab → map + Bato, landing skipped | **PASS** (`__sawLanding=false`, no stub session) |
| 11 | Show on map → `#muni=` replaceState, len unchanged, Back → pre-dashboard screen | **PASS** (len 3→3, pushes 1→1, replaces 0→1; Forward restores selection) |
| 12 | re-click current dashboard tab → history.length unchanged | **PASS** (len 5→5, pushes 0→0) |
| 13 | skip link on `#map` keeps focus `#main` + hash; refresh stays | **PASS** |
| 14 | load `/`, click Map, Back → Landing | **PASS** (empty hash, focus `#main`) |
| 15 | load `/#garbage` → Landing, zero console errors | **PASS** (URL left inert at `#garbage`) |
| 16 | build + `test_routes` + `test_privacy` + `test_profile` all exit 0 | **PASS** (BUILD EXIT=0; suites 7/7, 4/4, 3/3) |
| 17 | preview + offline refresh on `#map` → cached shell boots | **PASS** (SW controlling, SW target attached, zero offline notices) |
| 18 | code-path review: privacyMode / focusMain / navTokenRef unchanged (C-05) | **PASS** (see below) |

**Row 18 detail:** `git diff 3ec0778..HEAD -- apps/web/src/app.jsx` — zero `privacyMode` lines; zero removed `focusMain` lines (only the plan-prescribed new call sites in the traversal handler and `navigate()`'s deps gaining `focus?.key`, verbatim from the Task 1 action); `navTokenRef` appears only as additions (traversal-handler increments per must-have "fresh nav token") with `navigate()`'s existing `++navTokenRef.current` untouched as context. `showOnMap` absent from the diff — unchanged.

**`#history` rows** (`history02.mjs`, 9/9): cold load `#history` → History tab + panel; Quests/History clicks push; re-click grows no history (2→2); ArrowRight/ArrowLeft push their tokens (3→4); Back/Forward restore the History tab; zero console errors.

**Task 2 walk** (`traversal02.mjs`, 22/22, re-run after all commits): five-screen walk, Back past first entry → Landing, Forward, focus `#main` crossings, skip-link-then-Back no blank/bounce, `#muni=` roundtrip, zero console errors.

## Files Created/Modified

- `apps/web/src/app.jsx` — `navigate()` write half (hashFor + guarded pushState), `history` branch, MutationObserver tab mirror, `popstate`/`hashchange` traversal-sync effect with `latestRef` idempotence.
- `apps/web/src/lib/routes.js` — `#history` added to the exact-match token table (eight screen tokens now); comments updated.
- `apps/web/test_routes.mjs` — sub-tab loop extended to `history`, `hashFor('history') === '#history'`, round-trip case (7 tests still, assertions widened).

## Resolved Checkpoints

- **Task 1/2 human-verify (gate `blocking`, cleared by the orchestrator)** — returned with automated verify green (build, 3 suites, traversal walk, Task 1 browser walk). User approved: *"approved, go ahead and fix the issues quickly and resolve the issue with the History panel"* — which simultaneously (a) approved the MutationObserver bridge deviation shipped in `f5f033c` and (b) added `#history` as first-class scope, delivered in `22eb676`. Checkpoint cleared; execution continued through Task 3.

## Decisions Made

- pushState over `hash assignment` for route writes (plan Task 1): silent write → the traversal listener never sees an echo, and push-vs-replace stays explicit next to `showOnMap`'s replaceState.
- Traversal applies "exactly what `navigate()` would" but reads state through `latestRef` written at render time — one subscription for the app's lifetime, StrictMode-safe add/remove symmetry.
- `#muni=`-less hashes keep `focus` (never clear): matches BicolMap's select-only contract and keeps "returning to the map with a live selection rewrites `#muni=`" true via `hashFor('map', focus?.key)`.
- Row 3's "select a municipality" resolves to the plan's designated selection write (`showOnMap`) — documented as a deviation with a WINDOWS ledger entry (see below).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical / user-approved] Dashboard tab clicks had no path into navigate()**
- **Found during:** Task 1 (navigate() writes the route token)
- **Issue:** The plan assumed tab clicks funnel through `navigate()`, but `DashboardScreen` owns tab state internally (`onClick={() => setActive(t.id)}`) and receives no callback — `features/` is out of write boundary (C-01), so `#quests`/`#leaderboard` would never be written on click.
- **Fix:** Shell-side MutationObserver on the tablist's `aria-selected` (the feature's own DOM contract) → `navigate(id.slice(4))` — covers click and arrow-key moves alike; pushState fires no events so no echo loop.
- **Files modified:** `apps/web/src/app.jsx`
- **Verification:** navwrite.mjs + traversal02.mjs + matrix rows 5/12 (click writes, re-click grows nothing) all green.
- **Committed in:** `f5f033c` (part of Task 1 commit); approval recorded under Resolved Checkpoints.

**2. [User-added scope] `#history` made a first-class route**
- **Found during:** checkpoint approval (added to plan scope post-approval)
- **Issue:** Plan frontmatter `files_modified` listed only `app.jsx`; the grammar table and its tests live in `routes.js` / `test_routes.mjs`.
- **Fix:** `#history` token in the ROUTES table + `navigate()` history branch + test round-trip; bridge comment updated (all four tabs are grammar tokens now). Still entirely inside `apps/web/**` (write boundary intact).
- **Files modified:** `apps/web/src/lib/routes.js`, `apps/web/src/app.jsx`, `apps/web/test_routes.mjs`
- **Verification:** test_routes 7/7; history02.mjs 9/9; build green.
- **Committed in:** `22eb676`

**3. [Disclosed interpretation - matrix row 3] On-map polygon clicks do not write `#muni=`**
- **Found during:** Task 3 (matrix row investigation)
- **Issue:** Row 3 says "select a municipality → hash becomes `#muni=`". `BicolMap` selection is internal (`setSelectedKey`); the shell gets no selection callback, and adding one means editing `features/map-controls/` — forbidden without lead approval (C-01).
- **Fix:** Row 3 exercised via `showOnMap` — the selection write the plan itself designates (Task 1 action: "showOnMap … is the selection write (C-02)"). Refresh-restore half fully verified (same card after reload). No code change.
- **Verification:** matrix row 3 PASS; recorded in `.planning/WINDOWS.md` entry #1 (`kind: deviation`, open) for the lead.
- **Committed in:** n/a (documentation only)

---

**Total deviations:** 3 (1 Rule 2 user-approved, 1 user-added scope, 1 disclosed interpretation)
**Impact on plan:** All deviations serve the plan's own must-haves; no scope creep beyond the user's explicit `#history` request. One open ledger entry flags an optional future enhancement (shell callback for on-map selection) — lead decision, not a defect in this plan's output.

## Issues Encountered

- Row 3's literal wording did not match any in-boundary code path (see deviation 3) — resolved by plan-faithful interpretation + ledger entry rather than a cross-boundary write.
- The preview server (`localhost:4173`, pid 25680) and Chrome CDP (`:9333`) from plan 01-01 were reused throughout; both still running at SUMMARY time.
- PowerShell 5.1 has no `Convert-Json` (CDP probe used `ConvertFrom-Json`) — tooling hiccup only, no product impact.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Phase 01 is complete (2/2 plans)** — hash routing now closes the loop: URL → state at load (01-01) and state → URL + traversal (01-02). Ready for `/gsd-verify-work` UAT routing (coverage D3 carries one human-judgment confirmation) and for any later phase that shares links or depends on refresh-stable screens.
- Shared requirement `UI-SPEC` closes with this SUMMARY (`requirements-completed: [UI-SPEC]`).
- Open for the lead: `.planning/UI-SPEC.md` row ~277 ("All other loads land on landing") still under-describes refresh restore (docs lead-owned, not edited here); `.planning/WINDOWS.md` entry #1 (on-map selection → URL, feature-boundary decision).

---
*Phase: 01-hash-routing*
*Completed: 2026-11-15*
