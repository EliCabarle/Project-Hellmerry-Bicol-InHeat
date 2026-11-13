"""Residual diagnostics for the Random Forest heat-index driver model.

Trains a RandomForestRegressor on heat_index_max_c using 7 features
(u10m, v10m, lat, lon, elevation_m, distance_to_coast_km, ndvi_mean),
holds out 20% for testing, then runs statistical diagnostics on the residuals:

- Durbin-Watson (autocorrelation in residuals)
- Breusch-Pagan (heteroscedasticity)
- Shapiro-Wilk (normality of residuals)

Outputs output/residual_diagnostics.json with test statistics and p-values.

Usage:
  python residual_diagnostics.py
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import shapiro
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from statsmodels.stats.diagnostic import het_breuschpagan
from statsmodels.stats.stattools import durbin_watson

API_DIR = Path(__file__).resolve().parent
POWER_CSV = API_DIR / "data" / "power_daily_full.csv"
GEO_CSV = API_DIR / "data" / "geo_features.csv"
OUT_JSON = API_DIR / "output" / "residual_diagnostics.json"

FEATURES = [
    "u10m_ms",
    "v10m_ms",
    "lat",
    "lon",
    "elevation_m",
    "distance_to_coast_km",
    "ndvi_mean",
]
TARGET = "heat_index_max_c"
TEST_SIZE = 0.2
RANDOM_STATE = 42
N_ESTIMATORS = 100


def main() -> None:
    print("Loading POWER daily data...")
    df = pd.read_csv(POWER_CSV, low_memory=False)
    df = df.dropna(subset=[TARGET] + ["u10m_ms", "v10m_ms", "lat", "lon", "name", "province"])
    print(f"  {len(df):,} daily rows after cleaning")

    print("Merging geographic features...")
    geo = pd.read_csv(GEO_CSV, encoding="utf-8")
    df = df.merge(geo, on=["name", "province"], how="left")
    for col in ["elevation_m", "distance_to_coast_km", "ndvi_mean"]:
        df[col] = df[col].fillna(df[col].median())

    df = df.dropna(subset=[TARGET] + FEATURES)
    print(f"  {len(df):,} rows with complete features")

    X = df[FEATURES]
    y = df[TARGET]

    # Time-based split: train on earlier 80%, test on later 20%.
    # No shuffle - shuffling time series leaks future information into training.
    n = len(X)
    split_idx = int(n * (1 - TEST_SIZE))
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    print(f"Train: {len(X_train):,} rows | Test: {len(X_test):,} rows (time-based split, no shuffle)")

    model = RandomForestRegressor(
        n_estimators=N_ESTIMATORS, random_state=RANDOM_STATE, n_jobs=-1
    )
    model.fit(X_train, y_train)
    r2_train = float(model.score(X_train, y_train))
    r2_test = float(model.score(X_test, y_test))
    print(f"RF train R² = {r2_train:.4f} | test R² = {r2_test:.4f}")

    y_pred = model.predict(X_test)
    residuals = y_test.to_numpy(dtype=float) - y_pred

    # Durbin-Watson: autocorrelation in residuals (2.0 = no autocorrelation)
    dw = float(durbin_watson(residuals))

    # Breusch-Pagan: heteroscedasticity (null = homoscedastic).
    # Requires exog with a constant column.
    X_test_const = np.column_stack([np.ones(len(X_test)), X_test.to_numpy(dtype=float)])
    bp_lm, bp_pvalue, bp_fvalue, bp_f_pvalue = het_breuschpagan(
        residuals, X_test_const
    )

    # Shapiro-Wilk: normality of residuals (null = normally distributed)
    # scipy shapiro is limited to n <= 5000; subsample if needed
    sw_sample = residuals if len(residuals) <= 5000 else np.random.default_rng(RANDOM_STATE).choice(residuals, 5000, replace=False)
    sw_stat, sw_pvalue = shapiro(sw_sample)

    payload = {
        "project": "Bicol In-Heat",
        "model": {
            "features": FEATURES,
            "target": TARGET,
            "n_train": int(len(X_train)),
            "n_test": int(len(X_test)),
            "r2_train": round(r2_train, 4),
            "r2_test": round(r2_test, 4),
        },
        "residuals": {
            "n": int(len(residuals)),
            "mean": round(float(np.mean(residuals)), 6),
            "std": round(float(np.std(residuals)), 6),
        },
        "diagnostics": {
            "durbin_watson": {
                "statistic": round(dw, 4),
                "interpretation": (
                    "no autocorrelation" if 1.5 <= dw <= 2.5 else
                    ("positive autocorrelation" if dw < 1.5 else "negative autocorrelation")
                ),
            },
            "breusch_pagan": {
                "lm_statistic": round(float(bp_lm), 4),
                "p_value": round(float(bp_pvalue), 6),
                "f_statistic": round(float(bp_fvalue), 4),
                "f_p_value": round(float(bp_f_pvalue), 6),
                "interpretation": (
                    "homoscedastic (fail to reject null)"
                    if bp_pvalue >= 0.05 else
                    "heteroscedastic (reject null)"
                ),
            },
            "shapiro_wilk": {
                "statistic": round(float(sw_stat), 6),
                "p_value": round(float(sw_pvalue), 6),
                "n_tested": int(len(sw_sample)),
                "interpretation": (
                    "normally distributed (fail to reject null)"
                    if sw_pvalue >= 0.05 else
                    "not normally distributed (reject null)"
                ),
            },
        },
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nWrote {OUT_JSON}")
    print(json.dumps(payload["diagnostics"], indent=2))


if __name__ == "__main__":
    main()
