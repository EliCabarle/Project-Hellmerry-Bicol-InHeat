# features/gamified-dashboard — Agent Guide

> Sub-contract under root `AGENTS.md` + `CONCEPT.md`. **Owner: gamified-dashboard feature agent.**
> Feature slice: the ranking screen + gamification — municipality ranking, task progress, leaderboard.

## Jurisdiction

- **Owns (write ONLY here):** `features/gamified-dashboard/**`.
- **Must NOT touch:** `apps/web/**` (auth policy, routing, service worker), `features/map-controls/**`, `features/layer-uhi-terrain/**`, `features/chatbot-llm/**`, `apps/api/**`, `core/**`, root docs.
- **Cross-boundary protocol:** request via the lead — never a direct write into another boundary.

## Interface contracts

- **Depends on (read-only):** trend outputs (slopes, p-values, danger-band exceedances) from the web shell's data loader; Supabase anon client mounted by the web shell; leaderboard schema owned by `apps/api` writes.
- **Provides:** ranking screen UI, progress state, leaderboard components.

## Guardrails — project-wide (root AGENTS.md)

- Only CORE items (CONCEPT §8) may be claimed on the project page/video.
- UI English. Cut lines h30/h42/h44 are hard. Links resolve logged-out (h44 check).

## Guardrails — this slice

- **Leaderboard displays the user-chosen handle, never a real name** — no personal data in any surface (CONCEPT privacy guard).
- **Auth behind feature flag from h14; h30 cut line: leaderboard not done → drop to local-only progress, no auth. Do not renegotiate.**
- Ranking uses trend slope + significance **as displayed values** — non-significant trends still rank/appear (flag, not filter).
- Rank ordering must not hide the "how much" (slope magnitude) or sample size.
- No daily tasks (OUT list) — progress model follows CONCEPT §8 only.
- Offline = last-viewed progress only; no whole-province offline cache (STRETCH per §8).

## Workboard (editable by owner)

| Item | CORE/STRETCH | Status | Owner |
|---|---|---|---|
| Dashboard screen (slope + p-value ordering) — renamed from Ranking, 2026-11-11 (lead decision Q4-B) | CORE | built | gamified-dashboard |
| Analytics visualizations: KPI row, yearly trend, heat/rate histograms, danger bands, driver ranking (charts read map ramp bins/colours only) | CORE | built | gamified-dashboard |
| Top hotspots + "Show on map" (shell-mediated + `#muni=` deep link) | CORE | built | gamified-dashboard |
| Municipality Finder: province dropdown (derived) + coverflow 3D cards — outline+name front, data/why back (lead decision: B + P1 + D-full, 2026-11-11) | CORE | built | gamified-dashboard |
| Single-scroll dashboard (S1): one page scrollbar, sticky header via `overflow-clip` | CORE | built | gamified-dashboard |
| Tab shell: HeatBar + ARIA tablist (Dashboard / Quests / History / Leaderboard), roving tabindex | CORE | built | gamified-dashboard |
| Danger-band exceedance ordering | CORE | built | gamified-dashboard |
| Progress/tracking state | CORE (tier unconfirmed) | built — daily login streak + self-reported quests, append-only HP log (`src/progressStore.js`) | gamified-dashboard |
| Leaderboard UI (handle-only) | CORE | built, live — reads public `leaderboard` view via `leaderboardStore.js`; `LEADERBOARD_ENABLED = true` in `components/Leaderboard.jsx` is the kill switch | gamified-dashboard |
| Local-only progress fallback (h30 path) | CORE | built — progress is local-only, works logged-out and offline, no auth | gamified-dashboard |
| Exportable progress / infographic | STRETCH | todo | gamified-dashboard |

> **Not claimable:** the daily-quest system is lead-authorized in the implementation prompt but CONCEPT §7/§8/§13 and this file's "No daily tasks" guardrail line still say otherwise. Until the lead records those edits, do not claim this feature on the project page or in the video.

## Status

| Item | Verified? | Notes |
|---|---|---|
| Scaffolding files 0 lines | Superseded | was true 2026-11-02; slice now has source — see Workboard |
| Supabase schema for leaderboard | No | lands when `apps/api` writes it |
| Dashboard build (charts + rename + hotspots) | Verified | tests green, `npm run build` green, 2026-11-11 |
| `test_progress.mjs` (14 tests) + `test_ranking.mjs` + `test_saved.mjs` pass | Verified 2026-11-10 | `node test_*.mjs` from this directory |
| `npm run build` in apps/web | Verified 2026-11-10 | after fresh `npm install`; known >500 kB chunk warning only |
| Viewport checks 320/375/768/1440, keyboard-only tabs, reduced motion, offline reload, zero network from new tabs | No | browser session not run — pending manual check |
| amal10 reference license | No | 404 / `"license": null` — ideas only, no code copied (ATTRIBUTION.md) |
| NoteQuest reference license | Verified 2026-11-10 | MIT — concept adapted with attribution (ATTRIBUTION.md) |
