---
description: Full feature development workflow — plan, explore, architect, implement, review, and summarize. Optionally pass the feature request, e.g. /feature-dev 'add password reset'
---

# feature-dev — Full Feature Development Loop

Run a complete feature cycle for the requested feature. Phases below. The feature request is `$ARGUMENTS` when given; otherwise ask first.

## Phase 1: Discovery

- Restate the feature request to confirm understanding in 1-2 lines.
- List acceptance criteria in bullet form.

## Phase 2: Codebase Exploration

- Dispatch `code-explorer` with targeted context. Focus the exploration on:
  - Existing similar features and their patterns.
  - The components and files the feature will touch.
  - Reusable utilities, hooks, or conventions this project already has.
- Confirm whether the codebase already covers part of this feature; if so, note it as reuse.

## Phase 3: Clarifying Questions (only if blocked)

- Ask only questions that materially change the implementation.
- Skip questions if the feature is clear enough to proceed; do not stall on trivia.

## Phase 4: Architecture Design

- Dispatch `code-architect` to produce the file-level blueprint: new files, modified files, data flow, build order.
- Default to the existing patterns this repo already uses (see `react-architect`).

## Phase 5: Implementation

- Implement file-by-file following the blueprint.
- Use the `pragmatic-coding` skill: keep the change scoped, minimal, and idiomatic to this codebase.
- Update or add tests where the project has a test setup. Use `react-testing` / `tdd-workflow` guidance where relevant.

## Phase 6: Quality Review

- Dispatch `code-reviewer` on the diff.
- Fix CRITICAL and HIGH findings.
- Run `npm run build` and `npx tsc --noEmit` (or the stack's equivalents) to prove the build is green.

## Phase 7: Summary

Summarize:

- What was built (files added/changed).
- Verification performed and its result.
- Known risks or follow-ups.