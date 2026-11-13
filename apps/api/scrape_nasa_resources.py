"""Task 1: Scrape core text from NASA-related climate/statistical resources.

Uses Playwright (headless Chromium) to visit each URL, extract visible page text,
and save results to output/nasa_resources_text.json as:
  [{"tool": <name>, "url": <url>, "extracted_text": <text>}, ...]

A URL that fails to load is logged with an error entry rather than crashing the run.
"""

from __future__ import annotations

import json
from pathlib import Path

from playwright.sync_api import sync_playwright

API_DIR = Path(__file__).resolve().parent
OUT_JSON = API_DIR / "output" / "nasa_resources_text.json"

# (tool name, url). Item 3 has no canonical URL given in the task, so we search
# for a reputable statistical-significance guide and fall back to a NIST page.
URLS = [
    ("KNMI Climate Explorer", "https://climexp.knmi.nl/"),
    (
        "Statistical test methods (Nature Scientific Reports)",
        "https://www.nature.com/articles/s41598-021-97581-7",
    ),
    (
        "Comprehensive Guide to Statistical Significance (NIST)",
        "https://www.itl.nist.gov/div898/handbook/prc/section1/prc13.htm",
    ),
    ("AppEEARS", "https://appeears.earthdatacloud.nasa.gov/"),
    ("Giovanni", "https://giovanni.gsfc.nasa.gov/giovanni/"),
    ("Climate Data Online (CDO)", "https://www.ncei.noaa.gov/cdo-web/"),
]


def extract_text(page) -> str:
    """Return the main visible text of the page, stripped of excess whitespace."""
    # Grab <main> or <article> if present, else <body>.
    for selector in ("main", "article", "body"):
        locator = page.locator(selector)
        if locator.count():
            text = locator.first.inner_text(timeout=15000)
            if text and text.strip():
                return " ".join(text.split())
    return ""


def scrape() -> list[dict]:
    results: list[dict] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/158.0 Safari/537.36"
            )
        )
        page = context.new_page()
        page.set_default_navigation_timeout(45000)
        page.set_default_timeout(30000)

        for tool, url in URLS:
            entry = {"tool": tool, "url": url, "extracted_text": ""}
            try:
                page.goto(url, wait_until="domcontentloaded")
                # Give dynamic content a moment to render.
                page.wait_for_timeout(2000)
                text = extract_text(page)
                title = page.title().strip() if page.title() else ""
                # A 404 / page-not-found / empty page counts as a failed fetch:
                # log it and move on, per the task constraints.
                is_failed = (
                    not text.strip()
                    or "page not found" in title.lower()
                    or "page not found" in text[:200].lower()
                )
                if is_failed:
                    entry["extracted_text"] = (
                        f"[FETCH FAILED] resource unavailable (404 / empty) for {url}. "
                        f"Title: {title or '(none)'}"
                    )
                else:
                    entry["extracted_text"] = text
            except Exception as exc:  # one bad URL must not kill the run
                entry["extracted_text"] = (
                    f"[FETCH FAILED] {type(exc).__name__}: {exc}"
                )
            results.append(entry)
            print(f"[{'OK' if not entry['extracted_text'].startswith('[FETCH') else 'FAIL'}] {tool}")

        browser.close()

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"\nwrote {len(results)} entries -> {OUT_JSON}")
    return results


if __name__ == "__main__":
    scrape()
