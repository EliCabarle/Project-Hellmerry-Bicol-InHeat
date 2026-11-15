<!-- generated-by: gsd-doc-writer -->

# Getting Started

Get the Bicol In-Heat prototype running locally: the Vite + React PWA (`apps/web`) and the Python
API/pipeline (`apps/api`).

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | >= 18 | Required by Vite 5 (`apps/web`). The repo pins no version — no `engines` field, `.nvmrc`, or `.node-version` exists. |
| npm | ships with Node.js | Each app installs independently; the root `package.json` has no scripts or workspaces. |
| Python | >= 3.10 | Production is pinned to `3.10.12` in `render.yaml`; any 3.10+ works locally. |
| pip | ships with Python | Used for `apps/api/requirements.txt`. |

Optional (only for Supabase-backed features — accounts/leaderboard):

- A Supabase project (hosted; no local process) — see [CONFIGURATION.md](CONFIGURATION.md) for the
  exact variables.

## Installation steps

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd NASA-ProjectHellMerry
   ```

2. Install the web app dependencies:

   ```bash
   cd apps/web
   npm install
   ```

3. Install the API/pipeline dependencies:

   ```bash
   cd apps/api
   pip install -r requirements.txt
   ```

There is no workspace tooling to run — the root `package.json` (`bicol-in-heat`, `"private": true`)
holds no scripts, so both installs are independent.

## First run

Start the web dev server (this is the primary entry point):

```bash
cd apps/web
npm run dev
```

Open the local URL Vite prints in the terminal. The map screen should render with Region V data.

For pipeline/API work, start the FastAPI server in a second terminal:

```bash
cd apps/api
uvicorn main:app --reload
```

`main.py` has no `__main__` block — `uvicorn` is the entry point (default `127.0.0.1:8000`,
interactive docs at `/docs`). Run it from inside `apps/api/` so the module resolves as `main:app`
(the deployed `render.yaml` uses `uvicorn apps.api.main:app` from the repo root instead).

Other web scripts:

```bash
npm run build     # static PWA bundle (manifest + service worker)
npm run preview   # serve the built bundle
```

## Common setup issues

- **`npm run dev` fails at the repo root** — the root `package.json` defines no scripts. Always run
  it from `apps/web/`.
- **Supabase client crash in the browser** — `apps/web/src/lib/supabase.js` reads
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` unconditionally at module load. If either is
  unset, add both values to the repo-root `.env` (public-by-design; the **anon** key only —
  never the service-role key). See [CONFIGURATION.md](CONFIGURATION.md).
- **`uvicorn: command not found` or import errors** — dependencies live in the Python environment:
  run `pip install -r requirements.txt` first, and launch from `apps/api/` (`uvicorn main:app`).
- **`seed_locations.py` exits immediately** — it hard-fails without `SUPABASE_URL` and a Supabase
  key in the repo-root `.env`. Create that file first (gitignored; see [CONFIGURATION.md](CONFIGURATION.md)).
- **Wrong Node/Python version** — Vite 5 needs Node >= 18; the pipeline targets Python 3.10+
  (production pins `3.10.12`). Check with `node --version` and `python --version`.

## Next steps

- [ARCHITECTURE.md](ARCHITECTURE.md) — how the web app, pipeline, and feature slices fit together.
- [CONFIGURATION.md](CONFIGURATION.md) — every environment variable, where it lives, and what is
  required vs optional.
- [README.md](../README.md) — project overview, data sources, and usage examples.
- `AGENTS.md` — working rules, write boundaries, and the verified-status table.
- `CONCEPT.md` — the authoritative concept document and decision log.
