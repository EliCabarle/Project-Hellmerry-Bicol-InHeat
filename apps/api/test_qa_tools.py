"""Self-check for the /api/qa tools. Run: python test_qa_tools.py

Hits the live Supabase project, like test_pipeline.py. No pytest needed.
"""

import json
import types
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


def test_greetings_route_to_the_greeting_path():
    for question in (
        "Hi",
        "hello!",
        "HEY there",
        "Kamusta",
        "kumusta po",
        "good morning",
        "what is your name?",
        "who are you",
    ):
        assert qa._is_chitchat(question), question


def test_questions_that_start_with_a_greeting_are_data():
    # The old prefix match + 40-char cap answered all of these as small talk.
    for question in (
        "Hi! What is the hottest municipality?",
        "Hello, which municipalities are hottest?",
        "Hi, why is Legazpi so hot?",
        "Kamusta ang pag-init sa Naga?",
        "Kumusta! Ano ang pinakamainit na bayan?",
        "history of Bicol heat",
    ):
        assert not qa._is_chitchat(question), question


class _FakeResponse:
    """Minimal stand-in for an OpenAI chat completion with no tool calls."""

    def __init__(self):
        self.choices = [
            types.SimpleNamespace(
                message=types.SimpleNamespace(
                    content="answer from tools", tool_calls=None
                ),
                finish_reason="stop",
            )
        ]


def test_retrieval_failure_does_not_kill_the_answer():
    # A dead RPC must degrade to "no document context", not a 500.
    original_retrieve, original_chat = qa._retrieve, qa._chat

    def boom(_question):
        raise RuntimeError("database down")

    qa._retrieve = boom
    qa._chat = lambda messages, tools: _FakeResponse()
    try:
        result = qa.answer(qa.QARequest(question="when did the warming trend break?"))
        assert result.answer == "answer from tools", result.answer
        assert result.sources == [], result.sources
    finally:
        qa._retrieve, qa._chat = original_retrieve, original_chat


if __name__ == "__main__":
    passed = 0
    for name, test in list(globals().items()):
        if name.startswith("test_") and callable(test):
            test()
            print(f"  ok  {name}")
            passed += 1
    print(f"{passed} pass")
