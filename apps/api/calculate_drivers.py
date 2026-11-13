"""Random-Forest + SHAP driver ranking per municipality (CONCEPT §6c-3).

Reads the daily CSV from `fetch_power_data.py`, fits ONE RandomForestRegressor on
all municipalities and the full 45-year record (~1.9M rows), then ranks features
per municipality by mean |SHAP|. The model is scored by 5-fold time-series
cross-validation (TimeSeriesSplit on date-sorted rows), so the reported R² is
out-of-sample and averaged over five held-out periods, not just how well 50 trees
memorised the rows they were fitted on.

Why one global model: `lat`/`lon` are constant inside a municipality, so a
per-municipality model would see zero variance in its two geographic features and
could never rank them. A single model learns the regional relationship and SHAP
then attributes each municipality's predictions separately.

This is **association, not causation** (CONCEPT §10-7). U10M/V10M are wind and
lat/lon stand in for position/terrain until elevation and LST join the feature
set. Temperature and humidity - the physical drivers of heat index - are NOT
features here, so the model explains only part of the variance; `r2_cv_mean` is
reported for exactly that reason and must not be presented as forecast accuracy.

Usage:
  python calculate_drivers.py
  python calculate_drivers.py --csv data/power_daily_full.csv --out output/drivers.json
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import shap
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import TimeSeriesSplit, cross_val_score

API_DIR = Path(__file__).resolve().parent
IN_CSV = API_DIR / "data" / "power_daily_full.csv"
GEO_CSV = API_DIR / "data" / "geo_features.csv"
OUT_JSON = API_DIR / "output" / "drivers.json"

FEATURES = [
    "u10m_ms",
    "v10m_ms",
    "lat",
    "lon",
    "elevation_m",
    "distance_to_coast_km",
    "ndvi_mean",
]
LABELS = {
    "u10m_ms": "Wind (east-west, U10M)",
    "v10m_ms": "Wind (north-south, V10M)",
    "lat": "Latitude",
    "lon": "Longitude",
    "elevation_m": "Elevation (m)",
    "distance_to_coast_km": "Distance to coast (km)",
    "ndvi_mean": "Mean NDVI (vegetation)",
}
TARGET = "heat_index_max_c"
TOP_N = 3
# SHAP over the full training window would need gigabytes; a random sample of the
# training rows is enough for a mean |SHAP| per municipality (~88 rows each of 114).
SHAP_SAMPLE_ROWS = 10_000
N_ESTIMATORS = 50
CV_FOLDS = 5


def build(frame: pd.DataFrame, window: dict | None = None) -> dict:
    missing = set(FEATURES + [TARGET, "name", "province"]) - set(frame.columns)
    if missing:
        raise ValueError(f"CSV is missing columns: {sorted(missing)}")

    frame = frame.dropna(subset=FEATURES + [TARGET])
    # TimeSeriesSplit slices by row order, so order by date or the folds become
    # per-municipality blocks instead of time periods.
    frame = frame.sort_values("date", kind="stable")
    X = frame[FEATURES]
    y = frame[TARGET]

    model = RandomForestRegressor(
        n_estimators=N_ESTIMATORS,
        min_samples_leaf=20,
        n_jobs=-1,
        random_state=42,
    )
    cv = TimeSeriesSplit(n_splits=CV_FOLDS)
    print(f"Cross-validating on {len(frame)} rows ({CV_FOLDS} time-ordered folds)...")
    scores = cross_val_score(model, X, y, cv=cv, scoring="r2")
    for fold, score in enumerate(scores, start=1):
        print(f"  fold {fold} R²: {score:.4f}")
    r2_cv_mean = float(scores.mean())
    r2_cv_std = float(scores.std())
    print(f"CV R²: {r2_cv_mean:.4f} ± {r2_cv_std:.4f}")
    cv_test_rows = sum(len(test) for _, test in cv.split(X))

    print(f"Training final model on all {len(frame)} rows for SHAP...")
    model.fit(X, y)
    r2_train = float(model.score(X, y))

    sample = frame.sample(
        n=min(len(frame), SHAP_SAMPLE_ROWS),
        random_state=42,
    )
    print("Calculating SHAP...")
    shap_values = np.abs(np.asarray(shap.TreeExplainer(model).shap_values(sample[FEATURES])))

    attribution = pd.DataFrame(shap_values, columns=FEATURES, index=sample.index)
    attribution["name"] = sample["name"]
    attribution["province"] = sample["province"]
    per_municipality = attribution.groupby(["name", "province"], sort=False)[
        FEATURES
    ].mean()

    municipalities = []
    for (name, province), importance in per_municipality.iterrows():
        total = float(importance.sum()) or 1.0
        ranked = importance.sort_values(ascending=False).head(TOP_N)
        municipalities.append(
            {
                "name": name,
                "province": province,
                "top_drivers": [
                    {
                        "feature": feature,
                        "label": LABELS[feature],
                        "mean_abs_shap": round(float(value), 4),
                        "share": round(float(value) / total, 3),
                    }
                    for feature, value in ranked.items()
                ],
            }
        )

    municipalities.sort(key=lambda row: (row["name"], row["province"]))

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "project": "Bicol In-Heat",
        "target": TARGET,
        "features": LABELS,
        "method": (
            f"RandomForestRegressor (n_estimators={N_ESTIMATORS}) fitted on all "
            f"{len(frame)} rows of all municipalities; R2 = mean ± sd over "
            f"{CV_FOLDS} time-ordered TimeSeriesSplit folds "
            f"({cv_test_rows} held-out rows in total); mean |SHAP| from "
            f"shap.TreeExplainer over {len(sample)} sampled rows, ranked per "
            f"municipality"
        ),
        "model": {
            "train_rows": int(len(frame)),
            # union of the CV test folds; r2_test mirrors r2_cv_mean so existing
            # readers keep a single out-of-sample number
            "test_rows": int(cv_test_rows),
            "window": window,
            "shap_rows": int(len(sample)),
            "r2_train": round(r2_train, 4),
            "r2_test": round(r2_cv_mean, 4),
            "r2_cv_mean": round(r2_cv_mean, 4),
            "r2_cv_std": round(r2_cv_std, 4),
        },
        "disclaimer": (
            "Driver importance is association, not causation. Wind components and "
            "lat/lon are proxies - terrain and LST are not in the model yet. "
            "r2_cv_mean is the out-of-sample R2 averaged over 5 time-ordered folds: "
            "it measures how much of the heat index these four features explain, "
            "not forecast accuracy."
        ),
        "municipalities": municipalities,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", default=str(IN_CSV))
    parser.add_argument("--out", default=str(OUT_JSON))
    args = parser.parse_args()

    print("Loading CSV...")
    # The power CSV does not yet contain the geographic features, so read only
    # its own columns here; geo features are merged in below.
    power_cols = ["name", "province", "date", "u10m_ms", "v10m_ms", "lat", "lon", TARGET]
    frame = pd.read_csv(
        args.csv,
        usecols=power_cols,
    )
    print(f"  {len(frame)} rows")
    frame["date"] = pd.to_datetime(frame["date"], errors="coerce")

    # Merge geographic driver features (elevation, distance to coast, NDVI).
    # Left join keeps every daily power row; missing geo values are filled with
    # the column median so the Random Forest never sees NaN.
    geo = pd.read_csv(GEO_CSV)
    frame = frame.merge(geo, on=["name", "province"], how="left")
    for col in ["elevation_m", "distance_to_coast_km", "ndvi_mean"]:
        frame[col] = frame[col].fillna(frame[col].median())

    start = frame["date"].min()
    end = frame["date"].max()
    print(f"Full record: {start.date()} .. {end.date()} ({len(frame)} rows)")

    payload = build(
        frame,
        {
            "start": str(start.date()),
            "end": str(end.date()),
        },
    )

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(
        f"model: r2_train={payload['model']['r2_train']} "
        f"r2_cv_mean={payload['model']['r2_cv_mean']} "
        f"r2_cv_std={payload['model']['r2_cv_std']} "
        f"on {payload['model']['train_rows']} rows"
    )
    for row in payload["municipalities"][:5]:
        drivers = ", ".join(d["label"] for d in row["top_drivers"])
        print(f"  {row['name']} ({row['province']}): {drivers}")
    print(f"wrote {len(payload['municipalities'])} municipalities -> {out}")


if __name__ == "__main__":
    main()
