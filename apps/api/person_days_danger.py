"""Person-Days of Danger: population-weighted extreme heat exposure per municipality.

Computes:
- person_days_danger = population_2020 × total_danger_days_45y
- person_days_density = person_days_danger / area_km2

Loads population from data/population.csv and danger days from output/narratives.json,
merges on (name, province), ranks descending, and outputs output/person_days_danger.json.

Usage:
  python person_days_danger.py
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

API_DIR = Path(__file__).resolve().parent
POPULATION_CSV = API_DIR / "data" / "population.csv"
NARRATIVES_JSON = API_DIR / "output" / "narratives.json"
OUT_JSON = API_DIR / "output" / "person_days_danger.json"


def load_population() -> dict[tuple[str, str], dict]:
    """Load population.csv -> (name, province) -> {population_2020, area_km2}."""
    index: dict[tuple[str, str], dict] = {}
    with open(POPULATION_CSV, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            key = (row["name"], row["province"])
            index[key] = {
                "population_2020": (
                    float(row["population_2020"]) if row.get("population_2020") else None
                ),
                "area_km2": (
                    float(row["area_km2"]) if row.get("area_km2") else None
                ),
            }
    return index


def main() -> None:
    print("Loading population data...")
    pop = load_population()
    print(f"  {len(pop)} municipalities in population.csv")

    print("Loading narratives.json...")
    with open(NARRATIVES_JSON, encoding="utf-8") as f:
        narratives = json.load(f)
    municipalities = narratives.get("municipalities", [])
    print(f"  {len(municipalities)} municipalities in narratives.json")

    results = []
    missing_pop = []
    missing_danger = []

    for muni in municipalities:
        name = muni["name"]
        province = muni["province"]
        key = (name, province)

        pop_data = pop.get(key)
        danger_days = muni.get("total_danger_days_45y")

        if pop_data is None:
            missing_pop.append(key)
            continue
        if danger_days is None:
            missing_danger.append(key)
            continue

        population_2020 = pop_data["population_2020"]
        area_km2 = pop_data["area_km2"]

        if population_2020 is None or danger_days is None:
            continue

        person_days_danger = int(round(population_2020 * danger_days))
        person_days_density = (
            round(person_days_danger / area_km2, 2) if area_km2 else None
        )

        results.append(
            {
                "name": name,
                "province": province,
                "population_2020": int(round(population_2020)),
                "total_danger_days_45y": int(danger_days),
                "area_km2": round(area_km2, 2) if area_km2 else None,
                "person_days_danger": person_days_danger,
                "person_days_density": person_days_density,
            }
        )

    # Rank descending by person_days_danger
    results.sort(key=lambda r: r["person_days_danger"], reverse=True)
    for i, r in enumerate(results, start=1):
        r["rank"] = i

    total_person_days = sum(r["person_days_danger"] for r in results)

    payload = {
        "project": "Bicol In-Heat",
        "module": "person_days_danger",
        "method": (
            "person_days_danger = population_2020 (SEDAC) × total_danger_days_45y "
            "(POWER-derived heat index ≥ 42°C); person_days_density = "
            "person_days_danger / area_km2"
        ),
        "n_municipalities": len(results),
        "total_person_days_danger": total_person_days,
        "top_10": results[:10],
        "all_municipalities": results,
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nWrote {OUT_JSON}")

    top3 = results[:3]
    top3_str = ", ".join(
        f"{r['name']} ({r['province']}): {r['person_days_danger']:,} person-days"
        for r in top3
    )
    print(
        f"PERSON-DAYS DONE | Top 3: {top3_str} | "
        f"Total Bicol person-days: {total_person_days:,}"
    )

    if missing_pop:
        print(f"Warning: {len(missing_pop)} municipalities missing from population.csv: {missing_pop[:5]}")
    if missing_danger:
        print(f"Warning: {len(missing_danger)} municipalities missing danger days: {missing_danger[:5]}")


if __name__ == "__main__":
    main()
