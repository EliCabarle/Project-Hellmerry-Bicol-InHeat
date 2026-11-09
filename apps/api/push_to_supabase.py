"""Push the static JSON outputs into Supabase `municipality_trends`.

Reads `output/narratives.json` (trend + danger-day numbers) and, when present,
`output/drivers.json` (RF/SHAP ranking) and upserts one row per municipality.

Conflict key is `(name, province)`, not `name`: 'Bato' and 'San Fernando' each
exist in two Region V provinces, so upserting on name alone overwrites one with
the other. Requires a unique constraint on that pair - see
`apps/api/migrations/0002_top_drivers.sql`.

Usage:
  python push_to_supabase.py            # needs SUPABASE_URL + SUPABASE_SERVICE_KEY in .env
  python push_to_supabase.py --dry-run  # print what would be written, no network
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BASE_DIR / ".env")


def load_output(name: str) -> dict:
    path = BASE_DIR / "output" / name
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def driver_index() -> dict[tuple[str, str], list[dict]]:
    """(name, province) -> top_drivers, empty when calculate_drivers.py has not run."""
    drivers = load_output("drivers.json")
    return {
        (row["name"], row["province"]): row["top_drivers"]
        for row in drivers.get("municipalities", [])
    }


def build_record(city_data: dict, drivers: dict) -> dict:
    trend = city_data.get("trend") or {}
    peak = city_data.get("peak_danger_days") or {}
    latest = city_data.get("latest") or {}
    return {
        "name": city_data.get("name"),
        "province": city_data.get("province", ""),
        "latitude": city_data.get("lat"),
        "longitude": city_data.get("lon"),
        # column is `slope`; the source key is slope_c_per_year
        "slope": trend.get("slope_c_per_year"),
        "p_value": trend.get("p_value"),
        "is_significant": trend.get("is_significant"),
        "top_drivers": drivers.get((city_data.get("name"), city_data.get("province", ""))),
        # latest-year annual means of the daily peak and nighttime heat index
        "heat_index_max_c": latest.get("mean_heat_index_c"),
        "nighttime_heat_index_c": latest.get("nighttime_heat_index_c"),
        "total_danger_days_45y": city_data.get("total_danger_days_45y", 0),
        "peak_danger_year": peak.get("year"),
        "peak_danger_days": peak.get("days", 0),
        "narration_en": city_data.get("narration", {}).get("en"),
        "narration_fil": city_data.get("narration", {}).get("fil"),
        "series": city_data.get("series", []),
    }


def main(dry_run: bool) -> None:
    municipalities = load_output("narratives.json").get("municipalities", [])
    drivers = driver_index()
    if not drivers:
        print("warning: output/drivers.json missing - top_drivers will be null")

    client = None
    if not dry_run:
        from supabase import create_client  # imported here so --dry-run needs no deps

        client = create_client(
            os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY")
        )

    print(f"Found {len(municipalities)} municipalities. Pushing to Supabase...")
    success_count = 0
    for city_data in municipalities:
        record = build_record(city_data, drivers)
        try:
            if dry_run:
                print(
                    f"[dry-run] {record['name']}|{record['province']} "
                    f"slope={record['slope']} drivers={len(record['top_drivers'] or [])}"
                )
            else:
                client.table("municipality_trends").upsert(
                    record, on_conflict="name,province"
                ).execute()
                print(f"Uploaded {record['name']}")
            success_count += 1
        except Exception as error:  # one bad row must not abort the rest
            print(f"Failed to upload {record['name']}: {error}")

    print(f"\nSuccessfully pushed {success_count}/{len(municipalities)} municipalities!")


if __name__ == "__main__":
    main(dry_run="--dry-run" in sys.argv)
