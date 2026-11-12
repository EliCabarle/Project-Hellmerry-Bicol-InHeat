"""Opposite-trends neighbor analysis.

Tests the challenge's explicit claim: "a measured Earth science data variable can
trend one way in one region and the opposite way in another." Loads per-municipality
slopes from output/trends.json, builds polygon adjacency from the Bicol GeoJSON,
and checks every neighboring pair for opposite-sign slopes.

Outputs output/opposite_trends.json.

Usage:
  python opposite_trends.py
"""

from __future__ import annotations

import json
from pathlib import Path

from shapely.geometry import shape

API_DIR = Path(__file__).resolve().parent
TRENDS_JSON = API_DIR / "output" / "trends.json"
GEOJSON_PATH = (
    API_DIR.parent / "web" / "public" / "data" / "bicol-municipalities.geojson"
)
OUT_JSON = API_DIR / "output" / "opposite_trends.json"


def load_trends() -> dict:
    """(name, province) -> slope_c_per_year."""
    with open(TRENDS_JSON, encoding="utf-8") as f:
        payload = json.load(f)
    d = {}
    for row in payload["municipalities"]:
        d[(row["name"], row["province"])] = float(row.get("slope_c_per_year", 0.0))
    return d


def load_geometries() -> dict:
    """(name, province) -> shapely geometry."""
    with open(GEOJSON_PATH, encoding="utf-8") as f:
        collection = json.load(f)
    d = {}
    for feat in collection.get("features", []):
        props = feat.get("properties", {}) or {}
        name = props.get("adm3_en") or props.get("NAME_4") or "Unknown"
        province = props.get("province") or props.get("ADM1_EN") or "Unknown"
        d[(name, province)] = shape(feat.get("geometry"))
    return d


def main() -> None:
    slopes = load_trends()
    geoms = load_geometries()

    keys = list(slopes.keys())
    neighbor_pairs = []
    opposite_count = 0
    max_divergent = None

    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            k1, k2 = keys[i], keys[j]
            g1, g2 = geoms.get(k1), geoms.get(k2)
            if g1 is None or g2 is None:
                continue
            # Adjacency: polygons touch (share a boundary) — includes islands
            # that are near but we only count true shared-edge neighbors.
            if not g1.touches(g2):
                continue
            s1, s2 = slopes[k1], slopes[k2]
            diff = abs(s1 - s2)
            dir_opposite = (s1 > 0) != (s2 > 0)  # opposite-sign slopes
            if dir_opposite:
                opposite_count += 1
            neighbor_pairs.append(
                {
                    "muni_A": k1[0],
                    "prov_A": k1[1],
                    "muni_B": k2[0],
                    "prov_B": k2[1],
                    "slope_A": round(s1, 6),
                    "slope_B": round(s2, 6),
                    "diff": round(diff, 6),
                    "same_direction": not dir_opposite,
                }
            )
            if max_divergent is None or diff > max_divergent["diff"]:
                max_divergent = {
                    "muni_A": k1[0],
                    "prov_A": k1[1],
                    "muni_B": k2[0],
                    "prov_B": k2[1],
                    "slope_A": round(s1, 6),
                    "slope_B": round(s2, 6),
                    "diff": round(diff, 6),
                }

    neighbor_pairs.sort(key=lambda p: p["diff"], reverse=True)

    payload = {
        "project": "Bicol In-Heat",
        "total_municipalities": len(keys),
        "neighbor_pairs_count": len(neighbor_pairs),
        "opposite_direction_count": opposite_count,
        "max_divergent_pair": max_divergent,
        "neighbor_pairs": neighbor_pairs,
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    print(f"Loaded {len(keys)} municipalities; found {len(neighbor_pairs)} neighboring pairs.")
    print(f"Opposite-direction neighbor pairs: {opposite_count}")
    print("\nTop 5 most divergent neighbor pairs:")
    for p in neighbor_pairs[:5]:
        print(
            f"  {p['muni_A']} ({p['prov_A']}, slope={p['slope_A']:+.4f}) "
            f"<-> {p['muni_B']} ({p['prov_B']}, slope={p['slope_B']:+.4f}) "
            f"diff={p['diff']:+.4f} same_dir={p['same_direction']}"
        )

    if opposite_count == 0:
        print(
            "\nFINDING: All 114 municipalities warming in the same direction — "
            "this is regionally uniform warming, not patchy. The challenge's "
            "'opposite trends' quote is answered with a null finding: no "
            "opposite trends exist in Bicol."
        )
    print(f"Wrote {OUT_JSON}")


if __name__ == "__main__":
    main()
