# Bicol In-Heat — Agent Guide

> Working title **Bicol In-Heat** — "Be An Earth System Trend Detective!" (2026 NASA Space Apps Challenge).
> Authoritative concept/decision log: `CONCEPT.md`. This file guides team members and agents.
> This repository hosts the **working prototype** — code work is expected here. The no-code-before-Nov-14 rule was rescinded by the lead on 2026-11-02 (CONCEPT.md decision log); challenge-weekend cut lines **h30 / h42 / h44** remain hard constraints.

## Layout

```
apps/web/                          Vite + React + Tailwind PWA shell — 3 screens (map / ranking / narration), map-first
apps/api/                          Python — server-side ETL & Earthdata-auth work ONLY (secrets live here)
core/                              Shared trend engine: Theil-Sen, Mann-Kendall, Rothfusz heat index, RF/SHAP driver ranking
features/map-controls/             Feature slice: map + time scrubber (has own AGENTS.md sub-contract)
features/layer-uhi-terrain/        Feature slice: UHI / terrain / LST layers (own AGENTS.md)
features/gamified-dashboard/       Feature slice: progress, leaderboard, tasks (own AGENTS.md)
features/chatbot-llm/              Feature slice: narration + variable glossary (own AGENTS.md)
CONCEPT.md                         Authoritative concept doc + decision log — edit only via lead
AGENTS.md                          This file
README.md                          Project readme
package.json / docker-compose.yml  Root tooling — lead-owned
.opencode/                         Agent/tooling config, skills, plugins — tooling, not product code
```

What belongs where: UI → `apps/web`; data pulls + statistical math → `core`; feature verticals → `features/<name>/`; server-only code and secrets → `apps/api`; concept decisions → `CONCEPT.md`.

## Run

Commands below are the **settled intended commands**. Scaffolding files are currently empty (0 lines); script names get added to the `package.json` files as the prototype fills in.

- **Web** (`apps/web/`): `npm install` → `npm run dev` (Vite dev server) → `npm run build` (static PWA bundle: manifest + service worker) → `npm run preview`.
- **API/pipeline** (`apps/api/`): `pip install -r requirements.txt` → `uvicorn main:app --reload` for dev endpoints; ETL runs are invoked as scripts from `apps/api`.
- **Supabase**: hosted, no local process. Dev uses `.env` values (see Environment).

## Environment

**Hard rule: no secrets ship in the client.** The web bundle contains zero API keys and zero passwords; LLM narration is build-time into static JSON, so no LLM key exists anywhere (CONCEPT 6d).

Server-side only — `apps/api/.env`, never committed:

- `EARTHDATA_USERNAME` / `EARTHDATA_PASSWORD` — Earthdata Login (Landsat C2 L2 LANDSAT_OT_C2_L2, MOD44B.061, MCD12Q1.061, ECOSTRESS STRETCH)
- `SUPABASE_SERVICE_ROLE_KEY`
- `FIRMS_MAP_KEY` *(optional, STRETCH only)*

Config, not secrets (web, public-by-design, guarded by RLS):

- Supabase project URL + anon key — allowed in the client; do **not** paste the service-role key into the client.

No auth needed: NASA POWER API (power.larc.nasa.gov), SEDAC GPW, PSA/PSGC boundaries.

⚠️ **`.gitignore` is currently empty (0 lines)** — add `.env` entries before any secrets file exists.

Attribution (compliance box 8): PAGASA station data, PSA/PSGC boundaries, fonts/icons, FIRMS attribution notice.

## Backend

Settled architecture (CONCEPT Sect 13, static PWA + Supabase Auth/Postgres, lock h22):

1. NASA POWER daily T2M + RH2M → Rothfusz heat index, per municipality.
2. Per-municipality time series (1981–2025 baseline) → Theil-Sen slope + Mann-Kendall test, α = 0.05 → *the challenge's "significant"*.
3. Driver features: terrain (SRTM elevation, distance to coast), wind (U10M/V10M), canopy (MOD44B), land cover (MCD12Q1), LST (Landsat C2 L2).
4. Random Forest feature importance / SHAP → driver ranking, reported as **association, not causation**.
5. Build-time open-weights LLM renders computed numbers into plain-language narrative bank (EN + Filipino) → **static JSON** shipped with the app. LLM never generates numbers.
6. PWA reads static JSON — works offline on last-viewed content.

Supabase role: accounts, saved history, leaderboard displaying a **user-chosen handle, never a real name**. Auth behind feature flag from h14; **h30 cut line: leaderboard not done → drop to local-only progress, no auth. Do not renegotiate.**

Secrets boundary: Earthdata + Supabase service-role live only in `apps/api`/server-side; the client fetches only public data + static JSON.

Validation: hold out one PAGASA station + last 3 years; report bias and RMSE. **Non-significant trends still reported** — significance is a flag, not a filter.

⚠️ Open facts — verify, never estimate: POWER daily start year (assumed 1981) and PAGASA access route / Region V station list → **verify at h0/h6**; exact Region V LGU count → **count from official source, verify at h6**.

## Conventions / Gotchas

Scope discipline:

- **Exactly ONE challenge** named: Be An Earth System Trend Detective!
- **Only CORE items (CONCEPT Sect 8) may be claimed** on the project page or video. An unshipped STRETCH item is never presented as a feature.
- The OUT list is final: no runtime LLM, no LSTM forecasting, no SMAP, no barangay-level heat index, more variables than Sect 6a, etc.

Science gotchas:

- **LST ≠ heat index** — satellite skin temperature is much hotter than air; HI comes from POWER T2M+RH2M. The bridge is quantified (hold-out), not assumed.
- **Municipality is the smallest unit, not barangay** — POWER's 0.5° grid (~55 km) cannot resolve finer.
- Landsat 7 post-2003 SLC-off gaps: no clean pre-2013 LST from L7.
- Cloud contamination → report per-municipality sample counts; results always carry sample size.
- RF/SHAP ranks drivers — **association, not proof of causation**.
- Opposite trends in neighboring municipalities can share one cause — that is the challenge's point, not a bug.

Process gotchas:

- Repo hosts the working prototype — code work is expected here; challenge-weekend cut lines (h30/h42/h44) are the hard constraints.
- Language: UI English; narration EN + Filipino (Bicolano = STRETCH only, needs native speaker).
- Every link must resolve in a logged-out private window — test at h44.
- No minor's name, voice, or likeness in video or materials.
- Cut lines are hard: h30 (auth), h42 (STRETCH freeze), h44 (video fallback). Do not renegotiate.
- `.gitignore` empty — fix before first `.env` file.
- Parallel work follows the write-boundary contract below.

### Role / Write-Boundary Contract

Rule: an agent or team member writes **only inside its own boundary**; cross-boundary needs go through the lead, never a direct write.

| Path(s) | Owner | Notes |
|---|---|---|
| `features/<name>/` | That feature's agent only | Each dir has its own `AGENTS.md` as sub-contract |
| `core/` | Core engine owner | Others import; nobody edits |
| `apps/web/` | Web/PWA agent | Client bundle source |
| `apps/api/` | Data-pipeline agent | Only place server secrets are ever read |
| `CONCEPT.md`, `AGENTS.md`, `README.md` | Lead / integrator | CONCEPT edits must update the decision log with a lock hour |
| `.opencode/` | Tooling owner | Not product code |
| Root `package.json`, `docker-compose.yml` | Lead | |
| Static JSON narrative bank | Pipeline writes, web reads | Shared output: produced in `apps/api`/build, consumed by `apps/web` |

### Verified status

| Item | Status | Notes |
|---|---|---|
| Scaffolding paths exist (root, apps/web, apps/api, features/*, core) | **Verified** | Checked on disk 2026-11-02 — all files were 0 lines at check time |
| This AGENTS.md written | **Verified** | Was empty; now filled per planner plan |
| Stack decisions (static PWA + Supabase, build-time LLM, RF/SHAP, Theil-Sen/Mann-Kendall) | **CONCEPT-derived** | Authoritative but TENTATIVE — lock hours h0–h22 per CONCEPT Sect 13 |
| Challenge statement verbatim | **Captured 2026-11-02** | Re-verify live page at h0 (page is JS-rendered) |
| Event name + local close time | **Unverified** | Verify at h0 — OPEN in CONCEPT Sect 13 |
| POWER daily start year (assumed 1981) | **Unverified** | Verify at h6 |
| PAGASA access route + Region V station list | **Unverified** | Verify at h6 |
| Exact Region V LGU count | **Unverified** | Count from official source at h6 — never estimate |
| Challenge URL / iHeatMap URL resolve logged-out | **Pending** | Test in logged-out private window (h0 / h44) |
| `## Run` commands actually execute | **Pending** | Scripts empty until scaffolding fills; run once script entries exist |
