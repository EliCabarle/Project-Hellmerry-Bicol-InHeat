# features/chatbot-llm — Agent Guide

> Sub-contract under root `AGENTS.md` + `CONCEPT.md`. **Owner: chatbot-llm feature agent.**
> Feature slice: the narration screen — plain-language "why is this municipality heating," driver ranking display, variable glossary.

## Jurisdiction

- **Owns (write ONLY here):** `features/chatbot-llm/**`.
- **Must NOT touch:** `apps/api/**` (owns LLM build), `apps/web/**`, other feature slices, `core/**`, root docs.
- **Cross-boundary protocol:** request via the lead — never a direct write into another boundary.

## Interface contracts

- **Depends on (read-only):** static-JSON narrative bank (produced by `apps/api` build-time LLM); computed values (drivers, slopes, p-values) as precomputed numbers.
- **Provides:** narration screen + variable-glossary components the web shell mounts.

## Guardrails — project-wide (root AGENTS.md)

- Only CORE items (CONCEPT §8) may be claimed on the project page/video.
- Cut lines h30/h42/h44 are hard. Links resolve logged-out (h44 check).

## Guardrails — this slice

- **No runtime LLM API, no LLM key anywhere** — the narration UI renders the static JSON narrative bank; nothing calls a model at runtime (OUT list, CONCEPT 6d).
- **The LLM never generates numbers** — the renderer displays pre-computed values from the JSON; wording changes are build-time only (fallback path: templates).
- Narration language: EN + Filipino; Bicolano is STRETCH only (needs a native speaker).
- Variable glossary (EN): what it measures, units, why it signals change — pitched at high-school/college users.
- Association, **not causation** wording everywhere drivers are explained (CONCEPT §10-7).
- Root-cause honesty: opposite trends in neighboring municipalities are rendered as pattern, not error.
- Source-cited narration (RAG) is STRETCH per CONCEPT 6d — never claimed as CORE.

## Workboard (editable by owner)

| Item | CORE/STRETCH | Status | Owner |
|---|---|---|---|
| Narration screen (drivers ranked + mitigation list) | CORE | todo | chatbot-llm |
| Narrative-bank JSON renderer | CORE | todo | chatbot-llm |
| Variable glossary (EN) | CORE | todo | chatbot-llm |
| Template fallback (no-LLM wording) | CORE | todo | chatbot-llm |
| Bicolano narration | STRETCH | todo | chatbot-llm |
| Source-cited narration (RAG) | STRETCH | todo | chatbot-llm |

## Status

| Item | Verified? | Notes |
|---|---|---|
| Scaffolding files 0 lines | Verified | checked on disk 2026-11-02 |
| Narrative-bank JSON shape agreed | No | contract with `apps/api` to be locked |
