---
phase: 01-hash-routing
reviewed: 2026-11-15T14:48:18Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - apps/web/src/app.jsx
  - apps/web/src/lib/routes.js
  - apps/web/test_routes.mjs
findings:
  critical: 0
  warning: 1
  info: 6
  total: 7
status: issues_found
---

# Phase 01: Code Review Report — URL Hash Routing

**Reviewed:** 2026-11-15T14:48:18Z
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Reviewed the hash-routing implementation across the route grammar (`routes.js`), the shell (`app.jsx`), and the test suite (`test_routes.mjs`) at standard depth, with cross-file verification into `features/gamified-dashboard/src/DashboardScreen.jsx` (tablist render conditions, tab ids, focusTab effect) and `apps/web/src/lib/auth.js` (OAuth redirect target).

The implementation is unusually careful. Verified sound: the exact-match token table leaves no prefix-matching hole (`#mapx`, `#access_token=`, `#main` all reject); the `#muni=` decode is guarded against malformed percent-encoding; `pushState`/`replaceState` fire no events so there is no echo loop between the write half and the traversal listener; the StrictMode double-mount adds/removes the same listener reference symmetrically; the paired `popstate`+`hashchange` fire is idempotent via the `latestRef` write-then-guard pattern; re-clicks cannot stack duplicate history entries (hash-equality guard in `navigate()`, `replaceState` in `showOnMap()`); every `navigate()` call site (AppMenu, LandingScreen, mirror) uses grammar targets only; the decoded `muniKey` is used solely as a data prop — no `innerHTML`/`dangerouslySetInnerHTML` anywhere in scope, so there is no XSS path via `location.hash`. `node apps/web/test_routes.mjs` passes (7/7).

No critical defects found. One latent robustness gap in the MutationObserver mirror (warning), plus maintainability/info items. The two structural hazards I actively tried to prove — mirror echo loops and traversal double-application — are both genuinely guarded in the current code.

## Warnings

### WR-01: MutationObserver mirror captures the tablist node once — silently dies (or acts on a detached node) if the tablist is ever remounted

**File:** `apps/web/src/app.jsx:268-276`
**Issue:** The mirror effect resolves `document.querySelector('[role="tablist"][aria-label="Dashboard sections"]')` exactly once at effect setup and the `mirror` callback closes over that node. Two failure modes: (1) if `DashboardScreen` ever gates or remounts its tablist (loading state, key change, conditional render), the observer keeps watching a detached node — every later tab click/arrow move goes unobserved, and the URL silently stops matching the visible tab state; a refresh then restores the wrong tab, which violates the phase's own "the URL never promises a screen a refresh would not restore" contract. (2) A late `aria-selected` mutation on the detached node would still fire `mirror`, which calls `navigate()` with a stale tab id — pushing a history entry and switching tabs the user is not looking at. This is **not reachable with the current sibling file** — I verified `DashboardScreen.jsx:398-429` renders the tablist unconditionally with stable keyed `<button>` nodes, and the effect's cleanup runs on every screen change — but the shell's mirror depends on a feature-file implementation detail it does not control (features are outside the shell's write boundary per C-01), and the failure mode is silent and hard to diagnose.
**Fix:**
```js
const mirror = () => {
  // Re-read from the live DOM each time; ignore callbacks from a detached node.
  if (!list.isConnected) return
  const id = list.querySelector('[role="tab"][aria-selected="true"]')?.id
  if (typeof id === 'string' && id.startsWith('tab-')) navigate(id.slice(4))
}
```
The one-line `isConnected` guard closes the detached-node fire immediately; re-querying `aria-selected` through `list` (already done) is fine once the guard exists. If the tablist itself can be replaced while `screen === 'dashboard'`, re-resolve the tablist inside `mirror` instead of closing over it.

## Info

### IN-01: `route` is recomputed from `window.location.hash` on every render, but is only consumed by the lazy `useState` initializers

**File:** `apps/web/src/app.jsx:44-58`
**Issue:** After mount the `route` value is dead work — the initializers run once — yet every re-render re-parses the hash. Harmless today (pure function, no state drift), but it invites a future reader to start using `route` for live state, at which point it would desync from the traversal-synced `screen`/`focusTab`/`focus` state.
**Fix:** Parse once, e.g. `const [route] = useState(() => parseRoute(...))`, or move the three initializers onto a single `useState(() => initFromHash())` so the parse happens exactly once.

### IN-02: `focus` is never cleared, so a selection the user cleared on the map is resurrected by any later return to the map, and the URL keeps claiming it

**File:** `apps/web/src/app.jsx:49-51, 171, 327-332`
**Issue:** No code path sets `focus` to `null` (verified: only the initializer, `showOnMap`, and the traversal branch write it, all with a key). After the user clears the selection directly on the map (map-internal state, not mirrored per C-01), `focus` still holds the old key: `navigate('map')` writes `#muni=<stale key>`, `initialSelectedKey` re-applies it on remount, and a refresh restores a selection the user just dismissed. This is partially a documented tradeoff (the "hash without a key never clears focus" note), and the refire-on-reclick semantics *require* keeping focus — but the resurrect-on-return behavior deserves an explicit comment or a `setFocus(null)` path if the map ever learns to report clears.
**Fix:** At minimum, document the resurrection explicitly at the `focus` declaration. Longer term, let the map report "selection cleared" so the shell can null `focus` and write `#map`.

### IN-03: Render-phase ref write (`latestRef.current = {...}` during render) is a React anti-pattern

**File:** `apps/web/src/app.jsx:291-292`
**Issue:** Writing a ref during render is officially unsupported outside lazy initialization; under concurrent rendering an interrupted render can briefly publish not-yet-committed values into the ref. I traced the concrete scenarios (StrictMode double-render, abandoned concurrent render followed by a `popstate`) and could not construct an actual misbehavior here — `applyTraversal` re-synchronizes `latestRef` itself before every `setState`, and pending values always match the traversal that scheduled them — so this is a contract violation rather than a proven bug. A future refactor that drops the self-synchronization would expose it.
**Fix:**
```js
useLayoutEffect(() => {
  latestRef.current = { screen, focusTab, focus }
})
```
This preserves the same read-freshest-state guarantee the event handler relies on, within React's contract.

### IN-04: Inconsistent indentation in the `navigate()` branch chain

**File:** `apps/web/src/app.jsx:225-254`
**Issue:** The `dashboard`/`quests`/`history`/`leaderboard`/`account`/`settings` branches are indented one level shallower than the `landing`/`map` branches above them (and the file's own convention), purely cosmetic but a diff-noise hazard for the next editor.
**Fix:** Re-indent lines 225-254 to match the surrounding 6-space body convention (or run the project formatter over the file).

### IN-05: Test suite's custom `assert` calls `process.exit(1)` — first failure aborts the run and hides all remaining results

**File:** `apps/web/test_routes.mjs:9-15`
**Issue:** The helper (documented as fail-fast) hard-kills the process inside a `node:test` test: the remaining tests never execute, the runner's summary (counts of pass/fail) is never printed, and any cleanup the runner would do is skipped. Exit code 1 still reaches CI, but a regression surfaces one failure at a time across reruns instead of all at once. It also bypasses `node:assert`, so a failing test produces only a bare `console.error` line.
**Fix:** Prefer `assert.ok`/`assert.deepEqual` from `node:assert` (a throw fails the test, the runner continues, reports everything, and still exits nonzero), or keep fail-fast by throwing instead of `process.exit` so the runner can at least mark the test properly.

### IN-06: Untested defensive branches — `parseRoute` non-string input and `hashFor` unknown-target output

**File:** `apps/web/src/lib/routes.js:33, 54`
**Issue:** The `typeof hash === 'string' ? hash : ''` guard (routes.js:33) and the fall-through `` `#${target}` `` for a target outside the grammar (routes.js:54) are both load-bearing for the shell's safety (`navigate()` trusts `parseRoute(hash)` to reject unknown targets), yet neither is exercised by `test_routes.mjs`.
**Fix:**
```js
assert(parseRoute(undefined) && parseRoute(undefined).screen === 'landing', 'non-string input is treated as empty hash')
assert(parseRoute(hashFor('nope')) === null, 'hashFor of an unknown target is not a route')
```

---

_Security note: no injection, XSS, or secret-handling issues found in scope. The decoded `#muni=` key flows only into component props used as lookup data; the hash is compared against an exact-match whitelist before any state write (T-02-01 holds); the skip-link is the only `href="#"` anchor in the shell and it calls `preventDefault()`, so no foreign fragment can enter the traversal handler from app markup._

_Reviewed: 2026-11-15T14:48:18Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
