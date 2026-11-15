---
status: complete
date: 2026-11-15
commit: db2e906
---

# Summary: wire #narration route token and navigate branch so AppMenu Narration row works

## What was done

- `apps/web/src/lib/routes.js`: added `'#narration'` to `ROUTES` (grammar is
  the load-time contract, so the token now round-trips on refresh).
- `apps/web/src/app.jsx`: added the missing `target === 'narration'` branch in
  `navigate()` (after `settings`; clears focusTab, no focusMain — NavBar stays
  mounted); updated the supported-tokens comment.
- `apps/web/test_routes.mjs`: two new assertions (`#narration → narration
  screen`, narration round-trips).

## Root cause

`AppMenu`'s Narration row called `navigate("narration")`, but `navigate()` had
no narration branch (fell through after `settings`, so the screen never
changed) and the grammar had no `#narration` token (so no hash was written and
a refresh could not restore it).

## Verification

- `node test_routes.mjs`: all pass, including the 2 new narration assertions.
- `npm run build` in `apps/web`: green (built in 23.06s).

## Notes

- Shell-only fix; `features/**` untouched.

## Tasks completed

- [x] Register the token and add the branch — done, tests + build verified.
