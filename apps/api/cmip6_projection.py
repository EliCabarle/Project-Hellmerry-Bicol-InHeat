"""CMIP6 climate projection for 2050 (NASA NEX-GDDP-CMIP6).

Attempts to load NASA/NEX-GDDP-CMIP6 tasmax for 3 models (ACCESS-CM2, MIROC6,
GFDL-ESM4) and 2 scenarios (ssp245, ssp585), compute annual max tasmax per
municipality centroid for 2020-2050, and compare to the local linear projection.

SKIP NOTE: The NASA/NEX-GDDP-CMIP6 asset could not be loaded from this
Earthside project (asset not found / access denied). CMIP6 projection is
therefore SKIPPED. The local linear 2050 projection stands alone with an
explicit "trend extension, not climate scenario" disclaimer.

If the asset becomes available, uncomment the GEE block below and provide
model/scenario lists.

Usage:
  python cmip6_projection.py
"""

from __future__ import annotations

import json
from pathlib import Path

API_DIR = Path(__file__).resolve().parent
FORECAST_JSON = API_DIR / "output" / "forecast_2050.json"
OUT_JSON = API_DIR / "output" / "cmip6_projection.json"

# Representative CMIP6 models and scenarios (would be used if asset available).
MODELS = ["ACCESS-CM2", "MIROC6", "GFDL-ESM4"]
SCENARIOS = ["ssp245", "ssp585"]

SKIP_REASON = (
    "NASA/NEX-GDDP-CMIP6 Earth Engine asset not accessible from this project "
    "(asset not found or access denied). CMIP6 2050 projection skipped; "
    "local linear trend extension used instead."
)


def main() -> None:
    payload = {
        "project": "Bicol In-Heat",
        "status": "skipped",
        "skip_reason": SKIP_REASON,
        "models_attempted": MODELS,
        "scenarios_attempted": SCENARIOS,
        "note": (
            "CMIP6 projection not available. Local linear 2050 projection in "
            "output/forecast_2050.json is a trend extension of the observed "
            "Theil-Sen slope, not a GCM-based climate scenario. It should not "
            "be interpreted as a climate projection."
        ),
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"CMIP6 SKIPPED | {SKIP_REASON}")
    print(f"Wrote skip record -> {OUT_JSON}")


if __name__ == "__main__":
    main()
