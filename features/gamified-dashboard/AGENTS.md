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
| Dashboard accordion — every block gets its own minimize toggle: Yearly trend, each distribution chart, Top hotspots, Municipality Finder, ranking table (all open by default; KPI row stays pinned) | CORE | built 2026-11-14 — `components/CollapsibleSection.jsx` wraps a native `<details>`; `ChartCard` uses it, the ranking controls/table move inside its body. Independent toggles — closing one never closes another | gamified-dashboard |
| Municipality Finder search — name/province substring, Enter scans the carousel through the municipalities to the match (~0.8 s, strided), Enter again cycles matches, `prefers-reduced-motion` jumps | CORE | built 2026-11-14 — `finderData.matchCards` (pure) + `test_finderSearch.mjs`; scan aborts on Prev/Next/swipe/province change | gamified-dashboard |
| Tab shell: HeatBar + ARIA tablist (Dashboard / Quests / History / Leaderboard), roving tabindex | CORE | built | gamified-dashboard |
| Danger-band exceedance ordering | CORE | built | gamified-dashboard |
| Progress/tracking state | CORE (tier unconfirmed) | built — daily login streak + self-reported quests, append-only HP log (`src/progressStore.js`), one storage key per account via `progressKey(userId)` | gamified-dashboard |
| Daily CSV quests (5/day from `eco_quests_tasks.csv`, difficulty hidden, points by tier 1-15/16-27/28-68) | CORE (tier unconfirmed) | built 2026-11-14 — `src/questTasks.js` draws per Manila day (≥2 easy, avoids yesterday), same list all day, `label` snapshotted into each event | gamified-dashboard |
| Collective weekly HP bar | CORE | built 2026-11-14 — `collective_weekly_hp` view (0009) sums `kind='quest'` rows per ISO week (Monday); `components/WeeklyProgressBar.jsx` shows total + contributors toward a 5,000 HP goal. Resets with no job: a new week has no rows yet, past weeks stay as the archive | gamified-dashboard |
| 5 quests/day enforcement | CORE | built 2026-11-14 — `record_events` caps quest rows at 5 per account per Manila date under a per-account advisory lock; PK `(user_id,date,kind,quest_id)` makes retries and duplicates free. Also enforces hp bounds and `date <= today`; backfill of past days is allowed by design, so the lifetime score is bounded only by claimed days | gamified-dashboard |
| HP → leaderboard score | CORE | built — **event-sourced since 2026-11-14** — `src/eventStore.js` publishes `login`/`quest` rows via `record_events`; the server derives `user_profiles.score` by summing them (0009), so no client-sent total exists. `src/scoreStore.js` only reads the derived score; `progressStore.restoreTo` syncs the local total to it **in both directions** after a successful push, so local HP the server refused (pre-0009 history, duplicate awards) cannot inflate the HeatBar. Guests never publish | gamified-dashboard |
| Check → Submit → lock | CORE | built 2026-11-14 — a tick is **pending** (visual only, `progressStore.getPending`/`togglePending`, never written to the log or published) until **Submit** records it (`submitQuest`); a recorded quest is locked (checkbox disabled, `✓ Recorded`). Cuts the duplicate-points loop: published events are monotonic, so `restoreTo` can never re-add a prize the user unticked | gamified-dashboard |
| Leaderboard UI (handle-only) | CORE | built, live — reads public `leaderboard` view via `leaderboardStore.js`; `LEADERBOARD_ENABLED = true` in `components/Leaderboard.jsx` is the kill switch | gamified-dashboard |
| Local-only progress fallback (h30 path) | CORE | built — progress is local-only, works logged-out and offline, no auth | gamified-dashboard |
| Exportable progress / infographic | STRETCH | todo | gamified-dashboard |

> **Not claimable:** the daily-quest system is lead-authorized in the implementation prompt but CONCEPT §7/§8/§13 and this file's "No daily tasks" guardrail line still say otherwise. Until the lead records those edits, do not claim this feature on the project page or in the video.

## Status

| Item | Verified? | Notes |
|---|---|---|
| `test_questTasks.mjs` (6) + `test_score.mjs` (13) + `test_progress.mjs` (17) | Verified 2026-11-14 | `node test_*.mjs` from this directory, all 10 files exit 0 |
| `test_finderSearch.mjs` (5) | Verified 2026-11-14 | `node test_*.mjs` now 13 files, all exit 0 |
| Dashboard accordion + finder scan in-browser | Verified 2026-11-14 | Headless Chrome 1440×1000 and 390×844: 8 sections toggle independently (closing one leaves its grid neighbour open), a collapse survives a sibling chart re-render, Space toggles a focused summary, finder search lands in ~1.0 s over 16 scroll frames, 0 console errors, no horizontal overflow |
| `npm run build` in apps/web | Verified 2026-11-14 | green; known >500 kB chunk warning only. `dist/data/eco_quests_tasks.csv` present |
| `0009_hp_events.sql` | **Pending** | Run in the Supabase SQL editor. Self-contained and supersedes 0005/0007/0008: drops `quest_events`/`monthly_hp`/`set_my_score`, creates `hp_events`, `record_events` (5/day cap), the score trigger and `collective_weekly_hp` |
| Quests tab in-browser | Verified 2026-11-14 (score path needs 0009) | 5 CSV quests, title+description+HP, stable across reload. Headless Chrome: tick → "Submit" + HeatBar +5 (no event written, pending `csv-17`); Submit → `✓ Recorded`, checkbox disabled, one `csv-17:5` event. Score sync is `pushEvents` -> `readScore` -> `restoreTo`; needs 0009 applied |
| Scaffolding files 0 lines | Superseded | was true 2026-11-02; slice now has source — see Workboard |
| Supabase schema for leaderboard | No | lands when `apps/api` writes it |
| Dashboard build (charts + rename + hotspots) | Verified | tests green, `npm run build` green, 2026-11-11 |
| `test_progress.mjs` (14 tests) + `test_ranking.mjs` + `test_saved.mjs` pass | Verified 2026-11-10 | `node test_*.mjs` from this directory |
| `npm run build` in apps/web | Verified 2026-11-10 | after fresh `npm install`; known >500 kB chunk warning only |
| Viewport checks 320/375/768/1440, keyboard-only tabs, reduced motion, offline reload, zero network from new tabs | No | browser session not run — pending manual check |
| amal10 reference license | No | 404 / `"license": null` — ideas only, no code copied (ATTRIBUTION.md) |
| NoteQuest reference license | Verified 2026-11-10 | MIT — concept adapted with attribution (ATTRIBUTION.md) |
