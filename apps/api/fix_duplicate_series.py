"""One-off repair: merge split-year fragments in `municipality_trends.series`.

POWER returns some years as two partial periods, and three municipalities ended up
with two rows for the same year. Their `n_days` sum to a full year, so a day-weighted
mean reconstructs the annual value. After this runs, Step 3's tools can SELECT the
series without any merge logic.

Recomputes `total_danger_days_45y` / `peak_danger_year` / `peak_danger_days` from the
merged series so the stored aggregates still match it. Does not touch slope, p-value or
significance - those were computed from the 45 annual values and are unaffected.

Usage:
  python fix_duplicate_series.py --dry-run
  python fix_duplicate_series.py
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

from sync_json_to_db import ROOT, merge_split_years

ENV_FILE = Path(__file__).resolve().parents[2] / ".env"  # repo root


def fetch(client) -> list[dict]:
    return (
        client.table("municipality_trends")
        .select(
            "id,name,province,series,total_danger_days_45y,peak_danger_year,peak_danger_days"
        )
        .execute()
        .data
    )


def aggregates(series: list[dict]) -> tuple[int, int | None, int]:
    total = sum(p.get("danger_days") or 0 for p in series)
    peak = max(series, key=lambda p: (p.get("danger_days") or 0, p.get("year") or 0))
    return total, (peak["year"] if total else None), (peak.get("danger_days") or 0)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    load_dotenv(ENV_FILE)
    client = create_client(
        os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"]
    )

    broken = []
    for row in fetch(client):
        years = [p["year"] for p in row["series"] or []]
        if len(years) != len(set(years)):
            broken.append(row)

    if not broken:
        print("no duplicated years found - nothing to do")
        return

    print(f"{len(broken)} municipalities with duplicated years\n")
    for row in broken:
        before = row["series"]
        after = merge_split_years(before)
        total, peak_year, peak_days = aggregates(after)
        duplicates = sorted(
            {
                y
                for y in (p["year"] for p in before)
                if [q["year"] for q in before].count(y) > 1
            }
        )
        print(
            f"{row['name']} ({row['province']}): {len(before)} -> {len(after)} points, "
            f"duplicate years {duplicates}"
        )
        print(
            f"   total {row['total_danger_days_45y']} -> {total}   "
            f"peak {row['peak_danger_year']}/{row['peak_danger_days']} -> {peak_year}/{peak_days}"
        )
        if not args.dry_run:
            client.table("municipality_trends").update(
                {
                    "series": after,
                    "total_danger_days_45y": total,
                    "peak_danger_year": peak_year,
                    "peak_danger_days": peak_days,
                }
            ).eq("id", row["id"]).execute()
            print("   patched")

    if args.dry_run:
        print("\n--dry-run: nothing written")
        return

    # Verify: every series is now 45 unique ascending years and its aggregates match.
    bad = []
    for row in fetch(client):
        years = [p["year"] for p in row["series"] or []]
        total, peak_year, peak_days = aggregates(row["series"] or [])
        if (
            years != list(range(1981, 2026))
            or total != row["total_danger_days_45y"]
            or peak_year != row["peak_danger_year"]
            or peak_days != row["peak_danger_days"]
        ):
            bad.append(row["name"])
    print(f"\nverify: {114 - len(bad)}/114 clean" + (f"  FAILED: {bad}" if bad else ""))


if __name__ == "__main__":
    main()
