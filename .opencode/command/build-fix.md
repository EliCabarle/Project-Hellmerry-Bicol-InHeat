---
description: Diagnose and fix build errors after a failed build or typecheck
---

# build-fix — Diagnose and Fix Build Failures

## Trigger

Run when the production build or typecheck is failing and the reason is not obvious.

## Detect the Build System

- `package.json` present in the root → Node. Run `npm run build`, check for `tsconfig.json` → `npx tsc --noEmit`.
- `Cargo.toml` → Rust: `cargo build`
- `go.mod` → Go: `go build ./...`
- `pom.xml` / `build.gradle` → Java: project build script
- `requirements.txt` / `pyproject.toml` → Python: `pip install -r requirements.txt`, `python -m build`

## Diagnose

1. Run the detected build to reproduce the exact error.
2. Capture and classify the error (module resolution, type error, syntax, import boundary, dependency conflict).
3. Read the surrounding code — find the true root cause, not the first symptom.

## Fix

- Apply a minimal root-cause fix.
- Re-run the same build command to verify.
- Do **not** silence errors with `@ts-expect-error`, `// @ts-ignore`, or '// eslint-disable' band-aids unless there is no honest fix.

## Guardrails

- Stop after **3 failed fix attempts** or when the next step changes architecture.
- If a missing dependency is the cause, ask before `npm install <pkg>`.
- For wide-reaching refactors, propose the plan instead of executing it. See `/plan`.