"""Download and parse NOAA Oceanic Niño Index (ONI) data.

Fetches the official NOAA CPC ONI ASCII file, extracts Year + ANOM columns,
computes annual mean ONI per year, and writes data/oni_annual.csv.

Source: https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt

Usage:
  python fetch_enso_data.py
"""

from __future__ import annotations

import csv
import io
from pathlib import Path

import requests

API_DIR = Path(__file__).resolve().parent
ONI_URL = "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt"
OUT_CSV = API_DIR / "data" / "oni_annual.csv"


def fetch_oni_text() -> str:
    """Download the ONI ASCII file from NOAA CPC."""
    resp = requests.get(ONI_URL, timeout=60)
    resp.raise_for_status()
    return resp.text


def parse_oni(text: str) -> list[dict]:
    """Parse ONI ASCII text -> list of {year, season, sst, anom}.

    Lines look like:  DJF 1981 26.9 0.1
    Blank lines and header lines are skipped.
    """
    records: list[dict] = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split()
        # Expect at least: SEASON YEAR SST ANOM
        if len(parts) < 4:
            continue
        season = parts[0]
        try:
            year = int(parts[1])
            sst = float(parts[2])
            anom = float(parts[3])
        except ValueError:
            # Header or malformed line
            continue
        records.append(
            {"season": season, "year": year, "sst": sst, "anom": anom}
        )
    return records


def annual_mean(records: list[dict]) -> dict[int, float]:
    """Group ONI anomalies by year and compute annual mean."""
    by_year: dict[int, list[float]] = {}
    for r in records:
        by_year.setdefault(r["year"], []).append(r["anom"])
    return {y: sum(v) / len(v) for y, v in by_year.items()}


def main() -> None:
    print("Downloading NOAA ONI data from CPC...")
    text = fetch_oni_text()
    records = parse_oni(text)
    print(f"  Parsed {len(records)} seasonal ONI records")

    yearly = annual_mean(records)
    years = sorted(yearly.keys())
    print(f"  Year range: {years[0]}-{years[-1]} ({len(years)} years)")

    # Filter to 1981-2025 (our analysis window)
    filtered = {y: yearly[y] for y in years if 1981 <= y <= 2025}
    print(f"  In analysis window (1981-2025): {len(filtered)} years")

    # Write CSV
    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["year", "oni_anomaly"])
        for y in sorted(filtered.keys()):
            writer.writerow([y, round(filtered[y], 4)])

    print(f"Wrote {OUT_CSV}")

    # Print 2024 ONI value
    oni_2024 = filtered.get(2024)
    print(f'ONI DATA DONE | Years: 1981-2025 | 2024 ONI: {oni_2024}')


if __name__ == "__main__":
    main()
