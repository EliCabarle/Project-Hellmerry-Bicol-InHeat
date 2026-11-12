# apps/web — Agent Guide

> Sub-contract under root `AGENTS.md` + `CONCEPT.md`. **Owner: web/PWA agent.**
> Vite + React + Tailwind PWA shell: routing, layout, the 3 screens' mount points, PWA manifest/service worker, Supabase anon client, static-JSON loader.

## Jurisdiction

- **Owns (write ONLY here):** `apps/web/**` — shell, routes, `vite.config.js`, Tailwind config, manifest, service worker, `src/**`.
- **Must NOT touch:** `apps/api/**`, `features/**` internals (mount them, don't edit them), `core/**`, root docs, `.opencode/**`, any secret.
- **Cross-boundary protocol:** request via the lead — never a direct write into another boundary.

## Interface contracts

- **Depends on (read-only):** feature components from `features/<name>/` (mounted via the agreed component interface); static-JSON narrative bank + trend outputs (produced by `apps/api`); Supabase URL + anon key.
- **Provides:** the app shell + routes that mount feature slices; the offline PWA bundle.

## Guardrails — project-wide (root AGENTS.md)

- Only CORE items (CONCEPT §8) may be claimed on the project page/video.
- UI English; narration EN + Filipino. Cut lines h30/h42/h44 are hard.
- Links must resolve logged-out (h44 check).

## Guardrails — this slice

- **Client bundle contains zero API keys and zero passwords.** Supabase anon key only — never the service-role key.
- Offline = last-viewed content only (map tiles + series + progress); no full-offline province (OUT).
- Supabase auth sits behind a feature flag from h14; **h30 cut line: leaderboard not done → local-only progress, no auth. Do not renegotiate.**
- Significance is a rendered flag, not a filter — non-significant trends still display.
- Leaderboard shows the **user-chosen handle, never a real name**.
- `.env`-style secrets never appear in Vite env vars seen by the client.

## Workboard (editable by owner)

| Item | CORE/STRETCH | Status | Owner |
|---|---|---|---|
| App shell + 3-screen routing | CORE | todo | web |
| Map screen mount + layout | CORE | todo | web |
| Ranking screen mount | CORE | todo | web |
| Narration screen mount | CORE | todo | web |
| PWA manifest + service worker | CORE | todo | web |
| Supabase anon client + auth flag | CORE | todo | web |
| Static-JSON loader | CORE | todo | web |
| 2 "Try this" demo seeds wired | CORE | todo | web |

## Status

| Item | Verified? | Notes |
|---|---|---|
| Scaffolding files 0 lines | Verified | checked on disk 2026-11-02 |
| Run commands execute | No | scripts fill in as prototype is built |
