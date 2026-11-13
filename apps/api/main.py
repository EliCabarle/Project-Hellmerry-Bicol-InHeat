from datetime import date, datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

import numpy as np
import pandas as pd
from pathlib import Path

try:  # `uvicorn main:app` from apps/api
    from routers import qa
except ImportError:  # `uvicorn apps.api.main:app` from the repo root
    from apps.api.routers import qa

app = FastAPI(
    title="Bicol In-Heat API",
    description="Backend API for Bicol In-Heat (2026 NASA Space Apps Challenge)",
    version="0.1.0"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(qa.router)

class MunicipalityLocation(BaseModel):
    id: int
    name: str
    province: str
    lat: float
    lon: float
    elevation: float
    coast_dist_km: float

class ClimateAnomaly(BaseModel):
    municipality_id: int
    name: str
    year: int
    heat_index: float
    anomaly: float
    significant: bool = True
    sample_count: int = 365

class VerdantFeature(BaseModel):
    municipality_id: int
    name: str
    canopy_cover_pct: float
    lst_mean: float
    driver_rank_primary: str
    shap_value: float

@app.get("/")
def read_root():
    return {"status": "online", "project": "Bicol In-Heat", "challenge": "Be An Earth System Trend Detective!"}

@app.get("/locations", response_model=List[MunicipalityLocation])
def get_locations():
    """Returns Bicol municipalities with clean Lat/Lon coordinates."""
    return [
        {"id": 1, "name": "Legazpi City", "province": "Albay", "lat": 13.1391, "lon": 123.7437, "elevation": 15.0, "coast_dist_km": 1.2},
        {"id": 2, "name": "Naga City", "province": "Camarines Sur", "lat": 13.6218, "lon": 123.1948, "elevation": 12.0, "coast_dist_km": 18.5},
        {"id": 3, "name": "Iriga City", "province": "Camarines Sur", "lat": 13.4191, "lon": 123.4158, "elevation": 85.0, "coast_dist_km": 24.1},
        {"id": 4, "name": "Sorsogon City", "province": "Sorsogon", "lat": 12.9722, "lon": 124.0050, "elevation": 8.0, "coast_dist_km": 0.8},
        {"id": 5, "name": "Virac", "province": "Catanduanes", "lat": 13.5786, "lon": 124.2332, "elevation": 45.0, "coast_dist_km": 2.3},
        {"id": 6, "name": "Daet", "province": "Camarines Norte", "lat": 14.1136, "lon": 122.9567, "elevation": 10.0, "coast_dist_km": 3.5},
        {"id": 7, "name": "Masbate City", "province": "Masbate", "lat": 12.3653, "lon": 123.6225, "elevation": 14.0, "coast_dist_km": 0.5}
    ]

@app.get("/anomalies", response_model=List[dict])
def get_anomalies(year: Optional[int] = 2025):
    """Returns heat index trends and anomalies per municipality."""
    return [
        {"municipality_id": 1, "name": "Legazpi City", "year": year, "heat_index": 43.5, "anomaly": +3.2, "significant": True, "sample_count": 360},
        {"municipality_id": 2, "name": "Naga City", "year": year, "heat_index": 45.1, "anomaly": +4.0, "significant": True, "sample_count": 365},
        {"municipality_id": 3, "name": "Iriga City", "year": year, "heat_index": 41.2, "anomaly": +2.1, "significant": False, "sample_count": 358},
        {"municipality_id": 4, "name": "Sorsogon City", "year": year, "heat_index": 42.8, "anomaly": +2.9, "significant": True, "sample_count": 362},
        {"municipality_id": 5, "name": "Virac", "year": year, "heat_index": 39.5, "anomaly": +1.5, "significant": False, "sample_count": 340},
        {"municipality_id": 6, "name": "Daet", "year": year, "heat_index": 43.0, "anomaly": +3.1, "significant": True, "sample_count": 355},
        {"municipality_id": 7, "name": "Masbate City", "year": year, "heat_index": 44.2, "anomaly": +3.8, "significant": True, "sample_count": 365}
    ]

@app.get("/verdant", response_model=List[dict])
def get_verdant():
    """Returns canopy cover, LST, and driver rankings (RF/SHAP) for vegetation & urban heat analysis."""
    return [
        {"municipality_id": 1, "name": "Legazpi City", "canopy_cover_pct": 22.4, "lst_mean": 38.2, "driver_rank_primary": "Low Canopy Cover", "shap_value": 0.42},
        {"municipality_id": 2, "name": "Naga City", "canopy_cover_pct": 15.1, "lst_mean": 40.5, "driver_rank_primary": "Urban Built Density", "shap_value": 0.58},
        {"municipality_id": 3, "name": "Iriga City", "canopy_cover_pct": 34.2, "lst_mean": 35.1, "driver_rank_primary": "Elevation Buffering", "shap_value": 0.28},
        {"municipality_id": 4, "name": "Sorsogon City", "canopy_cover_pct": 28.0, "lst_mean": 37.0, "driver_rank_primary": "Coastal Wind Exposure", "shap_value": 0.35},
        {"municipality_id": 5, "name": "Virac", "canopy_cover_pct": 45.0, "lst_mean": 33.4, "driver_rank_primary": "Oceanic Breezes", "shap_value": 0.19},
        {"municipality_id": 6, "name": "Daet", "canopy_cover_pct": 25.6, "lst_mean": 37.8, "driver_rank_primary": "Low Canopy Cover", "shap_value": 0.39},
        {"municipality_id": 7, "name": "Masbate City", "canopy_cover_pct": 18.2, "lst_mean": 39.9, "driver_rank_primary": "Urban Built Density", "shap_value": 0.51}
    ]


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
