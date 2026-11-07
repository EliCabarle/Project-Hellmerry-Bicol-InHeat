"""PAGASA hold-out validation: POWER-derived heat index vs station readings.

Reported as POWER minus PAGASA (bias + RMSE), per the pipeline guardrails
(HANDOFF B: hold out one PAGASA station + last 3 years). Matched on station
name, date, and province; a station name hitting two provinces in the POWER
data is refused outright instead of silently pooled (the Bato trap).
"""

import pandas as pd


def metrics(errors: pd.Series) -> dict:
    """bias / rmse / n over a series of POWER-minus-station errors."""
    e = pd.Series(errors).dropna().astype(float)
    return {
        "bias": float(e.mean()),
        "rmse": float((e**2).mean() ** 0.5),
        "n": int(len(e)),
    }


def _normalise_station(name: str) -> str:
    """'City of Naga' and 'Naga' must match the same PAGASA station."""
    n = str(name).strip().lower()
    if n.startswith("city of "):
        n = n[len("city of ") :]
    return n


def compare(
    readings: pd.DataFrame, power: pd.DataFrame
) -> tuple[pd.DataFrame, list[str]]:
    """Inner-join readings onto POWER rows by (station, date).

    Returns (matched frame with an 'error' column = POWER - station,
    list of '<name> <date>' strings for unmatched readings).
    """
    readings = readings.copy()
    power = power.copy()
    readings["station_key"] = readings["name"].map(_normalise_station)
    power["station_key"] = power["name"].map(_normalise_station)

    referenced = set(readings["station_key"])
    provinces = power.groupby("station_key")["province"].nunique()
    ambiguous = provinces[(provinces > 1) & provinces.index.isin(referenced)]
    if not ambiguous.empty:
        raise SystemExit(
            "Cannot validate: station name(s) ambiguous across provinces: "
            + ", ".join(str(k) for k in ambiguous.index)
        )

    merged = readings.merge(
        power[["station_key", "date", "heat_index_max_c"]],
        on=["station_key", "date"],
        how="left",
        indicator=True,
    )
    matched = merged[merged["_merge"] == "both"].copy()
    matched["error"] = matched["heat_index_max_c"] - matched["heat_index_c"]
    matched = matched.drop(columns=["station_key", "_merge"])

    unmatched = [
        f"{row['name']} {row['date']}"
        for _, row in merged[merged["_merge"] == "left_only"].iterrows()
    ]
    return matched, unmatched
