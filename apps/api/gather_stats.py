import json

base = "C:/Users/Benjamin/ProjectHellMerry/NASA-ProjectHellMerry/apps/api/output/"

n = json.load(open(base + "narratives.json", encoding="utf-8"))
munis = n["municipalities"]
print(f"Total municipalities: {len(munis)}")

# Null check
null_counts = {}
for mun in munis:
    for k, v in mun.items():
        if v is None:
            null_counts[k] = null_counts.get(k, 0) + 1
    for k, v in mun.get("trend", {}).items():
        if v is None:
            null_counts["trend." + k] = null_counts.get("trend." + k, 0) + 1
print("Null field counts:")
for k, v in sorted(null_counts.items()):
    print(f"  {k}: {v}")

# Slope directions
slopes = [mun["trend"]["slope_c_per_year"] for mun in munis]
pos = sum(1 for s in slopes if s > 0)
neg = sum(1 for s in slopes if s < 0)
zero = sum(1 for s in slopes if s == 0)
print(f"Slopes: positive={pos}, negative={neg}, zero={zero}")
print(f"All significant (MK): {all(mun['trend']['is_significant'] for mun in munis)}")
print(f"All significant (FDR): {all(mun['trend'].get('significant_fdr') for mun in munis)}")
print(f"All have bootstrap CI: {all(mun['trend'].get('slope_ci_bootstrap_low') is not None for mun in munis)}")

# Sample
print("\nSample (Aroroy):")
print("  trend:", json.dumps(munis[0]["trend"], indent=4))
print("  top_drivers:", json.dumps(munis[0]["top_drivers"], indent=4))
print("  precip_corr:", munis[0].get("precip_heat_index_corr_2024"))

# Moran's I
mi = json.load(open(base + "morans_i.json", encoding="utf-8"))
print("\nMoran's I:", mi["global_morans_i"], "p=", mi["global_morans_i_p_value"])
print("Cluster counts:", mi["cluster_counts"])
print("HH clusters:", len(mi["hh_clusters"]))

# Backtest
bt = json.load(open(base + "backtest_results.json", encoding="utf-8"))
print("\nBacktest split_short:")
print("  RMSE:", bt["split_short"]["rmse_mean"])
print("  Direction accuracy:", bt["split_short"]["direction_accuracy_pct"], "%")
print("  2024 spike matched:", bt["split_short"]["spike_2024_matched"], "/114")

# CDO
cdo = json.load(open(base + "cdo_validation.json", encoding="utf-8"))
print("\nCDO validation:")
for k, v in cdo.items():
    print(f"  {k}: RMSE={v['rmse']}, Bias={v['bias']}, n={v['n']}")

# Residual diagnostics
rd = json.load(open(base + "residual_diagnostics.json", encoding="utf-8"))
print("\nResidual diagnostics:")
print("  Durbin-Watson:", rd["diagnostics"]["durbin_watson"]["statistic"])
print("  Breusch-Pagan p:", rd["diagnostics"]["breusch_pagan"]["p_value"])
print("  Shapiro-Wilk p:", rd["diagnostics"]["shapiro_wilk"]["p_value"])
print("  Test R2:", rd["model"]["r2_test"])

# Spatial drivers
sd = json.load(open(base + "spatial_drivers.json", encoding="utf-8"))
print("\nSpatial drivers:")
print("  LOOCV R2:", sd["spatial_r2_cv_mean"])
print("  Grouped CV R2:", sd["spatial_r2_grouped"])
print("  Importances:", sd["importances"])

# Drivers
d = json.load(open(base + "drivers.json", encoding="utf-8"))
print("\nDrivers model:")
print("  R2 CV mean:", d["model"]["r2_cv_mean"])
print("  R2 train:", d["model"]["r2_train"])
