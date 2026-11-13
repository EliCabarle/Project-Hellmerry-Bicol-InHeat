"""Block-bootstrap confidence intervals + FDR for heat-index trends.

Recomputes, for every municipality in `output/trends.json`, a moving-block
bootstrap confidence interval for the Theil-Sen slope and a Benjamini-Hochberg
FDR-adjusted p-value. This is the statistical upgrade the gap analysis flags as
the #1 PhD-level fix:

* The scipy Theil-Sen CI assumes iid residuals. Annual climate series are
  autocorrelated, so that CI is too narrow. A moving-block bootstrap resamples
  contiguous blocks of years, preserving the serial correlation, giving an
  honest CI.
* Testing 114 municipalities at alpha = 0.05 without correction yields ~5-6
  false "significant" trends by chance. Benjamini-Hochberg FDR controls the
  false-discovery rate.

Usage:
  python bootstrap_ci.py
  python bootstrap_ci.py --in output/trends.json --out output/bootstrap_ci_results.json
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import theilslopes

API_DIR = Path(__file__).resolve().parent
IN_JSON = API_DIR / "output" / "trends.json"
OUT_JSON = API_DIR / "output" / "bootstrap_ci_results.json"

ALPHA = 0.05
BLOCK_YEARS = 5  # standard block length for annual climate series
N_BOOTSTRAP = 300  # 300 replications is ample for a 95% percentile CI
RANDOM_SEED = 42


def theil_sen_slope(years: np.ndarray, values: np.ndarray) -> float:
    return float(theilslopes(values, years, alpha=0.95)[0])


def block_bootstrap_ci(
    years: np.ndarray, values: np.ndarray, block: int = BLOCK_YEARS, n: int = N_BOOTSTRAP
) -> tuple[float, float]:
    """Moving-block bootstrap 95% CI for the Theil-Sen slope.

    Resamples contiguous blocks of *block* years (with replacement) until the
    series length is rebuilt, refits Theil-Sen on each resample, and returns
    the 2.5 / 97.5 percentiles of the bootstrap slope distribution.
    """
    rng = random.Random(RANDOM_SEED)
    n_years = len(values)
    if n_years < block * 2:
        # too short to block: fall back to analytical CI
        _, _, lo, hi = theilslopes(values, years, alpha=0.95)
        return float(lo), float(hi)

    slopes = []
    for _ in range(n):
        # draw enough blocks to cover the series, then truncate
        n_blocks = (n_years + block - 1) // block
        blocks = [rng.randrange(0, n_years - block + 1) for _ in range(n_blocks)]
        resample_idx = sorted(i for b in blocks for i in range(b, min(b + block, n_years)))
        resample_idx = resample_idx[:n_years]
        if len(resample_idx) < 3:
            continue
        yrs = years[resample_idx]
        vals = values[resample_idx]
        slopes.append(theil_sen_slope(yrs, vals))

    if not slopes:
        _, _, lo, hi = theilslopes(values, years, alpha=0.95)
        return float(lo), float(hi)

    lo = float(np.percentile(slopes, 2.5))
    hi = float(np.percentile(slopes, 97.5))
    return lo, hi


def benjamini_hochberg(p_values: list[float]) -> list[float]:
    """FDR-adjusted q-values (Benjamini-Hochberg), same length/order as input."""
    p = np.asarray(p_values, dtype=float)
    n = len(p)
    order = np.argsort(p)
    ranked = p[order]
    q = ranked * n / (np.arange(n) + 1)
    # enforce monotonicity: q[i] = min(q[i], q[i+1], ...) walking from the end
    q = np.minimum.accumulate(q[::-1])[::-1]
    q = np.clip(q, 0.0, 1.0)
    out = np.empty(n, dtype=float)
    out[order] = q
    return out.tolist()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--in", dest="in_json", default=str(IN_JSON))
    parser.add_argument("--out", default=str(OUT_JSON))
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="process only first N municipalities (quick test)",
    )
    parser.add_argument(
        "--n-bootstrap",
        type=int,
        default=N_BOOTSTRAP,
        help="bootstrap replications",
    )
    args = parser.parse_args()

    payload = json.loads(Path(args.in_json).read_text(encoding="utf-8"))
    municipalities = payload["municipalities"]
    if args.limit is not None:
        municipalities = municipalities[: args.limit]

    rng = random.Random(RANDOM_SEED)
    results = []
    for muni in municipalities:
        series = muni.get("series") or []
        points = [(s["year"], s["mean_heat_index_c"]) for s in series if s.get("mean_heat_index_c") is not None]
        if len(points) < 8:
            results.append(
                {
                    "name": muni["name"],
                    "province": muni["province"],
                    "skipped": "too few annual points",
                    "n_years": len(points),
                }
            )
            continue
        years = np.array([p[0] for p in points], dtype=float)
        values = np.array([p[1] for p in points], dtype=float)

        slope = theil_sen_slope(years, values)
        boot_lo, boot_hi = block_bootstrap_ci(years, values, block=BLOCK_YEARS, n=args.n_bootstrap)
        _, _, ana_lo, ana_hi = theilslopes(values, years, alpha=0.95)

        results.append(
            {
                "name": muni["name"],
                "province": muni["province"],
                "n_years": int(len(points)),
                "slope": round(slope, 6),
                "slope_ci_bootstrap_low": round(boot_lo, 6),
                "slope_ci_bootstrap_high": round(boot_hi, 6),
                "slope_ci_analytical_low": round(float(ana_lo), 6),
                "slope_ci_analytical_high": round(float(ana_hi), 6),
                "bootstrap_ci_wider": (boot_hi - boot_lo) > (float(ana_hi) - float(ana_lo)),
                "in_stored_p_value": muni.get("p_value"),
                "in_stored_fdr": muni.get("p_value_fdr"),
            }
        )

    # FDR across municipalities that have a stored p-value
    pvals = [r["in_stored_p_value"] for r in results if r.get("in_stored_p_value") is not None]
    qvals = benjamini_hochberg(pvals) if pvals else []
    q_iter = iter(qvals)
    for r in results:
        if r.get("in_stored_p_value") is not None:
            r["recomputed_fdr_q"] = round(next(q_iter), 6)

    out = {
        "generated_at": __import__("datetime").datetime.now().isoformat(),
        "method": (
            "moving-block bootstrap Theil-Sen 95% CI "
            f"(block={BLOCK_YEARS} years, {args.n_bootstrap} replications) + "
            "Benjamini-Hochberg FDR"
        ),
        "alpha": ALPHA,
        "block_years": BLOCK_YEARS,
        "n_bootstrap": args.n_bootstrap,
        "n_municipalities": len(results),
        "municipalities": results,
    }

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")

    wider = sum(1 for r in results if r.get("bootstrap_ci_wider"))
    print(f"wrote {len(results)} municipalities -> {out_path}")
    print(f"bootstrap CI wider than analytical in {wider} cases (expected: autocorrelation widens CI)")
    # show a few
    for r in results[:5]:
        if "slope" in r:
            print(
                f"  {r['name']}: slope={r['slope']:+.4f} "
                f"boot=[{r['slope_ci_bootstrap_low']:+.4f},{r['slope_ci_bootstrap_high']:+.4f}] "
                f"ana=[{r['slope_ci_analytical_low']:+.4f},{r['slope_ci_analytical_high']:+.4f}]"
            )


if __name__ == "__main__":
    main()
