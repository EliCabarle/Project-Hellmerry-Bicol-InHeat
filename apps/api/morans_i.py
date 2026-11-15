"""Global and Local Moran's I spatial autocorrelation on heat-index trends.

Loads per-municipality trend slopes from output/trends.json and municipality
polygons from apps/web/public/data/bicol-municipalities.geojson, builds a Queen
contiguity spatial weight matrix, and computes:

- Global Moran's I (with 999 permutations for pseudo p-value)
- Local Moran's I (LISA) per municipality: cluster type HH, LL, HL, LH, or NS

Outputs output/morans_i.json.

Usage:
  python morans_i.py
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

API_DIR = Path(__file__).resolve().parent
TRENDS_JSON = API_DIR / "output" / "trends.json"
# narratives.json holds the DB-synced slopes the app actually displays. output/
# is gitignored and trends.json goes stale, which silently shifts Moran's I.
NARRATIVES_JSON = API_DIR.parent / "web" / "public" / "data" / "narratives.json"
GEOJSON_PATH = (
    API_DIR.parent / "web" / "public" / "data" / "bicol-municipalities.geojson"
)
OUT_JSON = API_DIR / "output" / "morans_i.json"
# Committed copy: output/ is gitignored, so a deploy reads this one instead.
SNAPSHOT_JSON = API_DIR / "snapshots" / "morans_i.json"

N_PERMUTATIONS = 999
RANDOM_SEED = 42


def load_trends() -> pd.DataFrame:
    """(name, province) -> slope_c_per_year, preferring the committed bank."""
    if NARRATIVES_JSON.exists():
        with open(NARRATIVES_JSON, encoding="utf-8") as f:
            payload = json.load(f)
        rows = [
            {
                "name": row.get("name"),
                "province": row.get("province"),
                "slope_c_per_year": (row.get("trend") or {}).get("slope_c_per_year"),
            }
            for row in payload.get("municipalities", [])
        ]
    else:
        with open(TRENDS_JSON, encoding="utf-8") as f:
            payload = json.load(f)
        rows = payload.get("municipalities", [])
    df = pd.DataFrame(rows)
    return df[["name", "province", "slope_c_per_year"]].copy()


def load_geometries() -> dict:
    """(name, province) -> shapely geometry."""
    from shapely.geometry import shape

    with open(GEOJSON_PATH, encoding="utf-8") as f:
        collection = json.load(f)
    d = {}
    for feat in collection.get("features", []):
        props = feat.get("properties", {}) or {}
        name = props.get("adm3_en") or props.get("NAME_4") or "Unknown"
        province = props.get("province") or props.get("ADM1_EN") or "Unknown"
        d[(str(name), str(province))] = shape(feat.get("geometry"))
    return d


def queen_weights(geoms: dict) -> dict:
    """Build Queen contiguity spatial weights: {(i, j): 1} for touching polygons."""
    keys = list(geoms.keys())
    weights: dict[tuple[int, int], float] = {}
    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            g1, g2 = geoms[keys[i]], geoms[keys[j]]
            if g1.touches(g2):
                weights[(i, j)] = 1.0
                weights[(j, i)] = 1.0
    return weights, keys


def morans_i_global(y: np.ndarray, weights: dict, n: int) -> tuple[float, float]:
    """Global Moran's I with permutation pseudo p-value (999 permutations)."""
    y_centered = y - np.mean(y)
    ss = np.sum(y_centered ** 2)

    # Sum of weights
    w_sum = sum(weights.values())

    # Numerator: sum_i sum_j w_ij * y_i_centered * y_j_centered
    numer = 0.0
    for (i, j), wij in weights.items():
        numer += wij * y_centered[i] * y_centered[j]

    I = (n / w_sum) * (numer / ss) if w_sum > 0 and ss > 0 else 0.0

    # Permutation test
    rng = np.random.default_rng(RANDOM_SEED)
    perm_Is = []
    for _ in range(N_PERMUTATIONS):
        y_perm = rng.permutation(y_centered)
        numer_p = 0.0
        for (i, j), wij in weights.items():
            numer_p += wij * y_perm[i] * y_perm[j]
        I_p = (n / w_sum) * (numer_p / ss) if w_sum > 0 and ss > 0 else 0.0
        perm_Is.append(I_p)

    perm_Is = np.array(perm_Is)
    # Pseudo p-value: proportion of permuted I >= observed I
    p_value = float(np.mean(perm_Is >= I))

    return float(I), p_value


def lisa_local(y: np.ndarray, weights: dict, n: int, global_I: float) -> list[dict]:
    """Local Moran's I (LISA) per location with cluster classification."""
    y_centered = y - np.mean(y)
    ss = np.mean(y_centered ** 2)
    std_y = y_centered / np.sqrt(ss) if ss > 0 else y_centered

    results = []
    for i in range(n):
        neighbors = [j for (ii, j) in weights if ii == i]
        if not neighbors:
            results.append({
                "index": i,
                "lisa": 0.0,
                "cluster": "NS",
            })
            continue

        # Local Moran's I_i = z_i * sum_j(w_ij * z_j)  (approximately, using std)
        lag = np.mean(std_y[neighbors]) if neighbors else 0.0
        lisa_i = float(std_y[i] * lag)

        # Classify based on sign of z_i and spatial lag
        zi = std_y[i]
        if zi > 0 and lag > 0:
            cluster = "HH"  # High-High
        elif zi < 0 and lag < 0:
            cluster = "LL"  # Low-Low
        elif zi > 0 and lag < 0:
            cluster = "HL"  # High-Low
        elif zi < 0 and lag > 0:
            cluster = "LH"  # Low-High
        else:
            cluster = "NS"  # Not significant (no permutation test for local)

        results.append({
            "index": i,
            "lisa": round(lisa_i, 6),
            "cluster": cluster,
        })

    return results


def main() -> None:
    if not GEOJSON_PATH.exists():
        print(f"ERROR: {GEOJSON_PATH} not found. Cannot compute Moran's I.")
        return

    trends = load_trends()
    geoms = load_geometries()

    # Match trends to geometries on (name, province)
    geo_keys = list(geoms.keys())
    trend_dict = {
        (str(r["name"]), str(r["province"])): float(r["slope_c_per_year"])
        for _, r in trends.iterrows()
        if pd.notna(r["slope_c_per_year"])
    }

    matched_keys = [k for k in geo_keys if k in trend_dict]
    print(f"Matched {len(matched_keys)} municipalities between trends and geometries.")

    if len(matched_keys) < 3:
        print("ERROR: Too few matched municipalities for spatial analysis.")
        return

    y = np.array([trend_dict[k] for k in matched_keys], dtype=float)
    n = len(y)

    weights, keys = queen_weights(geoms)
    # Reindex weights to matched_keys order
    key_to_idx = {k: i for i, k in enumerate(matched_keys)}
    remapped_weights = {}
    for (i, j), wij in weights.items():
        ki, kj = keys[i], keys[j]
        if ki in key_to_idx and kj in key_to_idx:
            remapped_weights[(key_to_idx[ki], key_to_idx[kj])] = wij

    # Global Moran's I
    global_I, p_value = morans_i_global(y, remapped_weights, n)
    print(f"Global Moran's I = {global_I:.4f} (p = {p_value:.4f}, {N_PERMUTATIONS} permutations)")

    # Local Moran's I
    lisa_results = lisa_local(y, remapped_weights, n, global_I)

    cluster_counts = {}
    for r in lisa_results:
        c = r["cluster"]
        cluster_counts[c] = cluster_counts.get(c, 0) + 1
    print(f"LISA cluster counts: {cluster_counts}")

    hh_clusters = [
        matched_keys[r["index"]] for r in lisa_results if r["cluster"] == "HH"
    ]
    print(f"HH clusters ({len(hh_clusters)}): {hh_clusters[:10]}")

    # Build output
    lisa_by_muni = {}
    for r in lisa_results:
        name, province = matched_keys[r["index"]]
        lisa_by_muni[(name, province)] = {
            "lisa": r["lisa"],
            "cluster": r["cluster"],
        }

    # Update trends with lisa data
    municipalities_out = []
    for _, r in trends.iterrows():
        key = (str(r["name"]), str(r["province"]))
        lisa = lisa_by_muni.get(key, {"lisa": None, "cluster": "NS"})
        municipalities_out.append({
            "name": r["name"],
            "province": r["province"],
            "slope_c_per_year": r["slope_c_per_year"],
            "morans_i_local": lisa["lisa"],
            "lisa_cluster": lisa["cluster"],
        })

    payload = {
        "project": "Bicol In-Heat",
        "method": "Queen contiguity spatial weights; Global Moran's I with 999 permutations; Local Moran's I (LISA) cluster classification",
        "n_municipalities": n,
        "n_permutations": N_PERMUTATIONS,
        "global_morans_i": round(global_I, 6),
        "global_morans_i_p_value": round(p_value, 6),
        "cluster_counts": cluster_counts,
        "hh_clusters": [
            {"name": k[0], "province": k[1]} for k in hh_clusters
        ],
        "municipalities": municipalities_out,
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nWrote {OUT_JSON}")
    SNAPSHOT_JSON.parent.mkdir(parents=True, exist_ok=True)
    SNAPSHOT_JSON.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"Wrote {SNAPSHOT_JSON}")


if __name__ == "__main__":
    main()
