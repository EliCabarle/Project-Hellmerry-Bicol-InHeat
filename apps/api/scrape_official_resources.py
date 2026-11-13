"""Task 1: Scrape official NASA Space Apps 2026 resources page + key dataset pages.

Fast, bounded approach:
1. Scrape the main resources page (already verified ~3806 chars).
2. Visit a curated list of known dataset/tool documentation URLs directly.
3. Save all extracted info to output/official_resources_scraped.json.
"""

from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

API_DIR = Path(__file__).resolve().parent
OUT_JSON = API_DIR / "output" / "official_resources_scraped.json"

RESOURCES_URL = (
    "https://www.spaceappschallenge.org/2026/challenges/"
    "earth-system-trend-detective/?tab=resources"
)

# Curated dataset/tool documentation URLs from the resources page.
DATASET_URLS = [
    ("Giovanni", "https://giovanni.gsfc.nasa.gov/giovanni/"),
    ("AppEEARS", "https://appeears.earthdatacloud.nasa.gov/"),
    ("Climate Data Online (CDO)", "https://www.ncei.noaa.gov/cdo-web/"),
    ("KNMI Climate Explorer", "https://climexp.knmi.nl/"),
    (
        "Statistical test methods (Nature Scientific Reports)",
        "https://www.nature.com/articles/s41598-021-97581-7",
    ),
    (
        "Comprehensive Guide to Statistical Significance (NIST)",
        "https://www.itl.nist.gov/div898/handbook/prc/section1/prc13.htm",
    ),
    ("Hydrology Time Series (NASA GES DISC)", "https://disc.gsfc.nasa.gov/"),
]


def extract_visible_text(page) -> str:
    for selector in ("main", "article", "body"):
        locator = page.locator(selector)
        if locator.count():
            text = locator.first.inner_text(timeout=15000)
            if text and text.strip():
                return " ".join(text.split())
    return ""


def scrape_page(context, tool_name: str, url: str) -> dict:
    entry = {"tool": tool_name, "url": url, "extracted_text": ""}
    page = context.new_page()
    page.set_default_navigation_timeout(45000)
    page.set_default_timeout(25000)
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(2000)
        text = extract_visible_text(page)
        title = page.title().strip() if page.title() else ""
        if not text.strip():
            entry["extracted_text"] = (
                f"[NO TEXT EXTRACTED] Page loaded but no readable text. "
                f"Title: {title} | URL: {url}"
            )
        else:
            entry["extracted_text"] = (
                f"TITLE: {title}\nURL: {url}\n\n{text}"
            )
    except Exception as exc:
        entry["extracted_text"] = (
            f"[FETCH FAILED] {type(exc).__name__}: {exc} | URL: {url}"
        )
    finally:
        page.close()
    return entry


def main() -> None:
    print("=== TASK 1 START ===")
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

        # 1. Main resources page
        page = context.new_page()
        page.set_default_navigation_timeout(45000)
        print(f"Scraping main resources page: {RESOURCES_URL}")
        page.goto(RESOURCES_URL, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(3000)
        text = extract_visible_text(page)
        title = page.title().strip() if page.title() else ""
        page.close()
        entry = {
            "tool": "NASA Space Apps 2026 - Resources (main page)",
            "url": RESOURCES_URL,
            "extracted_text": (
                f"TITLE: {title}\nURL: {RESOURCES_URL}\n\n{text}"
                if text.strip()
                else f"[NO TEXT EXTRACTED] | URL: {RESOURCES_URL}"
            ),
        }
        results.append(entry)
        print(f"  -> {len(entry['extracted_text'])} chars")

        # 2. Each dataset documentation page
        for tool_name, url in DATASET_URLS:
            entry = scrape_page(context, tool_name, url)
            results.append(entry)
            status = "FAILED" if entry["extracted_text"].startswith("[FETCH") else "OK"
            safe_name = tool_name.encode('ascii', 'ignore').decode('ascii')
            print(f"  [{status}] {safe_name} ({len(entry['extracted_text'])} chars)")

        browser.close()

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nwrote {len(results)} entries -> {OUT_JSON}")
    print("=== TASK 1 DONE ===")


if __name__ == "__main__":
    main()
