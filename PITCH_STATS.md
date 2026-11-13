# Pitch Stats — Bicol In-Heat (NASA Space Apps 2026)

All numbers below are verified against `apps/api/output/` and `apps/api/VALIDATION.md`.
No number in this file is an estimate; every value is computed by the pipeline.

---

## 1. No Nulls Confirmation

- **114/114 municipalities** have complete trend outputs (slope, CI, p-value, change point, bootstrap CI, FDR q-value).
- **Zero null fields** across all municipality records in `output/narratives.json` (checked every key in every record).
- **114/114 GeoJSON municipalities** covered — completeness tripwire passes (`generate_static_json.py` exits 1 if any are missing).
- All 114 municipalities have top-3 SHAP drivers stored in `output/drivers.json`.
- All 114 municipalities have LISA cluster assignment in `output/morans_i.json`.

---

## 2. CDO Validation — Scientifically Honest Framing

**Validated against 2 primary NOAA CDO stations:**

| Station | ID | Province | RMSE (°C) | Bias (°C) | n (days) |
|---|---|---|---|---|---|
| Legazpi | GHCND:RP000098444 | Albay | 4.0127 | -3.3184 | 197 |
| Virac | GHCND:RPM00098446 | Catanduanes | 3.7383 | -3.2445 | 260 |

**Naga (Camarines Sur) — cross-referenced, not primary:**

No direct Naga station exists in the GHCND dataset. Naga was cross-referenced using the nearest available station (Legazpi, 0.69° / ~76 km away).
- RMSE = 3.8676°C, Bias = -3.0351°C (2024, n=197)
- **Caveat:** station-to-city distance is large; treat as indicative, not definitive.

Source: `apps/api/output/cdo_validation.json`, `apps/api/VALIDATION.md` §2b.

---

## 3. Moran's I — Spatial Clustering Proof

- **Global Moran's I = 0.6392** (p = 0.0000, 999 permutations)
- Strong positive spatial autocorrelation: warming clusters geographically.
- **LISA cluster counts:** HH=56, LL=38, HL=12, LH=7, NS=1
- **56 High-High (HH) clusters** — municipalities where high warming is surrounded by high-warming neighbors.
- Source: `apps/api/output/morans_i.json`

---

## 4. "0 Opposite Trends" — Null Finding

- **All 114 municipalities show positive warming slopes** (positive=114, negative=0, zero=0).
- **0 opposite-direction neighbor pairs** out of 235 neighboring pairs checked.
- This is a **null finding**: the challenge's premise ("a variable can trend one way in one region and the opposite way in another") is not borne out in Bicol — warming is regionally uniform.
- Source: `apps/api/output/opposite_trends.json`, `output/trends.json`

---

## 5. Three Most Important Numbers for the Video

| # | Number | What it means | Source |
|---|---|---|---|
| 1 | **All 114 municipalities significantly warming** | Every municipality in Region V shows a statistically significant warming trend (Hamed-Rao MK, p < 0.05, FDR-corrected). | `output/trends.json` |
| 2 | **Backtest RMSE = 0.8614°C, direction accuracy = 96.49%** | The Random Forest driver model predicts annual heat index with sub-degree error on 2020–2025 hold-out data, getting the direction of change right 96% of the time. | `output/backtest_results.json` |
| 3 | **Moran's I = 0.6392 (p < 0.001)** | Warming is not random — it clusters spatially. 56 municipalities form High-High clusters where neighbors warm together. | `output/morans_i.json` |

**Supporting numbers:**
- CDO validation RMSE: 3.7–4.0°C vs. independent NOAA stations (POWER systematically underestimates vs. ground truth)
- Precipitation-heat correlation: r = -0.3840 (drier → hotter), n = 114 municipalities
- Residual Durbin-Watson: 1.9963 (no autocorrelation in model residuals)
- Spatial LOOCV R² = 0.9283 (spatial model generalizes well leave-one-out)
- Spatial Grouped CV R² = -0.5568 (model does NOT generalize across provinces — honest limitation)

---

## 🌊 El Niño / Global Context (NEW)

- **The Correlation:** We linked local Bicol heat to the NOAA Oceanic Niño Index (ONI) using 45 years of annual data (1981-2025).
- **Mean Heat Result:** Pearson r = 0.1288 (p = 0.3990). ONI does NOT significantly correlate with annual mean heat index — El Niño does not simply make Bicol hotter on average.
- **Volatility Result:** Pearson r = 0.4955 (p = 0.0005). ONI significantly correlates with annual heat-index volatility — **during El Niño years, Bicol's climate becomes much more unstable and unpredictable**.
- **Interpretation:** El Niño events act as an accelerator for Bicol's heat *volatility*, not just mean temperature. This is the "Volatility Engine" finding: climate instability grows faster than average warming.
- Source: `apps/api/output/enso_results.json`, `apps/api/data/oni_annual.csv` (NOAA CPC)

---

## 6. Data Sources

| Variable | Source | Product ID |
|---|---|---|
| Heat index (derived) | NASA POWER | T2M_MAX, T2M_MIN, T2MDEW |
| Wind components | NASA POWER | U10M, V10M |
| Elevation, distance to coast, NDVI | SRTM / MODIS | geoFeatures |
| Precipitation | NASA POWER | PRECTOTCORR |
| Ground truth | NOAA CDO | GHCND stations |
| El Niño / ONI | NOAA CPC | Oceanic Niño Index |
| Boundaries | geoBoundaries adm3 | CC BY 4.0 |

**Pipeline scripts:** `calculate_trends.py`, `calculate_drivers.py`, `calculate_spatial_drivers.py`, `bootstrap_ci.py`, `fdr_correction.py`, `backtest_model.py`, `fetch_cdo_validation.py`, `fetch_new_variable.py`, `fetch_enso_data.py`, `enso_correlation.py`, `residual_diagnostics.py`, `morans_i.py`, `volatility_analysis.py`, `volatility_attribution.py`, `advanced_ml_benchmark.py`, `generate_static_json.py`
