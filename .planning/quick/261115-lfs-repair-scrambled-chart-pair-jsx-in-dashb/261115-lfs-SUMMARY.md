---
status: complete
date: 2026-11-15
commit: 48b5bb6
---

# Summary: repair scrambled chart-pair JSX in DashboardScreen.jsx breaking vite build

## What was done

- Repaired `features/gamified-dashboard/src/DashboardScreen.jsx` lines 642-666:
  - closed the warming `<ChartCard>` opening tag (`>` after the `table` prop),
  - restored its `<BinBarChart bins={trendDist} ... labelAngle={-24} />` child
    inside the card,
  - closed the "Heat and warming charts" `</CollapsibleSection>` + `)}` block,
  - deleted the duplicated Pettitt analyst paragraph (misplaced clay-styled
    copy pasted inside the ChartCard opening tag) and the malformed
    `{readyData && (…</ChartCard>…` remnant below it.

## Root cause

A botched edit pasted a duplicate of the Pettitt paragraph (which already
exists correctly at lines 585-596) inside the warming ChartCard's opening
tag, leaving the tag unclosed, the pair box unclosed, and a broken remnant
behind. The pre-break state (build-verified 2026-11-14b) was restored.

## Verification

- `node test_*.mjs` from `features/gamified-dashboard`: 15/15 files pass.
- `npm run build` in `apps/web`: green — built in 14.38s (only the known
  >500 kB chunk warning).

## Notes / follow-ups

- The stray copy used clay tokens (`bg-heat-surface/80`, `text-clay-text-muted`,
  `text-heat-ink`) while the surviving paragraph (585-596) uses hardcoded hex
  (`#FFFDF9` / `#8C847A` / `#7F2D08`). If the intent was a clay-token restyle
  of the Pettitt paragraph, that is a follow-up for the gamified-dashboard
  owner — hard-coded hex does not flip with `data-theme` (per apps/web
  AGENTS Status table), so the surviving paragraph may be worth restyling
  deliberately.
- Write boundary honored: only `features/gamified-dashboard/**` touched.

## Tasks completed

- [x] Restore the chart-pair section structure — done, build + tests verified.
