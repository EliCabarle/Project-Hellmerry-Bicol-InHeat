---
quick_id: 261115-pl6
status: complete
date: 2026-11-15
commit: c1e006c
---

## Summary

Fixed the PostCSS "Unclosed block" error at `apps/web/src/index.css:285:1` that broke the Vite build.

## Root cause

Archaeology via git show: the merge commit `f462157` (Merge branch 'main' into
narration-screen) spliced the chat branch's `/* Peeking Silli tab */` comment +
`@keyframes bih-peek` inside the PWA branch's `html, body { touch-action: manipulation; }`
rule and dropped its closing `}`. Both parent commits were individually correct —
`e21efed` had the rule closed, `5b02229` added the keyframes cleanly.

## Fix

Restored the closing `}` after `touch-action: manipulation;` (one 2-line diff).
The peek comment stays attached to its keyframes, as originally committed.

## Verification

- `npm run build` in `apps/web`: green, 850 modules, built in 18.31s
  (chunk-size warnings are pre-existing/benign).
- Brace balance restored: the rule is now `html, body { touch-action: manipulation; }`.

## Commits

- `c1e006c` — fix(css): close html,body block mangled by narration-screen merge
