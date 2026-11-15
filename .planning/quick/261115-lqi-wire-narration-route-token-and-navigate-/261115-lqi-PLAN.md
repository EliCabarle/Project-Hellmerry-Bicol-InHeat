---
id: 261115-lqi
slug: wire-narration-route-token-and-navigate-
date: 2026-11-15
status: planned
---

# Quick Plan: wire #narration route token and navigate branch so AppMenu Narration row works

## Problem

The AppMenu "Narration" row (`AppMenu.jsx:75-78`) calls `navigate("narration")`
but clicking it does nothing: the menu closes and the screen never changes.

Root cause (verified by reading the shell):
1. `navigate()` in `apps/web/src/app.jsx` has no `target === 'narration'`
   branch — the callback falls through after `settings`, so `setScreen` is
   never called.
2. The route grammar (`apps/web/src/lib/routes.js`) has no `'#narration'`
   token in `ROUTES`, so `parseRoute('#narration')` → `null`: the hash write
   is skipped and a refresh could never restore the screen.

The screen itself is fully wired (`app.jsx` renders `NarrationScreen` on
`screen === 'narration'`; import exists) — only routing plumbing is missing.

## Tasks

### 1. Register the token and add the branch

- **files:** `apps/web/src/lib/routes.js`, `apps/web/src/app.jsx`,
  `apps/web/test_routes.mjs`
- **action:**
  - routes.js: add `'#narration': { screen: 'narration', tab: null }` to
    `ROUTES`; update the "eight screen tokens" comment to nine.
  - app.jsx: add the `narration` branch after `settings` (sets screen,
    clears focusTab, no focusMain — same style as account/settings since
    the NavBar stays mounted); update the supported-tokens comment.
  - test_routes.mjs: assert `#narration` parses and round-trips.
- **verify:** `node test_routes.mjs` all pass; `npm run build` green.
- **done:** Clicking Narration swaps the screen; refresh restores it.

## Constraints

- `features/**` untouched (screen was already wired; shell-only fix).
