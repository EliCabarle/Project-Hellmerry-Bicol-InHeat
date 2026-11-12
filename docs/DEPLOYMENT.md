<!-- generated-by: gsd-doc-writer -->

# Deployment

Bicol In-Heat deploys as two independently hosted pieces: a **static Vite/React PWA** (the user-facing app) and a **hosted Supabase project** (auth, Postgres, leaderboard). The Python `apps/api` service is a data pipeline and dev API — it is not part of the production client path.

## Deployment targets

| Target | What ships there | Config in repo |
|---|---|---|
| Static host (Netlify / Vercel / GitHub Pages / any file server) | `apps/web/dist/` — built PWA bundle | `apps/web/vite.config.js` (build output default `dist/`) |
| Supabase (hosted) | Auth, Postgres, RLS-guarded tables | `supabase/migrations/*.sql`, `apps/api/migrations/*.sql` |
| Optional dev API | FastAPI service from `apps/api/main.py` | `uvicorn main:app` |

- No platform config files exist in the repository — no `vercel.json`, `netlify.toml`, `fly.toml`, `Dockerfile`, or `.github/workflows/`. The root `docker-compose.yml` is present but **empty (0 lines)**; it is a placeholder, not a working deployment definition.
- Hosting platform choice is therefore open. <!-- VERIFY: chosen static host and its project URL --> <!-- VERIFY: Supabase project URL -->

## Build pipeline

No CI/CD pipeline is configured — every step below runs manually. Order matters: the static JSON narrative bank must exist before the web build.

1. **ETL / trend pipeline** (from `apps/api`, in order):

   ```bash
   cd apps/api
   pip install -r requirements.txt
   python fetch_boundaries.py
   python fetch_power_data.py
   python calculate_trends.py
   python calculate_drivers.py
   python generate_static_json.py
   python push_to_supabase.py
   ```

   Outputs land in `apps/api/output/` (e.g. `trends.json`, `narratives.json`).

2. **Publish static data into the web bundle.** `generate_static_json.py` writes to `apps/api/output/` by design (cross-boundary rule); copy the result into the web public dir before building, e.g.:

   ```bash
   python generate_static_json.py --out ../web/public/data/narratives.json
   ```

   Pre-shipped static files already live in `apps/web/public/data/` (`narratives.json`, `bicol-municipalities.geojson`).

3. **Build the web bundle:**

   ```bash
   cd apps/web
   npm install
   npm run build     # outputs apps/web/dist/
   npm run preview   # local smoke-test of the production build
   ```

4. **Deploy** the contents of `apps/web/dist/` to the static host. <!-- VERIFY: actual deploy command / connected Git repo for the chosen host -->

## Environment setup

Full variable reference: [CONFIGURATION.md](CONFIGURATION.md). Production essentials:

**Client (build-time, public-by-design — set as build env vars on the host):**

| Variable | Required | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | Optional* | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Optional* | Anon (public) key — **never** the service-role key |

\* The app builds and runs without them, but accounts/leaderboard/Saved Places are disabled and `AuthButton` shows a "missing config" state.

**Server-side (`apps/api/.env`, secrets — never in the client bundle, never committed):**

- `EARTHDATA_USERNAME` / `EARTHDATA_PASSWORD` — Earthdata Login, needed only when running ETL.
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (some scripts also read `SUPABASE_SERVICE_KEY` / `SUPABASE_KEY`) — used by `push_to_supabase.py` and `seed_locations.py`.
- `FIRMS_MAP_KEY` — optional, STRETCH-only.

Set these in the pipeline runner's environment (local `.env` or CI secret store) — never as `VITE_*` variables. <!-- VERIFY: production secret-store location if/when a CI runner is added -->

**Supabase-side setup on a fresh project:**

```bash
supabase db push          # applies supabase/migrations/*.sql
# driver table migration, run separately:
psql ... -f apps/api/migrations/0002_top_drivers.sql
```

Enable RLS policies contained in those migration files; the leaderboard is read publicly, writes are user-scoped.

## Rollback procedure

No automated rollback exists in the repo. The static-host model makes rollback simple:

1. **Web bundle:** redeploy the previous `dist/` artifact — keep the last-known-good build archive, or redeploy the previous Git commit if the host is Git-connected. <!-- VERIFY: host-specific rollback command -->
2. **Supabase schema:** migrations are forward-only files; to revert a bad migration write and apply a corrective migration — do not edit an applied file in place.
3. **Static JSON data:** re-run the pipeline from the previous `output/` snapshot or restore the prior `apps/web/public/data/*` files and rebuild.

## Monitoring

- No APM/error-tracking integration is configured — no Sentry, Datadog, OpenTelemetry, or similar appears in any `package.json` or `requirements.txt`. <!-- VERIFY: add error monitoring before public launch if desired -->
- What exists today:
  - **FastAPI dev API** (`apps/api/main.py`) logs to stdout when run under `uvicorn`; endpoints `/`, `/locations`, `/anomalies`, `/verdant` return JSON errors inline.
  - **Static host logs** — request logs on whatever platform you choose (see the host's dashboard). <!-- VERIFY: host dashboard URL -->
  - **Supabase dashboard** — auth events, table usage, and API logs in the project's dashboard. <!-- VERIFY: Supabase dashboard URL -->
- Client-side failures (e.g. missing `VITE_SUPABASE_*`) surface as a visible degraded UI state in `AuthButton`, not as silent errors.

## Production checklist

- [ ] `npm run build` completes with zero errors; `npm run preview` smoke-tested.
- [ ] `narratives.json` and `bicol-municipalities.geojson` present in `apps/web/public/data/` and current.
- [ ] Client bundle contains **zero** secrets — grep the build output for `SERVICE_ROLE`, `EARTHDATA`, passwords.
- [ ] `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` set as public build vars; service-role key absent from the client.
- [ ] Supabase migrations applied and RLS enabled.
- [ ] Every link resolves in a logged-out private window.
- [ ] PWA manifest/service worker active and offline last-view works.
