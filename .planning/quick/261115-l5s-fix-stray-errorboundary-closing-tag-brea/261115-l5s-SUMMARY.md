---
status: complete
date: 2026-11-15
commit: c1709fc
---

# Summary: fix stray ErrorBoundary closing tag breaking vite build in app.jsx

## What was done

- Deleted the orphaned `</ErrorBoundary>` closing tag at `apps/web/src/app.jsx:505`.
- Root cause: an earlier edit removed the `<ErrorBoundary>` opening tag and its
  import but left the closing tag behind; the outer `<div>` was already balanced.

## Verification

- `npm run build` in `apps/web`: green — 849 modules transformed, built in
  15.95s, no Babel/JSX parse errors. (Chunk-size warnings are pre-existing.)

## Notes

- No `<ErrorBoundary>` wrapper was re-added — that would be a behavior change
  beyond the reported parse error. If an app-level error boundary is wanted,
  do it as a separate deliberate change (the component exists at
  `apps/web/src/components/ErrorBoundary.jsx`).

## Tasks completed

- [x] Remove the stray closing tag — done, build verified.
