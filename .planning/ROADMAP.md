# Roadmap: Bicol In-Heat

## Overview

Working prototype for the 2026 NASA Space Apps challenge "Be An Earth System Trend
Detective!" The first phase makes the URL hash the source of truth for which screen a
page load restores, so refreshing (and browser back/forward) keeps the user on the
Map, Manage Account, Top BECOlanos, Dashboard or Settings screen instead of bouncing
them to the Landing page.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 01: hash-routing** - Refresh and back/forward restore the current screen via URL hash routes

## Phase Details

### Phase 01: hash-routing

**Goal**: The URL hash names the active screen (and dashboard sub-tab), so a refresh, a shared link, or browser back/forward lands on the same screen the user was on — while an empty hash on a true first visit still shows the Landing screen (lead ruling 2026-11-14) and `#muni=` deep links keep working logged-out.
**Depends on**: Nothing (first phase)
**Requirements**: [UI-SPEC]
**Success Criteria** (what must be TRUE):

  1. Refreshing on Map, Dashboard (incl. quests/leaderboard tabs), Manage Account or Settings stays on that screen; the URL carries a shareable route hash.
  2. A first visit with an empty hash (and any unrecognized hash) still renders the Landing screen, and `#muni=<joinKey>` links open the map with that municipality selected, logged-out.
  3. Browser back/forward walks between screens, and `node apps/web/test_*.mjs` plus `npm --prefix apps/web run build` are green.

**Plans**: 1/2 plans executed

Plans:

- [x] 01-01-PLAN.md
- [ ] 01-02-PLAN.md
- [x] 01-01: Route grammar module + load-time restore + skip-link hash protection
- [ ] 01-02: navigate() hash writes + popstate/hashchange restore + acceptance matrix

## Progress

**Execution Order:**
Phases execute in numeric order: 01

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 01. hash-routing | 1/2 | In Progress|  |
