<!-- generated-by: gsd-doc-writer -->

# Testing

This project has **no test framework installed and no test runner script**. Every `package.json`
(root and `apps/web`) lacks a `test` script, and there are no Jest/Vitest/Pytest configs anywhere.
Tests are plain standalone scripts you execute directly with `node` or Python's built-in
`unittest` — each file's first line documents its own run command.

## Test files and how to run them

### JavaScript / ESM (`node:test` + `node:assert`)

Run each file with Node directly. Imports are relative to the test file, so the commands work
from the repo root (they are written here that way):

```bash
node features/map-controls/test_engine.mjs        # map engine + timeline store
node features/map-controls/test_year.mjs          # colour ramp + year-view checks
node features/gamified-dashboard/test_ranking.mjs # slope/danger ranking logic
node features/gamified-dashboard/test_saved.mjs   # saved-history logic
node features/gamified-dashboard/test_progress.mjs # Heat Points event-log logic
node apps/web/test_profile.mjs                    # handle validation vs DB constraint
```

Notes on how these behave:

- They import `test` from `node:test`, but the primary gate is a local `assert` helper that
  prints `FAIL: <msg>` and calls `process.exit(1)` on the first failing assertion. A passing run
  prints `ok:` lines (and often a final `... PASSED` banner) and exits 0.
- They are **offline**: `test_engine.mjs` reads a local GeoJSON (`src/data/ph-regions.geojson`);
  no network, no Supabase, no secrets required.
- Last verified results (see `HANDOFF.md`): `test_engine.mjs` 14/14, `test_year.mjs` 4/4,
  `test_ranking.mjs` 4/4 (2026-11-09); `test_progress.mjs` (14 tests), `test_ranking.mjs`,
  `test_saved.mjs` all pass (2026-11-10, run from `features/gamified-dashboard/`).

### Python (`unittest`)

```bash
cd apps/api
python -m unittest test_pipeline -v        # or: python test_pipeline.py
```

- `test_pipeline.py` is a standard `unittest` suite with a `unittest.main()` guard. It is
  **offline by design** (its docstring says "No network") and imports pipeline modules
  (`calculate_trends`, `calculate_drivers`, `fetch_power_data`, `generate_static_json`,
  `push_to_supabase`, `validate_pagasa`) — so run it from `apps/api`, where those modules live.
- Requires `pandas` (and the rest of `apps/api/requirements.txt`). `HANDOFF.md` records the last
  green run as `uv run python -m unittest test_pipeline` → **32/32** (2026-11-07), which needs a
  `.venv` in `apps/api`; a plain `pip install -r requirements.txt` environment works the same way.
- `apps/api/validate_pagasa.py` is **not a test suite** — it is the PAGASA hold-out validation
  module (bias/RMSE comparison, `compare()` and `metrics()`), exercised *by* `test_pipeline.py`
  via `from validate_pagasa import compare, metrics`. It has no `__main__` block, so it cannot be
  run directly as a script.

## Writing new tests

- **JavaScript:** name the file `test_<topic>.mjs` and colocate it with the slice it tests
  (`features/<slice>/` or `apps/web/`). Import from `node:test` and `node:assert/strict`, and keep
  the slice's local `assert` helper pattern (`console.error('FAIL: ...'); process.exit(1)`) so a
  single failure fails the process. Document the run command in line 1:
  `// Run: node test_<topic>.mjs — <what it checks>; fails on any assertion.`
- **Python:** name the file `test_<topic>.py` in `apps/api/`, use `unittest.TestCase` classes, and
  keep tests offline (no Earthdata/Supabase/network calls — pipeline fixtures go through
  small in-memory `pandas` frames like `_daily()` in `test_pipeline.py`).
- There are no shared test helpers/fixtures directories; each test file is self-contained.

## Coverage requirements

**No coverage threshold configured.** There is no `nyc`/`c8` config, no `jest.config`/
`vitest.config`, no `pytest.ini`/`pyproject.toml`, and no coverage flags in any script. Coverage
is not measured.

## CI integration

**No CI pipeline exists.** The `.github/` directory contains no workflows (no
`.github/workflows/`), and there is no GitLab CI, CircleCI, Azure Pipelines, or Jenkins config.
The only deployment config, `render.yaml`, defines a `buildCommand`
(`pip install -r apps/api/requirements.txt`) and a `startCommand` for the FastAPI service —
neither runs tests, so nothing gates a deploy on test results today.

To verify tests before a change ships, run the commands above manually:

```bash
# JS suites (from repo root)
node features/map-controls/test_engine.mjs
node features/map-controls/test_year.mjs
node features/gamified-dashboard/test_ranking.mjs
node features/gamified-dashboard/test_saved.mjs
node features/gamified-dashboard/test_progress.mjs
node apps/web/test_profile.mjs

# Python suite
cd apps/api && python -m unittest test_pipeline -v
```
