---
status: complete
date: 2026-11-15
commit: cb51fba
---

# Summary: zoom mascot_icon.png to fill the NavBar logo placeholder

## What was done

- `apps/web/src/components/NavBar.jsx`: the mascot img now renders at the
  full 40×40 tile (`h-10 w-10 object-cover`, width/height 40) instead of
  32×32 (`h-8 w-8 object-contain`), so it fills the logo placeholder edge to
  edge with no gradient ring around it.

## Verification

- `public/mascot_icon.png` is a full-bleed square icon (rounded corners baked
  in, no transparent padding), so full-tile rendering fills cleanly; the
  gradient span stays as the corner fallback.
- `npm run build` in `apps/web`: green (built in 28.09s).

## Tasks completed

- [x] Render the mascot at the full 40px tile — done, build verified.
