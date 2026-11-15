"""Chunk the repo's markdown into embedded passages for the QA chatbot's RAG half.

The chatbot answers from two sources: structured rows via function calling, and
prose via vector search. This script builds the second one - it slices every
markdown file into heading-scoped passages, embeds them with Google
`gemini-embedding-001` truncated to 1536 dims (matching `vector(1536)` in migration
0005), and writes them to `qa_documents` / `qa_chunks`.

Sizing: ~700 tokens per chunk with ~100 tokens of overlap. Token counts are
estimated at 4 characters per token rather than tokenised exactly - the target is
700 against a model limit of 8191, so the estimate cannot cause a rejection, and
it keeps `tiktoken` out of the dependency list.

`--dry-run` needs no credentials and writes nothing.

Usage:
  python embed_documents.py --dry-run
  python embed_documents.py
  python embed_documents.py --dry-run --sample 5
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import time
from pathlib import Path

import google.generativeai as genai
from dotenv import load_dotenv
from google.api_core.exceptions import ResourceExhausted
from supabase import create_client

ROOT = Path(__file__).resolve().parent
ENV_FILE = Path(__file__).resolve().parents[2] / ".env"  # repo root
REPO = ROOT.parent.parent

CHARS_PER_TOKEN = 4
CHUNK_TOKENS = 700
OVERLAP_TOKENS = 100
MIN_TOKENS = 40  # below this a passage is a stray heading or a one-liner; it only adds noise
BATCH = 25  # free tier is 100 requests/min; 25 chunks/request keeps 200 chunks at 8 requests
RETRIES = 5

EMBED_MODEL = "models/gemini-embedding-001"
EMBED_DIMS = 1536

SKIP_DIRS = {".git", "node_modules", ".opencode", ".graphify", "graphify-out", ".planning", "dist", "build", ".venv"}
# Internal process docs, not method documentation. They leak cut lines and
# agent instructions into a public retrieval corpus, and `_context_block` pastes
# chunk text straight into the system prompt - an injection surface.
SKIP_FILES = {
    "agents.md",
    "handoff.md",
    "changelog.md",
    "concept.md",
    # Internal notes: PITCH_STATS carries pipeline numbers (the system prompt
    # forbids values from document context), PLANCONTINUATION is session state.
    "pitch_stats.md",
    "plancontinuation.md",
}
SKIP_PREFIXES = ("features/",)
HEADING = re.compile(r"^(#{1,6})[ \t]+(.+?)[ \t]*$", re.MULTILINE)
H1 = re.compile(r"^#[ \t]+(.+?)[ \t]*$", re.MULTILINE)


def estimate_tokens(text: str) -> int:
    return max(1, len(text) // CHARS_PER_TOKEN)


def corpus() -> list[Path]:
    """Every non-empty markdown file, minus generated, tooling and internal docs."""
    found = []
    for dirpath, dirnames, filenames in os.walk(REPO):
        dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS)
        for name in filenames:
            if not name.endswith(".md"):
                continue
            path = Path(dirpath) / name
            rel = path.relative_to(REPO).as_posix().lower()
            if name.lower() in SKIP_FILES or rel.startswith(SKIP_PREFIXES):
                continue
            if path.stat().st_size:
                found.append(path)
    return sorted(found, key=lambda p: str(p.relative_to(REPO)).lower())


def sections(text: str):
    """Yield (heading breadcrumb, body) per markdown heading."""
    marks = list(HEADING.finditer(text))
    if not marks:
        yield None, text.strip()
        return

    preamble = text[: marks[0].start()].strip()
    if preamble:
        yield None, preamble

    stack: list[tuple[int, str]] = []
    for index, mark in enumerate(marks):
        level = len(mark.group(1))
        while stack and stack[-1][0] >= level:
            stack.pop()
        stack.append((level, mark.group(2)))
        end = marks[index + 1].start() if index + 1 < len(marks) else len(text)
        body = text[mark.end() : end].strip()
        if body:
            yield " > ".join(title for _, title in stack), body


def windows(body: str) -> list[str]:
    """Split an oversized section into overlapping windows, preferring line breaks."""
    if estimate_tokens(body) <= CHUNK_TOKENS:
        return [body]

    span = CHUNK_TOKENS * CHARS_PER_TOKEN
    overlap = OVERLAP_TOKENS * CHARS_PER_TOKEN
    out: list[str] = []
    start = 0
    while start < len(body):
        end = min(start + span, len(body))
        if end < len(body):
            floor = start + int(span * 0.6)
            cut = body.rfind("\n\n", floor, end)
            if cut == -1:
                cut = body.rfind("\n", floor, end)
            if cut > start:
                end = cut
        piece = body[start:end].strip()
        if piece:
            out.append(piece)
        if end >= len(body):
            break
        start = max(end - overlap, start + 1)
    return out


def chunks_for(path: Path) -> tuple[str, list[dict]]:
    text = path.read_text(encoding="utf-8")
    h1 = H1.search(text)
    title = h1.group(1).strip() if h1 else path.stem
    chunks = []
    for heading, body in sections(text):
        for piece in windows(body):
            embed_text = f"{heading}\n\n{piece}" if heading else piece
            tokens = estimate_tokens(embed_text)
            if tokens < MIN_TOKENS:
                continue
            chunks.append(
                {
                    "heading": heading,
                    "content": piece,
                    "embed_text": embed_text,
                    "token_count": tokens,
                }
            )
    return title, chunks


def collect() -> list[tuple[Path, str, list[dict]]]:
    return [(path, *chunks_for(path)) for path in corpus()]


def report(entries: list[tuple[Path, str, list[dict]]], sample: int) -> None:
    total = sum(len(chunks) for _, _, chunks in entries)
    print(f"{'file':<46}{'chunks':>7}{'tokens':>9}")
    print("-" * 62)
    for path, _, chunks in entries:
        tokens = sum(c["token_count"] for c in chunks)
        print(f"{str(path.relative_to(REPO)).replace(chr(92), '/'):<46}{len(chunks):>7}{tokens:>9}")
    print("-" * 62)
    print(f"{'TOTAL':<46}{total:>7}{sum(c['token_count'] for _, _, cs in entries for c in cs):>9}")

    flat = [(path, c) for path, _, chunks in entries for c in chunks]
    if not flat:
        return

    sizes = sorted(c["token_count"] for _, c in flat)
    bands = [(0, 200), (200, 400), (400, 600), (600, 800), (800, 10**9)]
    print("\nsize distribution (estimated tokens)")
    for low, high in bands:
        count = sum(1 for s in sizes if low <= s < high)
        label = f"{low}-{high}" if high < 10**9 else f"{low}+"
        print(f"  {label:>8}  {count:>4}  {'#' * max(1, round(count / 2)) if count else ''}")
    print(
        f"  min {sizes[0]}  median {sizes[len(sizes) // 2]}  "
        f"max {sizes[-1]}  mean {sum(sizes) // len(sizes)}"
    )

    if sample <= 0:
        return

    picks = {0, len(flat) // 2, len(flat) - 1} if sample == 3 else {
        round(i * (len(flat) - 1) / max(sample - 1, 1)) for i in range(sample)
    }
    print(f"\n=== {len(picks)} sample chunks of {total} ===")
    for index in sorted(picks):
        path, chunk = flat[index]
        rel = str(path.relative_to(REPO)).replace("\\", "/")
        print(f"\n[{index}] {rel}")
        print(f"    heading : {chunk['heading'] or '(preamble)'}")
        print(f"    tokens  : ~{chunk['token_count']}   chars: {len(chunk['content'])}")
        preview = chunk["content"]
        print("    ---")
        for line in preview.splitlines()[:18]:
            print("    " + line[:150])
        if len(preview.splitlines()) > 18:
            print(f"    ... (+{len(preview.splitlines()) - 18} more lines, {len(preview) - sum(len(l) + 1 for l in preview.splitlines()[:18])} chars)")


def embed_batch(texts: list[str]) -> list[list[float]]:
    delay = 2.0
    for attempt in range(1, RETRIES + 1):
        try:
            response = genai.embed_content(
                model=EMBED_MODEL,
                content=texts,
                task_type="RETRIEVAL_DOCUMENT",
                output_dimensionality=EMBED_DIMS,
            )
            break
        except ResourceExhausted:
            if attempt == RETRIES:
                raise
            print(f"    rate limited, retrying in {delay:.0f}s", flush=True)
            time.sleep(delay)
            delay *= 2

    vectors = response["embedding"]
    if len(vectors) != len(texts):
        raise RuntimeError(f"asked for {len(texts)} embeddings, got {len(vectors)}")
    if len(vectors[0]) != EMBED_DIMS:
        raise RuntimeError(f"expected {EMBED_DIMS} dims, got {len(vectors[0])}")
    return vectors


def store(client, path: Path, title: str, chunks: list[dict]) -> str:
    relative = str(path.relative_to(REPO)).replace("\\", "/")
    digest = hashlib.sha256(path.read_bytes()).hexdigest()

    existing = (
        client.table("qa_documents")
        .select("id,sha256")
        .eq("source_path", relative)
        .execute()
        .data
    )
    if existing and existing[0]["sha256"] == digest:
        return "unchanged"

    client.table("qa_documents").upsert(
        {"source_path": relative, "title": title, "sha256": digest},
        on_conflict="source_path",
    ).execute()
    document_id = (
        client.table("qa_documents")
        .select("id")
        .eq("source_path", relative)
        .execute()
        .data[0]["id"]
    )
    client.table("qa_chunks").delete().eq("document_id", document_id).execute()

    rows = []
    for offset in range(0, len(chunks), BATCH):
        batch = chunks[offset : offset + BATCH]
        vectors = embed_batch([c["embed_text"] for c in batch])
        for chunk, vector in zip(batch, vectors):
            rows.append(
                {
                    "document_id": document_id,
                    "chunk_index": len(rows),
                    "heading": chunk["heading"],
                    "content": chunk["content"],
                    "token_count": chunk["token_count"],
                    # pgvector's text input format; a JSON array would not cast.
                    "embedding": json.dumps(vector),
                }
            )
        print(f"    {len(rows)}/{len(chunks)} embedded")
    client.table("qa_chunks").insert(rows).execute()
    return f"{len(rows)} chunks"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--sample", type=int, default=3)
    args = parser.parse_args()

    entries = collect()
    report(entries, args.sample)
    if args.dry_run:
        print("\n--dry-run: nothing embedded, nothing written")
        return

    load_dotenv(ENV_FILE)
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    client = create_client(
        os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"]
    )
    print()
    started = time.time()
    for path, title, chunks in entries:
        print(f"{str(path.relative_to(REPO)).replace(chr(92), '/'):<46}", end=" ", flush=True)
        print(store(client, path, title, chunks))

    # `store` only upserts, so a document that dropped out of the corpus (an
    # internal process doc, a moved file) would keep its chunks retrievable
    # forever. qa_chunks.document_id is `on delete cascade`, so this prunes both.
    indexed = {str(path.relative_to(REPO)).replace("\\", "/") for path, _, _ in entries}
    stale = [
        row
        for row in client.table("qa_documents").select("id,source_path").execute().data
        if row["source_path"] not in indexed
    ]
    for row in stale:
        client.table("qa_documents").delete().eq("id", row["id"]).execute()
        print(f"pruned {row['source_path']}")

    total = (
        client.table("qa_chunks").select("id", count="exact").limit(1).execute().count
    )
    documents = (
        client.table("qa_documents").select("id", count="exact").limit(1).execute().count
    )
    print(
        f"\nqa_documents: {documents}   qa_chunks: {total}   "
        f"elapsed {time.time() - started:.0f}s"
    )


if __name__ == "__main__":
    main()
