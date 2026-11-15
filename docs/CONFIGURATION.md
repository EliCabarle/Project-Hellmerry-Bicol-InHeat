<!-- generated-by: gsd-doc-writer -->

# Configuration

No `.env.example` exists in this repo. The authoritative environment-variable list lives in the
`Environment` section of `AGENTS.md` and in `render.yaml` `envVars`. This document consolidates both,
plus every `os.getenv` / `import.meta.env` reference found in `apps/api` and `apps/web`.

Secrets rule (hard): the web bundle contains **zero** API keys and zero passwords. Server secrets live
only in the repo-root `.env`, which is gitignored (root `.gitignore` covers `.env` and `*.env`).

## Environment variables

### Server-side â€” the repo-root `.env` (secrets)

Loaded with `python-dotenv` in `fetch_power_data.py`, `seed_locations.py`, and `push_to_supabase.py`
(each loads the repo-root `.env` explicitly).

| Variable | Required | Default | Description |
|---|---|---|---|
| `SUPABASE_URL` | Required for `push_to_supabase.py` / `seed_locations.py` | â€” | Supabase project URL. `seed_locations.py` exits with an error if missing. |
| `SUPABASE_SERVICE_ROLE_KEY` | Required for `seed_locations.py` | â€” | Supabase service-role key. `seed_locations.py` accepts this name, or falls back to `SUPABASE_KEY`, then `VITE_SUPABASE_KEY`. |
| `SUPABASE_SERVICE_KEY` | Required for `push_to_supabase.py` | â€” | Same service-role key, different name â€” `push_to_supabase.py` reads **only** `SUPABASE_SERVICE_KEY`. The naming is inconsistent across scripts (tracked as issue B8 in `HANDOFF.md`); in practice the same value must be present under both names, or `AGENTS.md`'s canonical name `SUPABASE_SERVICE_ROLE_KEY` plus the aliases `seed_locations.py` already falls back to. |
| `EARTHDATA_USERNAME` | Required for Earthdata-auth ETL steps | â€” | Earthdata Login username for Landsat C2 L2 (`LANDSAT_OT_C2_L2`), `MOD44B.061`, `MCD12Q1.061`, and ECOSTRESS (STRETCH). Currently declared in `AGENTS.md` but **no script reads it yet** â€” the Landsat/canopy/land-cover fetchers are not written. |
| `EARTHDATA_PASSWORD` | Required for Earthdata-auth ETL steps | â€” | Earthdata Login password. Same status as `EARTHDATA_USERNAME`. |
| `FIRMS_MAP_KEY` | Optional (STRETCH only) | â€” | NASA FIRMS map key. Never claim FIRMS features unless shipped. |

No secrets are needed for the NASA POWER API, SEDAC GPW, or PSA/PSGC boundary fetches (no auth).

### Client-side â€” the repo-root `.env` (public by design)

Read via `import.meta.env` in `apps/web/src/lib/supabase.js`:

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Required | â€” | Supabase project URL. Public-by-design, guarded by RLS. |
| `VITE_SUPABASE_ANON_KEY` | Required | â€” | Supabase anon (public) key. Public-by-design, guarded by RLS. |

**Never** expose `SUPABASE_SERVICE_ROLE_KEY` through `import.meta.env`. Only `VITE_*`
variables reach the client bundle; everything else in the root `.env` is server-side only.

### Platform-provided

| Variable | Where | Description |
|---|---|---|
| `PYTHON_VERSION` | `render.yaml` (pinned `3.12.7`) | Python runtime version on Render. |
| `PORT` | Render (implicit) | `render.yaml` starts the API with `uvicorn apps.api.main:app --host 0.0.0.0 --port $PORT`. |

## Config file format

The project uses YAML platform config plus dotenv files â€” there is no `config/` directory or
`*.config.js` beyond Vite's defaults.

### `render.yaml` (Render web service)

```yaml
services:
  - type: web
    name: bicol-in-heat-api
    env: python
    region: singapore
    plan: free
    buildCommand: pip install -r apps/api/requirements.txt
    startCommand: uvicorn apps.api.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: PYTHON_VERSION
        value: 3.10.12
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_KEY
        sync: false
```

Top-level keys: `services[]` (one web service). Each service: `type`, `name`, `env`, `region`,
`plan`, `buildCommand`, `startCommand`, `envVars`. `sync: false` means the value is entered manually
in the Render dashboard, not synced from the repo.

### dotenv files (not committed)

| File | Loaded by | Contains |
|---|---|---|
| `.env` (repo root) | `python-dotenv` in every `apps/api` script; Vite via `envDir` | Server secrets + public `VITE_*` vars |
| the repo-root `.env` | Vite (auto) | `VITE_*` public vars â€” see warning above about the stray service-role key |


## Required vs optional settings

- **API server itself (`uvicorn main:app`)**: no environment variables required. It starts with
  open CORS (`allow_origins=["*"]` in `apps/api/main.py`) and reads no secrets at import time.
- **`seed_locations.py`**: **hard-fails at startup** if `SUPABASE_URL` or a Supabase key is missing â€”
  it prints an error and exits before creating the client (no fallback value).
- **`push_to_supabase.py`**: passes `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` from the environment to
  the Supabase client; missing values will make the client call fail.
- **Web app**: fails at runtime if `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is unset â€” the
  Supabase client in `apps/web/src/lib/supabase.js` reads them unconditionally at module load.
- **`EARTHDATA_USERNAME` / `EARTHDATA_PASSWORD`**: not read by any current script; required only when
  the Earthdata-auth fetchers (Landsat/canopy/land cover) are implemented.
- **`FIRMS_MAP_KEY`**: optional, STRETCH scope only.

## Defaults

| Setting | Default | Where set |
|---|---|---|
| CORS allowed origins | explicit allowlist (`localhost:5173/4173` + `bicol-in-heat*.vercel.app`) | `apps/api/main.py` |
| Supabase key fallback chain | `SUPABASE_SERVICE_ROLE_KEY` â†’ `SUPABASE_KEY` â†’ `VITE_SUPABASE_KEY` | `apps/api/seed_locations.py` |
| Python version | `3.12.7` | `render.yaml` |
| API host/port | `0.0.0.0` / `$PORT` | `render.yaml` `startCommand`; locally `uvicorn main:app --reload` (default `127.0.0.1:8000`) |

No environment variables have coded fallback values (no `process.env.X || 'default'` patterns);
everything without a default above is simply absent if unset.

## Per-environment overrides

- **Development (both)**: one `.env` at the repo root. Python scripts load it explicitly;
  Vite loads it via `envDir` in `apps/web/vite.config.js`.
- **Production**: Supabase web values are set as build env vars on Vercel; API secrets are set
  in the Render dashboard (`sync: false` in `render.yaml`). No `.env` is deployed.
- There are no `.env.development` / `.env.production` / `.env.test` files, and no `NODE_ENV`
  conditionals; environment separation is by which `.env` file a process loads and by the hosting
  platform's variable store.

## Where each variable is actually read

| Variable | Read in |
|---|---|
| `SUPABASE_URL` | `apps/api/push_to_supabase.py`, `apps/api/seed_locations.py` (also accepts `VITE_SUPABASE_URL`) |
| `SUPABASE_SERVICE_ROLE_KEY` | `apps/api/seed_locations.py` |
| `SUPABASE_SERVICE_KEY` | `apps/api/push_to_supabase.py` |
| `SUPABASE_KEY` / `VITE_SUPABASE_KEY` | `apps/api/seed_locations.py` (fallbacks) |
| `VITE_SUPABASE_URL` | `apps/web/src/lib/supabase.js` |
| `VITE_SUPABASE_ANON_KEY` | `apps/web/src/lib/supabase.js` |
| `EARTHDATA_USERNAME` / `EARTHDATA_PASSWORD` / `FIRMS_MAP_KEY` | documented in `AGENTS.md`, not yet read in code |
