from dotenv import load_dotenv
from pathlib import Path

# Force-load the repo-root .env before any module reads os.environ.
load_dotenv(Path(__file__).resolve().parents[2] / ".env", override=True)

from datetime import date, datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List

import numpy as np
import pandas as pd

try:  # `uvicorn main:app` from apps/api
    from routers import qa
except ModuleNotFoundError as exc:  # `uvicorn apps.api.main:app` from the repo root
    # Only fall back when the `routers` package itself is missing. Re-raise
    # anything deeper (e.g. a missing dependency inside qa.py) — swallowing it
    # here used to surface as a misleading `No module named 'apps'`.
    if exc.name not in ("routers", "routers.qa"):
        raise
    from apps.api.routers import qa

app = FastAPI(
    title="Bicol In-Heat API",
    description="Backend API for Bicol In-Heat (2026 NASA Space Apps Challenge)",
    version="0.1.0",
    # No /docs in production: the OpenAPI page advertises every route, and
    # the scaffold endpoints it used to list returned fabricated numbers.
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

# Explicit allowlist. Vite dev/preview reach /api through the proxy (same-origin);
# these entries cover the VITE_API_BASE_URL path where the browser calls Render
# directly. allow_credentials stays False: the frontend sends no cookies, and
# Starlette mirrors the request Origin whenever credentials are enabled, which
# would quietly re-open the endpoint to every site on the internet.
# Replace the production entry with the real Vercel domain after the first deploy.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "https://bicol-in-heat.vercel.app",
    ],
    # Preview deployments get a random host per push; scoped to this project's
    # prefix so other people's Vercel apps cannot call the endpoint.
    allow_origin_regex=r"https://bicol-in-heat-[a-z0-9-]+\.vercel\.app",
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Bicol In-Heat API"}


app.include_router(qa.router)


@app.get("/")
def read_root():
    return {
        "status": "online",
        "project": "Bicol In-Heat",
        "challenge": "Be An Earth System Trend Detective!",
    }


# ---------------------------------------------------------------------------
# Time Machine endpoint: cached POWER dataframe + per-municipality history
# ---------------------------------------------------------------------------
API_DIR = Path(__file__).resolve().parent
POWER_CSV = API_DIR / "data" / "power_daily_full.csv"
MIN_DATE = date(1981, 1, 1)
MAX_DATE = date(2025, 12, 31)
DANGER_THRESHOLD = 42.0

_df_cache: pd.DataFrame | None = None
_pct_cache: dict[tuple[str, str], np.ndarray] = {}


def _load_power() -> tuple[pd.DataFrame, dict]:
    """Lazy-load the POWER daily CSV and build per-municipality history arrays."""
    global _df_cache, _pct_cache
    if _df_cache is None:
        if not POWER_CSV.exists():
            raise HTTPException(
                status_code=503,
                detail=(
                    "Daily heat data is not deployed. Run fetch_power_data.py "
                    "locally; the CSV is too large to ship to the web service."
                ),
            )
        _df_cache = pd.read_csv(POWER_CSV, low_memory=False)
        _df_cache["date"] = pd.to_datetime(_df_cache["date"], errors="coerce")
        _df_cache = _df_cache.dropna(subset=["date", "heat_index_max_c"])
        # Precompute sorted annual heat-index history per municipality for percentile lookups.
        _pct_cache = {}
        for (name, prov), group in _df_cache.groupby(["name", "province"]):
            _pct_cache[(str(name), str(prov))] = np.sort(
                group["heat_index_max_c"].dropna().to_numpy(dtype=float)
            )
    return _df_cache, _pct_cache


@app.get("/api/heat/{date}", response_model=List[dict])
def get_heat_for_date(date: str):
    """Daily heat index for all municipalities on a given date (Time Machine).

    Returns heat_index_max_c, nighttime_heat_index_c, danger flag, and the
    percentile rank of the day's heat index within each municipality's
    45-year history.
    """
    # --- validate date format & range ---
    try:
        target = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=400, detail="Invalid date format. Use YYYY-MM-DD."
        )
    if target < MIN_DATE or target > MAX_DATE:
        raise HTTPException(
            status_code=400,
            detail=f"Date out of range ({MIN_DATE.isoformat()} to {MAX_DATE.isoformat()}).",
        )

    df, pct_cache = _load_power()
    target_ts = pd.Timestamp(target)

    day_rows = df[df["date"] == target_ts]
    if day_rows.empty:
        return []

    results: List[dict] = []
    for _, row in day_rows.iterrows():
        key = (str(row["name"]), str(row["province"]))
        hi = float(row["heat_index_max_c"])
        nhi = row["nighttime_heat_index_c"]
        is_danger = hi > DANGER_THRESHOLD

        hist = pct_cache.get(key)
        if hist is not None and len(hist) > 0:
            # Fraction of historical daily values <= today's value -> percentile [0, 100]
            cnt = int(np.searchsorted(hist, hi, side="right"))
            percentile = round(cnt / len(hist) * 100, 1)
        else:
            percentile = None

        results.append(
            {
                "name": row["name"],
                "province": row["province"],
                "heat_index_max_c": round(hi, 1),
                "nighttime_heat_index_c": (
                    round(float(nhi), 1) if pd.notna(nhi) else None
                ),
                "is_danger": bool(is_danger),
                "percentile_rank": percentile,
            }
        )

    return results
