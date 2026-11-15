---
id: 261115-lfs
slug: repair-scrambled-chart-pair-jsx-in-dashb
date: 2026-11-15
status: planned
---

# Quick Plan: repair scrambled chart-pair JSX in DashboardScreen.jsx breaking vite build

## Problem

Vite fails to parse `features/gamified-dashboard/src/DashboardScreen.jsx`:
`Unexpected token, expected "..." (645:72)`.

Root cause (verified by reading lines 554-667): a botched edit pasted a
duplicate clay-styled copy of the Pettitt analyst paragraph (lines 643-654)
*inside* the warming `<ChartCard>` opening tag. That left three defects:

1. The warming `<ChartCard>` opening tag (line 626) never closes — no `>`
   after the `table` prop at line 642.
2. The "Heat and warming charts" `<CollapsibleSection>` (line 599) never
   closes.
3. Lines 656-666 are a malformed remnant: a `{readyData && (` block whose
   `</ChartCard>` has no opener, with the warming `BinBarChart` outside any
   card.

The Pettitt paragraph already exists, correctly placed, at lines 585-596 —
that state was build-verified 2026-11-14b (apps/web AGENTS Status table).
So the repair restores the verified structure.

## Tasks

### 1. Restore the chart-pair section structure

- **files:** `features/gamified-dashboard/src/DashboardScreen.jsx`
- **action:** Replace lines 642-666 with the intended shape:
  - close the warming ChartCard opening tag with `>`,
  - its `<BinBarChart bins={trendDist} ... labelAngle={-24} />` child,
  - `</ChartCard>`,
  - `</CollapsibleSection>` + `)}` to close the pair box,
  - delete the duplicated analyst paragraph (643-654) and the malformed
    remnant (655-666).
- **verify:** `npm run build` in `apps/web` is green; `node test_*.mjs` from
  `features/gamified-dashboard` all exit 0.
- **done:** Parse error gone; chart pair intact; no duplicated Pettitt
  paragraph.

## Constraints

- Only the broken region (642-666) changes; the correctly-styled paragraph
  at 585-596 stays untouched.
- If the clay-token restyle of the Pettitt paragraph was intended, that is a
  follow-up for the gamified-dashboard owner — not part of this parse fix.
- Write boundary: `features/gamified-dashboard/**` only (file owned by this
  slice; repair authorized by the build break, invoked by the user/lead).
