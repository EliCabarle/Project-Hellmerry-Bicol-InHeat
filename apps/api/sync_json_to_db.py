"""Rewrite `apps/web/public/data/narratives.json` from Supabase `municipality_trends`.

The map, dashboard and narration screen all read one static JSON file. That file had
drifted from the database it is supposed to mirror (93 of 114 p-values disagreed), so
a chatbot answering from Supabase would have contradicted the map. This script makes
the database the single source of truth and regenerates the static file from it.

The emitted shape is identical to `generate_static_json.build()`, so no frontend code
changes. `meta` is carried over from the existing file because it is static config
(project name, units, sources), not something derived from the data; only
`generated_at` and `meta.synced_from` are refreshed.

Usage:
  python sync_json_to_db.py               # rewrite the file, print a diff summary
  python sync_json_to_db.py --dry-run     # print the diff summary, write nothing
  python sync_json_to_db.py --out ../web/public/data/narratives.json
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

from generate_static_json import danger_band, slugify

ALPHA = 0.05
ROOT = Path(__file__).resolve().parent
DEFAULT_OUT = ROOT.parent / "web" / "public" / "data" / "narratives.json"


def fetch_rows() -> list[dict]:
    load_dotenv(ROOT / ".env")
    client = create_client(
        os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"]
    )
    return client.table("municipality_trends").select("*").execute().data


def _direction(slope: float | None) -> str:
    if slope is None or slope == 0:
        return "no trend"
    return "increasing" if slope > 0 else "decreasing"


def merge_split_years(series: list[dict]) -> list[dict]:
    """Collapse same-year fragments into one day-weighted row.

    POWER returns some years as two partial periods, and the DB stored them as two
    rows for the same year (Matnog 2002/2015/2016/2019, Prieto Diaz and Juban 2013).
    Left alone, `n_years` reads 49 for a 45-year series. The fragments' `n_days` sum
    to a full year, so a day-weighted mean reconstructs the annual value.
    """
    by_year: dict[int, list[dict]] = {}
    for point in series:
        by_year.setdefault(point["year"], []).append(point)

    merged = []
    for year in sorted(by_year):
        parts = by_year[year]
        if len(parts) == 1:
            merged.append(parts[0])
            continue
        days = sum(p.get("n_days") or 0 for p in parts) or 1

        def weighted_mean(key: str) -> float | None:
            if any(p.get(key) is None for p in parts):
                return None
            total = sum((p[key]) * (p.get("n_days") or 0) for p in parts)
            return round(total / days, 3)

        merged.append(
            {
                "year": year,
                "n_days": sum(p.get("n_days") or 0 for p in parts),
                "danger_days": sum(p.get("danger_days") or 0 for p in parts),
                "mean_heat_index_c": weighted_mean("mean_heat_index_c"),
                "mean_nighttime_heat_index_c": weighted_mean(
                    "mean_nighttime_heat_index_c"
                ),
            }
        )
    return merged


def build_record(row: dict) -> dict:
    """One DB row -> the exact municipality shape the PWA already consumes."""
    series = merge_split_years(row.get("series") or [])
    latest = series[-1] if series else None
    band = danger_band(latest["mean_heat_index_c"]) if latest else None
    return {
        "id": slugify(row["name"], row["province"]),
        "name": row["name"],
        "province": row["province"],
        "lat": row["latitude"],
        "lon": row["longitude"],
        "trend": {
            "slope_c_per_year": row["slope"],
            "slope_ci95": [row["slope_ci_low"], row["slope_ci_high"]],
            "slope_ci_low": row["slope_ci_low"],
            "slope_ci_high": row["slope_ci_high"],
            "change_point_year": row.get("change_point_year"),
            "change_point_p": row.get("change_point_p"),
            "p_value": row["p_value"],
            "p_value_fdr": row.get("p_value_fdr"),
            "is_significant": row["is_significant"],
            "significant_fdr": row.get("significant_fdr"),
            "alpha": ALPHA,
            "direction": _direction(row["slope"]),
        },
        "sample": {
            "n_years": len(series),
            "n_days": sum(p.get("n_days") or 0 for p in series),
        },
        "latest": {
            "year": latest["year"] if latest else None,
            "mean_heat_index_c": latest["mean_heat_index_c"] if latest else None,
            "nighttime_heat_index_c": (
                latest.get("mean_nighttime_heat_index_c") if latest else None
            ),
            "danger_band": band[0] if band else None,
            "danger_days": latest["danger_days"] if latest else None,
        },
        "total_danger_days_45y": row["total_danger_days_45y"],
        "peak_danger_days": {
            "year": row.get("peak_danger_year"),
            "days": row.get("peak_danger_days"),
        },
        "narration": {"en": row["narration_en"], "fil": row["narration_fil"]},
        "series": series,
        "top_drivers": row.get("top_drivers") or [],
    }


def _flatten(obj: dict, prefix: str = "") -> dict:
    """Leaf paths -> comparable values. Lists (series, top_drivers, CI) compare whole."""
    out: dict = {}
    for key, value in obj.items():
        path = f"{prefix}{key}"
        if isinstance(value, dict):
            out.update(_flatten(value, path + "."))
        else:
            out[path] = value
    return out


def _report(old: dict | None, new: list[dict], out_path: Path, rows: int) -> None:
    old_by_id = {m["id"]: m for m in (old or {}).get("municipalities", [])}
    new_by_id = {m["id"]: m for m in new}

    by_field: dict[str, list[str]] = {}
    for mid, record in new_by_id.items():
        previous = old_by_id.get(mid)
        if previous is None:
            by_field.setdefault("(municipality is new)", []).append(mid)
            continue
        before, after = _flatten(previous), _flatten(record)
        for key in sorted(set(before) | set(after)):
            if before.get(key) != after.get(key):
                by_field.setdefault(key, []).append(mid)

    removed = sorted(set(old_by_id) - set(new_by_id))
    touched = {mid for ids in by_field.values() for mid in ids}

    print(f"source rows      : {rows} (supabase municipality_trends)")
    print(f"output           : {out_path}")
    print(f"municipalities   : {len(new)} (was {len(old_by_id)})")
    print()
    print(f"CHANGED          : {len(touched)} of {len(new)} municipalities")
    if removed:
        print(f"REMOVED          : {len(removed)} -> {', '.join(removed[:5])}")
    print()
    if not by_field:
        print("no field differences")
        return
    print(f"{'field':<42}{'changed':>8}  example")
    print("-" * 88)
    for key in sorted(by_field, key=lambda k: (-len(by_field[k]), k)):
        ids = by_field[key]
        print(f"{key:<42}{len(ids):>8}  {ids[0]}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    out_path = Path(args.out).resolve()
    if not out_path.exists():
        raise SystemExit(
            f"{out_path} does not exist - run generate_static_json.py first; "
            "this script reuses its meta block."
        )

    old = json.loads(out_path.read_text(encoding="utf-8"))
    rows = fetch_rows()
    municipalities = sorted(
        (build_record(r) for r in rows), key=lambda m: (m["name"], m["province"])
    )

    meta = dict(old["meta"])
    # The carried-over meta predates the scientific upgrade: the DB's numbers come
    # from calculate_trends.py (Hamed-Rao + Pettitt) plus fdr_correction.py, not the
    # plain original_test the old block claimed.
    meta["variable"] = (
        "annual mean daily peak heat index (Rothfusz, POWER T2M_MAX + RH derived "
        "from T2MDEW), with annual mean nighttime heat index (Rothfusz, T2M_MIN)"
    )
    meta["method"] = (
        "Theil-Sen slope (95% CI) + Hamed-Rao Modified Mann-Kendall + "
        "Pettitt change-point test + Benjamini-Hochberg FDR"
    )
    meta["synced_from"] = "supabase municipality_trends"
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "meta": meta,
        "municipalities": municipalities,
    }

    _report(old, municipalities, out_path, len(rows))
    if args.dry_run:
        print("\n--dry-run: nothing written")
        return

    out_path.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"\nwritten: {out_path}")


if __name__ == "__main__":
    main()
