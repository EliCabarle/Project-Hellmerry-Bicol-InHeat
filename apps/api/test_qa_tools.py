"""Self-check for the /api/qa tools. Run: python test_qa_tools.py

Hits the live Supabase project, like test_pipeline.py. No pytest needed.
"""

import json
import warnings

warnings.filterwarnings("ignore")

from routers import qa

EXPECTED_MUNICIPALITIES = 114


def test_rank_reports_the_true_total_not_the_page():
    result = qa.tool_rank_municipalities(metric="slope", limit=10)
    assert result["total_matching"] == EXPECTED_MUNICIPALITIES, result["total_matching"]
    assert len(result["municipalities"]) <= 10, len(result["municipalities"])
    # The model reads `summary`, so the count has to be in there.
    assert str(EXPECTED_MUNICIPALITIES) in result["summary"], result["summary"]
    slopes = [row["slope_c_per_year"] for row in result["municipalities"]]
    assert slopes == sorted(slopes, reverse=True), "not ordered by slope"


def test_ambiguous_name_returns_both_provinces():
    result = qa.tool_get_municipality("Bato")
    provinces = {row["province"] for row in result["municipalities"]}
    assert len(provinces) >= 2, provinces


def test_exact_name_ranks_first():
    rows = qa._find("Masbate", limit=5)
    assert rows and "masbate" in rows[0]["name"].lower(), [row["name"] for row in rows]


def test_drivers_are_present():
    result = qa.tool_get_drivers("Masbate")
    assert result["found"] and result["top_drivers"], result


def test_missing_municipality_is_reported_not_raised():
    assert qa.tool_get_municipality("Atlantis")["found"] is False


def test_bad_tool_input_is_json_not_an_exception():
    assert "error" in json.loads(qa._run_tool("rank_municipalities", "not json"))
    assert "error" in json.loads(qa._run_tool("nope", "{}"))
    assert "error" in json.loads(qa._run_tool("get_drivers", '{"wrong": 1}'))


if __name__ == "__main__":
    passed = 0
    for name, test in list(globals().items()):
        if name.startswith("test_") and callable(test):
            test()
            print(f"  ok  {name}")
            passed += 1
    print(f"{passed} pass")
