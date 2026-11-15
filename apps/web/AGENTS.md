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
| Narration screen mount | CORE | done — `src/screens/NarrationScreen.jsx` (UI overhaul: region view + municipality view, replicability messaging, clay design system, inline SVG illustrations), wired in `app.jsx` route + `AppMenu` | web |
| PWA manifest + service worker | CORE | done — `public/manifest.webmanifest`, `public/sw.js`, icons in `public/icons/` | web |
| Supabase anon client + auth flag | CORE | todo | web |
| Privacy notice + consent gate | CORE | done — `src/lib/privacy.js`, `src/components/PrivacyDialog.jsx`, gate owned by `app.jsx`, permanent link in `AppMenu` + Account pill | web |
| Static-JSON loader | CORE | todo | web |
| 2 "Try this" demo seeds wired | CORE | todo | web |

## Status

| Item | Verified? | Notes |
|---|---|---|
| Scaffolding files 0 lines | Verified | checked on disk 11-13-2026 |
| Run commands execute | Yes | `npm ci && npm run build && npm run preview` verified 11-13-2026; installable PWA verified in Chrome (SW activated, offline reload renders map + dashboard) |
| Privacy gate (RA 10173 §16(b) notice, consent before handle) | Yes | Verified 11-13-2026: `node test_privacy.mjs` 4 pass, `npm run build` green, headless Chrome 1440/390 — landing footer link opens the notice, focus starts inside, Escape closes, no overflow, 0 console errors; the first-sign-in gate was exercised with a stubbed session + stubbed `user_profiles`/`user_metadata` (no real account was used). Three placeholders still ship as literals: contact email, accountable person, Supabase region |
| Privacy notice follows `data-theme` | Yes | Verified 11-13-2026 in headless Chrome at 1440/390, light and dark: panel `#FFFFFF` → `#131D33`, title 15.99:1 / 14.30:1, body 11.42:1 / 10.48:1, links 7.09:1 / 11.64:1; flipping `data-theme` with the dialog open repaints it in place (CSS only, no remount). Uses clay tokens (`bg-clay-white`, `text-clay-text-*`) because `dark-theme.css` redeclares those; a bare `bg-heat-deep` does **not** flip and leaves pale-lavender panels with near-white text |
