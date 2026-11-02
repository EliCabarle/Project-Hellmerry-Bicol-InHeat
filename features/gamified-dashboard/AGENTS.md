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
| Ranking screen (slope + p-value ordering) | CORE | todo | gamified-dashboard |
| Danger-band exceedance ordering | CORE | todo | gamified-dashboard |
| Progress/tracking state | CORE | todo | gamified-dashboard |
| Leaderboard UI (handle-only) | CORE | todo | gamified-dashboard |
| Local-only progress fallback (h30 path) | CORE | todo | gamified-dashboard |
| Exportable progress / infographic | STRETCH | todo | gamified-dashboard |

## Status

| Item | Verified? | Notes |
|---|---|---|
| Scaffolding files 0 lines | Verified | checked on disk 2026-11-02 |
| Supabase schema for leaderboard | No | lands when `apps/api` writes it |
