# Validation Strategy

## Ground Truth Status
Direct PAGASA station validation is pending an FOI request submitted 2026-11-13. Awaiting response.

## Internal Validation
1. **Backtest (1981-2019 → 2020-2025):** RMSE = 0.8614°C, direction accuracy = 96.49%, 2024 El Niño spike captured within 1°C in 13/114 municipalities.
2. **Event match:** Model correctly identifies the May 2024 peak in Naga (43.6°C), consistent with regional news reports of the El Niño event.
3. **Physical consistency:** Heat index computed using standard Rothfusz formula with dewpoint-derived RH (avoids +3°C inflation from mean-humidity proxies).

## Statistical Rigor
1. **Hamed-Rao Modified Mann-Kendall** corrects for autocorrelation in p-values.
2. **Block-bootstrap 95% CI** corrects for autocorrelation in slope intervals (uncorrected Theil-Sen CI would be too narrow). 110/114 municipalities remain bootstrap-significant; 4 lost significance (Del Gallego, Labo, Ragay, Santa Elena).
3. **Benjamini-Hochberg FDR** correction at α=0.05 for multiple comparisons (114/114 remain significant pre-bootstrap).
4. **Time Series Cross-Validation** (5-fold, chronological) on Random Forest models — no random splits.
5. **Spatial model cross-validation:** Training R²=0.9904, LOOCV R²=0.9283, province-grouped CV R²=-0.5568 (severe spatial leakage — model does not generalize across held-out provinces).

## Known Limitations
1. POWER reanalysis (0.5° grid, ~55km) smooths urban heat islands — municipal means are conservative.
2. Linear 2050 projection is a trend extension, not a GCM climate scenario. CMIP6 (NASA/NEX-GDDP-CMIP6) was attempted but the asset is not accessible from this project; projection stands as trend extension only.
3. Wind SHAP is association, not causation — wind is a proxy for monsoon/ENSO state (not measured).
4. All 114 trends significant with very small p-values (min 4.59e-11) — bootstrap CI is the appropriate corrective (110/114 survive).
5. No external region validation.
6. Spatial model shows severe overfit across province boundaries (grouped CV R² = -0.5568) — geographic driver ranking should be treated as exploratory.

## Reproducibility
All scripts run from `apps/api/` with `requirements.txt`. Random state = 42 throughout.
