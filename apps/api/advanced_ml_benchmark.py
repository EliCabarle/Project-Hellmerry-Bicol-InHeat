"""Advanced ML Benchmark: daily heat-index prediction with lag/rolling features.

Compares three models for out-of-sample daily heat-index (heat_index_max_c)
prediction using TimeSeriesSplit to avoid leakage:

1. Ridge Regression (baseline, with StandardScaler)
2. Random Forest (n_estimators=100)
3. XGBoost (n_estimators=100)

Feature engineering:
- lag1_heat: previous day's heat_index_max_c (per municipality)
- lag3_heat: heat index from 3 days ago (per municipality)
- rolling3_mean: 3-day rolling mean of heat index (per municipality)
- month: month number (seasonality)
- Plus geography/wind features from geo_features.csv + POWER wind components.

Output: output/ml_benchmark_results.json

Usage:
  python advanced_ml_benchmark.py
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import TimeSeriesSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score, mean_squared_error

API_DIR = Path(__file__).resolve().parent
POWER_CSV = API_DIR / "data" / "power_daily_full.csv"
GEO_CSV = API_DIR / "data" / "geo_features.csv"
OUT_JSON = API_DIR / "output" / "ml_benchmark_results.json"

TARGET = "heat_index_max_c"
FEATURES = [
    "u10m_ms",
    "v10m_ms",
    "lat",
    "lon",
    "elevation_m",
    "distance_to_coast_km",
    "ndvi_mean",
    "lag1_heat",
    "lag3_heat",
    "rolling3_mean",
    "month",
]
N_SPLITS = 5
N_ESTIMATORS = 100
RANDOM_STATE = 42


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add lag, rolling, and seasonality features per municipality."""
    df = df.sort_values(["name", "province", "date"], kind="stable").copy()

    # Lag features: previous day's heat (grouped by municipality)
    df["lag1_heat"] = (
        df.groupby(["name", "province"])[TARGET].shift(1)
    )
    df["lag3_heat"] = (
        df.groupby(["name", "province"])[TARGET].shift(3)
    )

    # 3-day rolling mean of heat index (grouped by municipality)
    df["rolling3_mean"] = (
        df.groupby(["name", "province"])[TARGET]
        .transform(lambda s: s.rolling(window=3, min_periods=1).mean())
    )

    # Month for seasonality
    df["month"] = df["date"].dt.month

    # Merge geographic features
    geo = pd.read_csv(GEO_CSV, encoding="utf-8")
    df = df.merge(geo, on=["name", "province"], how="left")
    for col in ["elevation_m", "distance_to_coast_km", "ndvi_mean"]:
        df[col] = df[col].fillna(df[col].median())

    return df


def evaluate_model(model, model_name: str, X: pd.DataFrame, y: pd.Series, tscv: TimeSeriesSplit):
    """Run TimeSeriesSplit CV; return mean R², mean RMSE, per-fold lists."""
    fold_r2 = []
    fold_rmse = []
    for fold, (train_idx, test_idx) in enumerate(tscv.split(X), start=1):
        X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
        y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        fold_r2.append(r2_score(y_test, y_pred))
        fold_rmse.append(float(np.sqrt(mean_squared_error(y_test, y_pred))))
        print(f"    {model_name} fold {fold}/{N_SPLITS}: R²={fold_r2[-1]:.4f} RMSE={fold_rmse[-1]:.4f}")
    return {
        "mean_r2": float(np.mean(fold_r2)),
        "mean_rmse": float(np.mean(fold_rmse)),
        "fold_r2": [round(v, 6) for v in fold_r2],
        "fold_rmse": [round(v, 6) for v in fold_rmse],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Advanced ML Benchmark for daily heat-index prediction")
    parser.add_argument("--max-munis", type=int, default=None,
                        help="Limit to N municipalities (for faster runs)")
    args = parser.parse_args()

    print("Loading POWER daily data...")
    df = pd.read_csv(POWER_CSV, low_memory=False)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=[TARGET, "date", "name", "province"])
    print(f"  {len(df):,} daily rows, {df['name'].nunique()} municipalities")

    if args.max_munis is not None:
        munis = sorted(df.groupby(["name", "province"]).groups.keys())[:args.max_munis]
        muni_set = set(munis)
        df = df[df.apply(lambda r: (r["name"], r["province"]) in muni_set, axis=1)]
        print(f"  Subset to {args.max_munis} municipalities: {len(df):,} rows")

    print("Building features...")
    df = build_features(df)
    print(f"  Features: {FEATURES}")

    # Drop rows with NaN (from lag/rolling at series start)
    df = df.dropna(subset=FEATURES + [TARGET])

    # Ensure all feature columns are numeric (XGBoost requires this)
    for col in FEATURES:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df.dropna(subset=FEATURES + [TARGET])

    print(f"  {len(df):,} rows after feature engineering + NaN drop")

    X = df[FEATURES]
    y = df[TARGET]

    # TimeSeriesSplit on date-sorted rows
    tscv = TimeSeriesSplit(n_splits=N_SPLITS)

    models = {
        "ridge": Pipeline([
            ("scaler", StandardScaler()),
            ("ridge", Ridge(random_state=RANDOM_STATE)),
        ]),
        "random_forest": RandomForestRegressor(
            n_estimators=N_ESTIMATORS, random_state=RANDOM_STATE, n_jobs=-1
        ),
    }

    # Try XGBoost
    try:
        from xgboost import XGBRegressor
        models["xgboost"] = XGBRegressor(
            n_estimators=N_ESTIMATORS,
            random_state=RANDOM_STATE,
            n_jobs=-1,
            verbosity=0,
        )
        print("  XGBoost available")
    except ImportError:
        print("  XGBoost not available - skipping")

    results = {}
    for name, model in models.items():
        print(f"\nTraining {name} ({N_SPLITS}-fold TimeSeriesSplit)...")
        res = evaluate_model(model, name, X, y, tscv)
        results[name] = res
        print(f"  Mean R² = {res['mean_r2']:.4f} | Mean RMSE = {res['mean_rmse']:.4f}")

    # Rank by mean R² (descending)
    ranking = sorted(results.items(), key=lambda kv: kv[1]["mean_r2"], reverse=True)
    winner_name, winner_res = ranking[0]

    print(f"\nBENCHMARK DONE | " + ", ".join(
        (f"{i+1}st" if i == 0 else f"{i+1}nd" if i == 1 else f"{i+1}rd" if i == 2 else f"{i+1}th")
        + f": {name} (R²={res['mean_r2']:.4f})"
        for i, (name, res) in enumerate(ranking)
    ))

    payload = {
        "project": "Bicol In-Heat",
        "module": "advanced_ml_benchmark",
        "target": TARGET,
        "features": FEATURES,
        "n_samples": int(len(X)),
        "n_features": int(len(FEATURES)),
        "cv": {"method": "TimeSeriesSplit", "n_splits": N_SPLITS},
        "models": results,
        "winner": {
            "model": winner_name,
            "mean_r2": winner_res["mean_r2"],
            "mean_rmse": winner_res["mean_rmse"],
        },
        "ranking": [
            {"rank": i + 1, "model": name, "mean_r2": res["mean_r2"], "mean_rmse": res["mean_rmse"]}
            for i, (name, res) in enumerate(ranking)
        ],
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nWrote {OUT_JSON}")


if __name__ == "__main__":
    main()
