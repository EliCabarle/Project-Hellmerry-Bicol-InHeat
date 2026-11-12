---
description: Create a detailed implementation plan for a code feature or refactor using the planner subagent. Optionally persist to .opencode/plans/, e.g. /plan 'stripe billing' --persist
---

# plan — Create an Implementation Plan

## Trigger

Use when the user requests a feature implementation, architectural change, or complex refactoring.

## Input

`/plan <feature-or-task-name>` — prompt with the known requirements.

## Process

1. Dispatch the `planner` subagent with the feature name and requirements.
2. The planner analyzes requirements and produces:
   - Requirements
   - Architecture changes (file paths)
   - Phase-based implementation steps
   - Testing strategy
   - Risks & mitigations
   - Success criteria

## Optional: Persist to Disk

`--persist` writes the plan to `.opencode/plans/<name>.md` so it can be re-loaded later.

## Guidance

Run **inline by default**. Do not call the `task` tool or any subagent besides
`planner` unless explicitly asked. Keep the plan as the deliverable.