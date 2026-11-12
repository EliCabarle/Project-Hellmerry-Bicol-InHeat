---
description: Diagnose and fix React/TypeScript/Vite build failures via the react-build-resolver subagent
---

# react-build — React Build Failure Resolver

## Trigger

Run when a React, TypeScript, or Vite build fails.

## Process

1. Dispatch `react-build-resolver` subagent with the error output.
2. The resolver:
   - Replicates the error (`npm run build` / `npx tsc --noEmit`).
   - Classifies the error class (module resolution, type, syntax, import boundary, OOM, missing plugin).
   - Finds the root cause, including reading the failing module's imports.
   - Applies the smallest honest fix.
   - Re-runs the build until green.

## Verification Events

After the resolver produces the fix:
- Re-run `npm run build` to confirm a green build.
- Re-run `npx tsc --noEmit` to confirm the typecheck passes.

## Guardrails

- Stop if the fix requires installing a missing dependency → ask first.
- Stop if a wide-reaching refactor is required → switch to `/plan`.