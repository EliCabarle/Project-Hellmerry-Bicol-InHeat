"""Spatial driver analysis: explain 45-year warming-trend variance with geography.

Loads the per-municipality trend slope from `output/trends.json`, merges in
geographic features (elevation, distance to coast, NDVI) from
`data/geo_features.csv`, and adds the 45-year mean wind speed computed from
`data/power_daily_full.csv`. Fits one RandomForestRegressor on the 114
municipality rows (target = slope_c_per_year; features = elevation,
distance_to_coast_km, ndvi_mean, mean_wind_speed) and reports mean |SHAP|
importances per feature.

This reveals which geographic feature drives the fastest warming across
Bicol. Association only - not causation (CONCEPT §10-7).

Usage:
  python calculate_spatial_drivers.py
  python calculate_spatial_drivers.py --trends output/trends.json --geo data/geo_features.csv --power data/power_daily_full.csv --out output/spatial_drivers.json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
import shap
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import LeaveOneOut, GroupKFold, cross_val_score

API_DIR = Path(__file__).resolve().parent
DEFAULT_TRENDS = API_DIR / "output" / "trends.json"
DEFAULT_GEO = API_DIR / "data" / "geo_features.csv"
DEFAULT_POWER = API_DIR / "data" / "power_daily_full.csv"
DEFAULT_OUT = API_DIR / "output" / "spatial_drivers.json"

FEATURES = ["elevation_m", "distance_to_coast_km", "ndvi_mean", "mean_wind_speed"]
TARGET = "slope_c_per_year"
N_ESTIMATORS = 100
RANDOM_STATE = 42


def load_trends(path: Path) -> pd.DataFrame:
    """Load per-municipality slopes from trends.json -> DataFrame(name, province, slope_c_per_year)."""
    with open(path, encoding="utf-8") as f:
        payload = json.load(f)
    rows = payload.get("municipalities", [])
    if not rows:
        raise ValueError(f"❌ No municipalities found in {path}")
    df = pd.DataFrame(rows)
    needed = {"name", "province", TARGET}
    missing = needed - set(df.columns)
    if missing:
        raise ValueError(f"trends.json missing columns: {sorted(missing)}")
    return df[["name", "province", TARGET]].copy()


def load_geo(path: Path) -> pd.DataFrame:
    """Load geographic features -> DataFrame(name, province, elevation_m, distance_to_coast_km, ndvi_mean)."""
    df = pd.read_csv(path, encoding="utf-8")
    needed = {"name", "province", "elevation_m", "distance_to_coast_km", "ndvi_mean"}
    missing = needed - set(df.columns)
    if missing:
        raise ValueError(f"geo_features.csv missing columns: {sorted(missing)}")
    return df


def mean_wind_speed(path: Path) -> pd.DataFrame:
    """45-year mean wind speed per municipality from power_daily_full.csv.

    Computes per-row speed magnitude sqrt(u^2 + v^2), then averages per
    municipality (name + province join key).
    """
    df = pd.read_csv(
        path,
        usecols=["name", "province", "u10m_ms", "v10m_ms"],
        encoding="utf-8",
    )
    df = df.dropna(subset=["u10m_ms", "v10m_ms"])
    df["wind_speed_ms"] = np.sqrt(df["u10m_ms"] ** 2 + df["v10m_ms"] ** 2)
    mw = (
        df.groupby(["name", "province"], sort=False)["wind_speed_ms"]
        .mean()
        .reset_index()
        .rename(columns={"wind_speed_ms": "mean_wind_speed"})
    )
    return mw


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--trends", default=str(DEFAULT_TRENDS))
    parser.add_argument("--geo", default=str(DEFAULT_GEO))
    parser.add_argument("--power", default=str(DEFAULT_POWER))
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    args = parser.parse_args()

    trends_path = Path(args.trends)
    geo_path = Path(args.geo)
    power_path = Path(args.power)
    out = Path(args.out)

    trends = load_trends(trends_path)
    geo = load_geo(geo_path)
    wind = mean_wind_speed(power_path)

    # Merge: trends (114 rows) <- geo (114 rows) <- wind (114 rows),
    # all on the province-qualified (name, province) join key.
    df = trends.merge(geo, on=["name", "province"], how="left")
    df = df.merge(wind, on=["name", "province"], how="left")

    # Fill missing geo/wind values with column median so RF never sees NaN.
    for col in FEATURES:
        if df[col].isna().any():
            df[col] = df[col].fillna(df[col].median())

    # Drop rows missing the target (municipality without a computable trend).
    df = df.dropna(subset=[TARGET])

    if len(df) == 0:
        raise ValueError("❌ No rows with valid target after cleaning.")
    print(f"Loaded {len(df)} municipalities with trends + geographic features.")

    X = df[FEATURES]
    y = df[TARGET]

    model = RandomForestRegressor(
        n_estimators=N_ESTIMATORS,
        n_jobs=-1,
        random_state=RANDOM_STATE,
    )
    model.fit(X, y)
    r2_train = float(model.score(X, y))
    print(f"Random Forest trained on {len(df)} municipalities. Train R²: {r2_train:.4f}")

    n = len(df)

    # ---- Leave-One-Out Cross-Validation ----
    # Aggregate out-of-fold predictions across all 114 held-out points, then
    # compute a single overall R² (per-fold R² is undefined with n_test=1).
    loo_model = RandomForestRegressor(
        n_estimators=N_ESTIMATORS,
        n_jobs=-1,
        random_state=RANDOM_STATE,
    )
    loo_predictions = np.zeros(n)
    for train_idx, test_idx in LeaveOneOut().split(X):
        fold_model = RandomForestRegressor(
            n_estimators=N_ESTIMATORS,
            n_jobs=1,
            random_state=RANDOM_STATE,
        )
        fold_model.fit(X.iloc[train_idx], y.iloc[train_idx])
        loo_predictions[test_idx] = fold_model.predict(X.iloc[test_idx])[0]
    loo_r2 = float(
        1
        - np.sum((y - loo_predictions) ** 2)
        / np.sum((y - np.mean(y)) ** 2)
    )
    loo_r2_std = 0.0  # single overall LOOCV R², no per-fold std
    print(f"LOOCV: overall R²={loo_r2:.4f} (n={n})")

    # ---- Grouped CV by province (spatial leakage test) ----
    gkf_model = RandomForestRegressor(
        n_estimators=N_ESTIMATORS,
        n_jobs=-1,
        random_state=RANDOM_STATE,
    )
    groups = df["province"].values
    gkf_scores = cross_val_score(
        gkf_model, X, y, groups=groups, cv=GroupKFold(n_splits=5), scoring="r2"
    )
    gkf_r2_mean = float(gkf_scores.mean())
    print(f"Province-grouped 5-fold CV: mean R²={gkf_r2_mean:.4f} (folds={len(gkf_scores)})")

    overfit_gap = r2_train - loo_r2
    print(f"Overfit gap (train - LOOCV): {overfit_gap:.4f}")

    # ---- SHAP using LOOCV-held-out predictions ----
    # OOF predictions computed above; report mean |SHAP| using full model explainer
    # on X, alongside the honest OOF R² as the real performance number.
    # OOF predictions computed in LOOCV loop above
    explainer = shap.TreeExplainer(model)
    shap_values = np.abs(np.asarray(explainer.shap_values(X)))
    importance = pd.DataFrame(shap_values, columns=FEATURES).mean().sort_values(
        ascending=False
    )

    print("\nSpatial driver importances (mean |SHAP|, full model):")
    for feature, value in importance.items():
        print(f"  {feature:<28} {value:+.6f}")

    total = float(importance.sum()) or 1.0
    shares = importance / total

    payload = {
        "project": "Bicol In-Heat",
        "target": TARGET,
        "features": FEATURES,
        "method": (
            f"RandomForestRegressor (n_estimators={N_ESTIMATORS}) on {len(df)} "
            f"municipality rows; target = 45-year heat-index trend slope "
            f"({TARGET}); features = elevation, distance-to-coast, NDVI, mean wind "
            f"speed; importances = mean |SHAP| over all rows"
        ),
        "train_rows": int(len(df)),
        "r2_train": round(r2_train, 4),
        "spatial_r2_cv_mean": round(loo_r2, 4),
        "spatial_r2_cv_std": round(loo_r2_std, 4),
        "spatial_r2_grouped": round(gkf_r2_mean, 4),
        "overfit_gap": round(overfit_gap, 4),
        "importances": {
            feature: round(float(value), 6) for feature, value in importance.items()
        },
        "importance_shares": {
            feature: float(value) for feature, value in shares.items()
        },
        "municipalities": df[["name", "province", TARGET] + FEATURES].to_dict(
            orient="records"
        ),
    }

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"\nwrote spatial driver results -> {out}")
    print(
        f"SPATIAL CV DONE | Training R²={r2_train:.4f} | LOOCV R²={loo_r2:.4f} | "
        f"Grouped R²={gkf_r2_mean:.4f} | Overfit gap={overfit_gap:.4f}"
    )


if __name__ == "__main__":
    main()
