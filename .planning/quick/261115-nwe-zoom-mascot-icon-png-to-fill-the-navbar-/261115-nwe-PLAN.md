---
id: 261115-nwe
slug: zoom-mascot-icon-png-to-fill-the-navbar-
date: 2026-11-15
status: planned
---

# Quick Plan: zoom mascot_icon.png to fill the NavBar logo placeholder

## Problem

Screenshot annotation #1: the NavBar logo tile (40×40 rounded square,
`h-10 w-10` gradient span in `apps/web/src/components/NavBar.jsx:57-69`)
renders `/mascot_icon.png` at only 32×32 (`h-8 w-8 object-contain`,
width/height 32), leaving an 8px gradient ring around the mascot — it reads
as a small icon floating inside a bigger placeholder instead of a logo.

Verified: `public/mascot_icon.png` is a full-bleed square icon (rounded
corners baked in, no transparent padding), so rendering it at the full tile
size fills the placeholder cleanly.

## Tasks

### 1. Render the mascot at the full 40px tile

- **files:** `apps/web/src/components/NavBar.jsx`
- **action:** Change the img from `h-8 w-8 object-contain` (width/height 32)
  to `h-10 w-10 object-cover` (width/height 40) so it fills the
  `h-10 w-10` placeholder edge to edge. Keep the span and its rounding —
  the PNG's baked-in corner rounding will let the gradient peek at the
  corners only.
- **verify:** `npm run build` in `apps/web` green; visually the tile shows
  the mascot edge to edge (no 8px ring).
- **done:** Logo fills the placeholder.

## Constraints

- NavBar.jsx only; no ramp/colour tokens touched (the gradient span stays).
