"""POST /api/qa - hybrid RAG + function calling QA chatbot (CONCEPT 6d).

Two retrieval paths, one answer:

  - prose   -> Gemini query embedding -> `match_documents` (pgvector, 0.55 threshold)
  - numbers -> four tools over `municipality_trends`, executed here and fed back

The chat model runs on Groq's free tier. No key reaches the browser: the frontend
calls this endpoint and nothing else.
"""

from __future__ import annotations

import json
import os
import re
import string
import time
from pathlib import Path
from typing import Any

import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from google.api_core.exceptions import ResourceExhausted
from openai import APIConnectionError, APIStatusError, OpenAI
from pydantic import BaseModel, Field
from supabase import create_client

# Force-load .env with override=True so a stale or empty OS-level variable can
# never shadow the file. Load the cwd/ancestors first, then the canonical
# apps/api/.env last so it always wins.
load_dotenv(override=True)
load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=True)

router = APIRouter(prefix="/api", tags=["qa"])

# Groq's free tier (1k req/day, OpenAI-compatible). Verified 2026-11-14 against
# the account's live model list: Llama slugs are not offered there, the GPT-OSS
# pair is. Groq retires slugs — re-check `models.list()` before demo day.
CHAT_MODEL = os.environ.get("CHAT_MODEL", "openai/gpt-oss-120b")
CHAT_MODEL_FALLBACK = os.environ.get("CHAT_MODEL_FALLBACK", "openai/gpt-oss-20b")
BASE_URL = os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
EMBED_MODEL = "models/gemini-embedding-001"
EMBED_DIMS = 1536
MATCH_THRESHOLD = 0.55
MATCH_COUNT = 5
MAX_TOOL_ROUNDS = 4
RETRIES = 4
# Free slugs get throttled into 70s+ stalls; cap each call so a slow model fails
# over to the fallback instead of hanging the request past the browser's patience.
LLM_TIMEOUT = 45.0
RETRY_STATUS = {429, 502, 503, 504}

SYSTEM_PROMPT = (
    "You are Silli, the friendly heat-trend assistant for Bicol In-Heat. You have "
    "access to structured data tools and document retrieval context. If you don't "
    "know the answer from the provided tools or context, say so. Do not "
    "hallucinate.\n\n"
    "Rules:\n"
    "- Any number you state must come from a tool result or the document context. "
    "Never estimate or compute a trend yourself.\n"
    "- Drivers are associations from a Random Forest with SHAP attribution, not "
    "proof of causation. Say so when you mention them.\n"
    "- The unit of analysis is a municipality. POWER's ~55 km grid cannot resolve "
    "barangays.\n"
    "- Heat index comes from POWER T2M_MAX plus dew point. Land-surface temperature "
    "(LST) is a different quantity - never call it heat index.\n"
    "- When a tool returns a `summary`, take the count from it. A tool returns a "
    "page, not the whole population.\n"
    "- Keep answers short: at most 6 sentences, or a table of at most 10 rows plus "
    "two sentences. Never restate a whole tool payload.\n"
    "- When presenting data for 3 or more municipalities or data points, ALWAYS "
    "format the output as a valid Markdown table with clear column headers.\n"
    "- Answer in the language the question was asked in.\n"
    "- If the user sends a general greeting or asks who you are (Hi, Hello, "
    "Kamusta, 'what is your name'), introduce yourself as Silli and say you "
    "answer questions about Bicol's heat trends, municipalities, and project "
    "methodology. Do not call any tools for a greeting or identity question."
)

# Greetings and identity questions skip retrieval and tools: no embedding call,
# no irrelevant "Sources" chips (HANDOFF.md once got cited for "what is ur name"),
# one cheap completion.
CHITCHAT = re.compile(
    r"^(hi|hello|hey|kamusta|kumusta|magandang\s+(?:umaga|hapon|gabi)"
    r"|good\s+(?:morning|afternoon|evening)|who are you"
    r"|what(?:'s| is|s)?\s+(?:your|ur)\s+name)\b",
    re.IGNORECASE,
)
# Identity questions skip the pipeline at any length; a greeting only when the
# whole message is short ("Hello, which municipalities are hottest...?" is data).
IDENTITY = re.compile(
    r"^(who are you|what(?:'s| is|s)?\s+(?:your|ur)\s+name)\b", re.IGNORECASE
)

# Columns for ranking (no series, no narration) and for a single lookup (both).
LIST_COLUMNS = (
    "name,province,slope,slope_ci_low,slope_ci_high,p_value,is_significant,"
    "total_danger_days_45y,heat_index_max_c,nighttime_heat_index_c,lst_mean_c,"
    "population_2020,ndvi_mean,person_days_danger,elevation_m,distance_to_coast_km"
)
DETAIL_COLUMNS = (
    LIST_COLUMNS
    + ",change_point_year,peak_danger_year,peak_danger_days,top_drivers,"
    "narration_en,series"
)

_db_client: Any = None
_llm_client: OpenAI | None = None


class QARequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)


class QAResponse(BaseModel):
    answer: str
    sources: list[str]


def _db():
    global _db_client
    if _db_client is None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_KEY")
        if not url or not key:
            raise HTTPException(
                status_code=503,
                detail="Supabase not configured: set SUPABASE_URL and SUPABASE_SERVICE_KEY in apps/api/.env",
            )
        _db_client = create_client(url, key)
    return _db_client


def _llm() -> OpenAI:
    global _llm_client
    if _llm_client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if api_key is None:
            raise ValueError("GROQ_API_KEY is missing from .env")
        _llm_client = OpenAI(base_url=BASE_URL, api_key=api_key)
    return _llm_client


# --------------------------------------------------------------------------- #
# Retrieval
# --------------------------------------------------------------------------- #


def _embed_query(question: str) -> list[float]:
    """Query embeddings must use RETRIEVAL_QUERY, matching the corpus's DOCUMENT task."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Embedding key not configured: set GEMINI_API_KEY in apps/api/.env",
        )
    genai.configure(api_key=api_key)
    delay = 2.0
    for attempt in range(1, RETRIES + 1):
        try:
            response = genai.embed_content(
                model=EMBED_MODEL,
                content=question,
                task_type="RETRIEVAL_QUERY",
                output_dimensionality=EMBED_DIMS,
            )
            return response["embedding"]
        except ResourceExhausted:
            if attempt == RETRIES:
                raise
            time.sleep(delay)
            delay *= 2
    raise RuntimeError("unreachable")


def _retrieve(question: str) -> list[dict]:
    vector = _embed_query(question)
    return (
        _db()
        .rpc(
            "match_documents",
            {
                "query_embedding": json.dumps(vector),
                "match_threshold": MATCH_THRESHOLD,
                "match_count": MATCH_COUNT,
            },
        )
        .execute()
        .data
    )


def _context_block(chunks: list[dict]) -> str:
    if not chunks:
        return "DOCUMENT CONTEXT: none retrieved for this question."
    lines = ["DOCUMENT CONTEXT (name the file when you rely on it):"]
    for index, chunk in enumerate(chunks, 1):
        heading = f" > {chunk['heading']}" if chunk.get("heading") else ""
        lines.append(f"\n[{index}] {chunk['source_path']}{heading}\n{chunk['content']}")
    return "\n".join(lines)


# --------------------------------------------------------------------------- #
# Tools over municipality_trends
# --------------------------------------------------------------------------- #


def _round(value: Any, digits: int) -> float | None:
    return None if value is None else round(float(value), digits)


def _summarise(row: dict, detail: bool = False) -> dict:
    out = {
        "name": row["name"],
        "province": row["province"],
        "slope_c_per_year": _round(row.get("slope"), 4),
        "slope_ci95": [
            _round(row.get("slope_ci_low"), 4),
            _round(row.get("slope_ci_high"), 4),
        ],
        "p_value": row.get("p_value"),
        "is_significant": row.get("is_significant"),
        "total_danger_days_45y": row.get("total_danger_days_45y"),
        "latest_peak_heat_index_c": _round(row.get("heat_index_max_c"), 2),
        "latest_nighttime_heat_index_c": _round(
            row.get("nighttime_heat_index_c"), 2
        ),
        "lst_mean_c": _round(row.get("lst_mean_c"), 2),
        "population_2020": row.get("population_2020"),
        "ndvi_mean": row.get("ndvi_mean"),
        "person_days_danger": row.get("person_days_danger"),
        "elevation_m": row.get("elevation_m"),
        "distance_to_coast_km": row.get("distance_to_coast_km"),
    }
    if detail:
        series = row.get("series") or []
        if series:
            out["first_year"] = {
                "year": series[0]["year"],
                "mean_heat_index_c": series[0].get("mean_heat_index_c"),
            }
            out["latest_year"] = {
                "year": series[-1]["year"],
                "mean_heat_index_c": series[-1].get("mean_heat_index_c"),
                "danger_days": series[-1].get("danger_days"),
            }
        out["change_point_year"] = row.get("change_point_year")
        out["peak_danger_days"] = {
            "year": row.get("peak_danger_year"),
            "days": row.get("peak_danger_days"),
        }
        out["top_drivers"] = row.get("top_drivers") or []
        out["narration_en"] = row.get("narration_en")
    return out


def _find(name: str, province: str | None = None, limit: int = 5) -> list[dict]:
    query = (
        _db()
        .table("municipality_trends")
        .select(DETAIL_COLUMNS)
        .ilike("name", f"%{name}%")
    )
    if province:
        query = query.ilike("province", f"%{province}%")
    rows = query.limit(limit).execute().data
    # Exact name first: "Masbate" should not bury the municipality behind Masbate City.
    rows.sort(key=lambda row: (row["name"].lower() != name.lower(), row["name"]))
    return rows


def tool_get_municipality(name: str, province: str | None = None) -> dict:
    rows = _find(name, province)
    if not rows:
        return {"found": False, "message": f"No municipality matching '{name}'."}
    return {
        "found": True,
        "count": len(rows),
        "municipalities": [_summarise(row, detail=True) for row in rows],
    }


RANK_COLUMNS = {
    "slope": "slope",
    "danger_days": "total_danger_days_45y",
    "heat_index": "heat_index_max_c",
    "nighttime": "nighttime_heat_index_c",
}


def tool_rank_municipalities(
    metric: str = "slope",
    limit: int = 10,
    only_significant: bool = True,
) -> dict:
    column = RANK_COLUMNS.get(metric, RANK_COLUMNS["slope"])
    query = _db().table("municipality_trends").select(LIST_COLUMNS, count="exact")
    if only_significant:
        query = query.eq("is_significant", True)
    shown = max(1, min(limit, 10))  # matches the "table of at most 10 rows" rule
    result = query.order(column, desc=True).limit(shown).execute()
    # The cap must never read as the population size: all 114 rows are significant,
    # and `returned` alone once made the model answer "20 municipalities".
    total = result.count or 0
    return {
        "summary": (
            f"{total} municipalities match"
            + (" (only significant trends)" if only_significant else "")
            + f"; showing the top {len(result.data)} by {metric}."
        ),
        "metric": metric if metric in RANK_COLUMNS else "slope",
        "total_matching": total,
        "municipalities": [_summarise(row) for row in result.data],
    }


def tool_compare_municipalities(names: list[str]) -> dict:
    out = []
    for raw in names[:6]:
        name, _, province = str(raw).partition(",")
        rows = _find(name.strip(), province.strip() or None, limit=1)
        if rows:
            out.append(_summarise(rows[0], detail=True))
        else:
            out.append({"name": raw, "found": False})
    return {"count": len(out), "municipalities": out}


def tool_get_drivers(name: str, province: str | None = None) -> dict:
    rows = _find(name, province, limit=1)
    if not rows:
        return {"found": False, "message": f"No municipality matching '{name}'."}
    row = rows[0]
    return {
        "found": True,
        "name": row["name"],
        "province": row["province"],
        "top_drivers": row.get("top_drivers") or [],
        "note": (
            "Associations from a Random Forest ranked by mean absolute SHAP value. "
            "They describe what co-varies with heat, not what causes it."
        ),
    }


_HANDLERS = {
    "get_municipality": tool_get_municipality,
    "rank_municipalities": tool_rank_municipalities,
    "compare_municipalities": tool_compare_municipalities,
    "get_drivers": tool_get_drivers,
}

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_municipality",
            "description": (
                "Look up one or more municipalities by name. Returns the Theil-Sen "
                "slope, confidence interval, p-value, significance, danger days, "
                "latest heat index, change point and driver ranking, plus population "
                "2020, NDVI mean, person-days of danger, elevation and distance to "
                "coast."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Municipality name, e.g. 'Aroroy'."},
                    "province": {
                        "type": "string",
                        "description": "Optional province, needed when a name exists in two provinces ('Bato', 'San Fernando').",
                    },
                },
                "required": ["name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "rank_municipalities",
            "description": "Rank municipalities by a metric, highest first. Returns the top rows plus `total_matching`, the true number that qualify - quote `total_matching`, never the number of rows shown.",
            "parameters": {
                "type": "object",
                "properties": {
                    "metric": {
                        "type": "string",
                        "enum": ["slope", "danger_days", "heat_index", "nighttime"],
                        "description": "slope = fastest warming (C/yr); danger_days = most days above 42 C; heat_index = hottest latest peak; nighttime = hottest latest nights.",
                    },
                    "limit": {"type": "integer", "description": "How many to return, 1-10."},
                    "only_significant": {
                        "type": "boolean",
                        "description": "Restrict to statistically significant trends (default true).",
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compare_municipalities",
            "description": "Compare two to six municipalities side by side.",
            "parameters": {
                "type": "object",
                "properties": {
                    "names": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Names, optionally 'Name, Province'.",
                    }
                },
                "required": ["names"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_drivers",
            "description": "Driver ranking (Random Forest / SHAP) for one municipality.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "province": {"type": "string"},
                },
                "required": ["name"],
            },
        },
    },
]


def _run_tool(name: str, raw_arguments: str | None) -> str:
    try:
        arguments = json.loads(raw_arguments or "{}")
    except json.JSONDecodeError:
        return json.dumps({"error": f"arguments for {name} were not valid JSON"})
    handler = _HANDLERS.get(name)
    if handler is None:
        return json.dumps({"error": f"unknown tool '{name}'"})
    try:
        return json.dumps(handler(**arguments), default=str)
    except TypeError as exc:
        return json.dumps({"error": f"bad arguments for {name}: {exc}"})
    except Exception as exc:  # a tool failure must not kill the conversation
        return json.dumps({"error": f"{name} failed: {exc}"})


# --------------------------------------------------------------------------- #
# Chat
# --------------------------------------------------------------------------- #


def _chat(messages: list[dict], tools: list[dict] | None):
    """Free slugs rate-limit and get retired; try each model, back off, then fall over."""
    delay = 2.0
    last: Exception | None = None
    for model in (CHAT_MODEL, CHAT_MODEL_FALLBACK):
        for attempt in range(1, RETRIES + 1):
            try:
                response = _llm().chat.completions.create(
                    model=model,
                    messages=messages,
                    tools=tools or None,
                    temperature=0.2,
                    max_tokens=1600,
                    timeout=LLM_TIMEOUT,
                )
                if not response.choices:
                    raise HTTPException(
                        status_code=502, detail="chat provider returned no choices"
                    )
                return response
            except APIConnectionError as exc:  # includes APITimeoutError
                last = exc
                break  # stalled or dropped: next model, not the same one again
            except APIStatusError as exc:
                last = exc
                if attempt == RETRIES or exc.status_code not in RETRY_STATUS:
                    break  # dead slug or exhausted retries -> next model
                time.sleep(delay)
                delay *= 2
    raise HTTPException(status_code=502, detail=f"chat provider error: {last}")


@router.post("/qa", response_model=QAResponse)
def answer(payload: QARequest) -> QAResponse:
    question = payload.question.strip()
    # Normalised copy for the chitchat short-circuit: strip punctuation and
    # lowercase so "Hi!", "hi.", "HEY", "hey there!" all match the greeting
    # regex. The original `question` is unchanged for retrieval and the user
    # message.
    _chitchat_text = question.translate(str.maketrans("", "", string.punctuation)).lower()
    chitchat = bool(IDENTITY.match(question)) or (
        bool(CHITCHAT.match(_chitchat_text)) and len(_chitchat_text) <= 40
    )
    chunks = [] if chitchat else _retrieve(question)
    sources = sorted({chunk["source_path"] for chunk in chunks})

    messages: list[dict] = [
        {
            "role": "system",
            "content": f"{SYSTEM_PROMPT}\n\n{_context_block(chunks)}",
        },
        {"role": "user", "content": question},
    ]

    answer_text: str | None = None
    finish: str | None = None
    for _ in range(MAX_TOOL_ROUNDS):
        choice = _chat(messages, None if chitchat else TOOLS).choices[0]
        message = choice.message
        if not message.tool_calls:
            answer_text = message.content or ""
            finish = choice.finish_reason
            break
        messages.append(
            {
                "role": "assistant",
                "content": message.content or "",
                "tool_calls": [call.model_dump() for call in message.tool_calls],
            }
        )
        for call in message.tool_calls:
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": call.id,
                    "content": _run_tool(call.function.name, call.function.arguments),
                }
            )

    if answer_text is None:  # ran out of rounds: one last call, tools withheld
        choice = _chat(messages, None).choices[0]
        answer_text = choice.message.content or ""
        finish = choice.finish_reason

    if finish == "length" and answer_text.strip():
        # A cut-off table is worse than a short answer, so ask once more, briefer.
        messages.append({"role": "assistant", "content": answer_text})
        messages.append(
            {"role": "user", "content": "Too long - answer in at most 4 sentences."}
        )
        answer_text = _chat(messages, None).choices[0].message.content or answer_text

    if not answer_text.strip():
        answer_text = "I could not produce an answer from the available data."

    return QAResponse(answer=answer_text.strip(), sources=sources)
