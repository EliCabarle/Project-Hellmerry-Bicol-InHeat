---
status: complete
date: 2026-11-15
commit: fab481e
---

# Summary: enlarge mascot icon past tile edge and clip so gradient tile is fully covered

## What was done

- `apps/web/src/components/NavBar.jsx` logo tile:
  - span gains `overflow-hidden` (clips anything past the `rounded-[16px]`
    edge),
  - img gains `scale-125` — 40px image rendered at 50px, centered, so the
    ~5px overshoot pushes the PNG's baked-in transparent corner lens fully
    outside the clip.

## Why

The PNG's rounded corners are transparent pixels, so even at the full 40×40
tile the gradient showed through at the corners. Scaling past the edge and
clipping covers the gradient everywhere while the tile keeps its 16px-rounded
shape (corners now show mascot artwork clipped to the tile radius).

## Verification

- `npm run build` in `apps/web`: green (built in 27.58s).

## Tasks completed

- [x] Scale the image past the tile edge and clip it — done, build verified.
