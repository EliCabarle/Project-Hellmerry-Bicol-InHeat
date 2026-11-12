"""Apply Benjamini-Hochberg FDR correction to Mann-Kendall trend p-values.

Loads output/trends.json (p_values live at the top level of each municipality
row), extracts all p-values, applies BH correction at alpha=0.05 via
statsmodels multipletests (method='fdr_bh'), and writes p_value_fdr +
significant_fdr back to output/trends.json (top level) and output/narratives.json
(trend block + top level) in place.

Usage:
  python fdr_correction.py
"""

from __future__ import annotations

import json
from pathlib import Path

from statsmodels.stats.multitest import multipletests

API_DIR = Path(__file__).resolve().parent
TRENDS_JSON = API_DIR / "output" / "trends.json"
NARRATIVES_JSON = API_DIR / "output" / "narratives.json"
ALPHA = 0.05


def main() -> None:
    # --- Load trends.json (p_value at top level of each municipality row) ---
    with open(TRENDS_JSON, encoding="utf-8") as f:
        trends = json.load(f)
    muni_trends = trends["municipalities"]
    n = len(muni_trends)

    p_values = [row.get("p_value") for row in muni_trends]
    before_significant = sum(1 for row in muni_trends if row.get("is_significant") is True)

    # Rows with missing p-values cannot be corrected; keep them as-is.
    valid_idx = [i for i, p in enumerate(p_values) if p is not None]
    valid_p = [p_values[i] for i in valid_idx]

    reject = [False] * n
    p_adjusted = [None] * n
    if valid_p:
        rej, padj, _, _ = multipletests(valid_p, alpha=ALPHA, method="fdr_bh")
        for i, r, padj_v in zip(valid_idx, rej, padj):
            reject[i] = bool(r)
            p_adjusted[i] = float(padj_v)

    # --- Write back to trends.json (top level) ---
    for row, p_fdr, sig_fdr in zip(muni_trends, p_adjusted, reject):
        row["p_value_fdr"] = round(p_fdr, 6) if p_fdr is not None else None
        row["significant_fdr"] = bool(sig_fdr)
    Path(TRENDS_JSON).write_text(
        json.dumps(trends, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    # --- Write back to narratives.json (trend block + top level) ---
    with open(NARRATIVES_JSON, encoding="utf-8") as f:
        narratives = json.load(f)
    muni_narratives = narratives["municipalities"]
    n_index = {(row["name"], row["province"]): row for row in muni_narratives}
    for row in muni_trends:
        key = (row["name"], row["province"])
        if key in n_index:
            nrow = n_index[key]
            p_fdr = row["p_value_fdr"]
            sig_fdr = row["significant_fdr"]
            # narratives.json has a per-municipality "trend" sub-block.
            nrow.setdefault("trend", {})
            nrow["trend"]["p_value_fdr"] = p_fdr
            nrow["trend"]["significant_fdr"] = bool(sig_fdr)
            # Also mirror at top level for consumers that read it there.
            nrow["p_value_fdr"] = p_fdr
            nrow["significant_fdr"] = bool(sig_fdr)
    Path(NARRATIVES_JSON).write_text(
        json.dumps(narratives, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    after_significant = int(sum(reject))
    min_p = float(min(p for p in p_values if p is not None))
    print(
        f"FDR DONE | Before: {before_significant}/{n} significant | "
        f"After: {after_significant}/{n} significant | Min p-value: {min_p:.2e}"
    )
    print(f"Updated {TRENDS_JSON} and {NARRATIVES_JSON}")


if __name__ == "__main__":
    main()
