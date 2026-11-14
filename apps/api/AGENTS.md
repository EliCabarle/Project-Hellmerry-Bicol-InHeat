# apps/api — Agent Guide

> Sub-contract under root `AGENTS.md` + `CONCEPT.md`. **Owner: data-pipeline agent.**
> Python server side: ETL pulls, Earthdata auth, statistical-batch runs, narrative-bank build. The **only** place server secrets are ever read.

## Jurisdiction

- **Owns (write ONLY here):** `apps/api/**` — `main.py`, ETL scripts, `requirements.txt`, `.env` (never committed).
- **Must NOT touch:** `apps/web/**`, `features/**`, `core/**` (import its functions, never edit), root docs (`README.md`, `AGENTS.md`, `CONCEPT.md`), root `package.json` / `docker-compose.yml`, `.opencode/**`.
- **Cross-boundary protocol:** request via the lead — never a direct write into another boundary.

## Interface contracts

- **Depends on (read-only):** `core/` math (Theil–Sen, Mann–Kendall, Rothfusz, RF/SHAP); Supabase Postgres (server-side, service-role).
- **Provides:** computed trend/driver outputs; **static-JSON narrative bank** (pipeline writes, `apps/web` reads) written into the agreed web-assets location.

## Guardrails — project-wide (root AGENTS.md)

- Only CORE items (CONCEPT §8) may be claimed on the project page/video.
- No secrets in the client — keys stop here. UI English; narration EN + Filipino.
- Cut lines h30/h42/h44 are hard. Links must resolve logged-out (h44 check).

## Guardrails — this slice

- Secrets (`EARTHDATA_USERNAME/PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, optional `FIRMS_MAP_KEY`) live only in `apps/api/.env` - never committed, never echoed into logs or the client.
- Build-time LLM **renders computed numbers** into plain language — it **never generates numbers** (CONCEPT 6d).
- Validation: hold out one PAGASA station + last 3 years; report bias + RMSE. Non-significant trends still reported.
- Report per-municipality sample counts (cloud contamination).
- Open facts — verify, never estimate: POWER daily start year (h6), PAGASA access route / Region V station list (h6), exact Region V LGU count (h6).

## Workboard (editable by owner)

| Item | CORE/STRETCH | Status | Owner |
|---|---|---|---|
| POWER daily T2M/RH2M pull → Rothfusz HI | CORE | todo | pipeline |
| PAGASA ground-truth (Region V) | CORE | todo | pipeline |
| Landsat LST / MOD44B / MCD12Q1 driver pulls | CORE | todo | pipeline |
| Trend batch via `core/` (slope + Mann-Kendall) | CORE | todo | pipeline |
| RF/SHAP driver ranking | CORE | todo | pipeline |
| Build-time LLM narrative bank → static JSON | CORE | todo | pipeline |
| Hold-out validation (bias/RMSE) | CORE | todo | pipeline |
| Supabase writes (accounts/leaderboard data) | CORE | todo | pipeline |

## Status

| Item | Verified? | Notes |
|---|---|---|
| Scaffolding files 0 lines | Verified | checked on disk 2026-11-02 |
| POWER start year / PAGASA route / LGU count | **No** | verify at h6 (CONCEPT §13) |
