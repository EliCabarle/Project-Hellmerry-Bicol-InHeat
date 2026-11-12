---
description: Review React components after implementation for hooks correctness, performance, accessibility, and correctness using the react-reviewer and typescript-reviewer subagents
---

# react-review — Review React Code

## Trigger

Run after writing or modifying React components to check hooks, performance, accessibility, and type correctness.

## Process

1. Dispatch `react-reviewer` subagent on the changed components.
2. Dispatch `typescript-reviewer` subagent on the typed code.
3. Combine findings into one report.

## Review Areas

- **Hooks & state**: dependency arrays, render-phase state updates, selector misuse
- **Accessibility**: keyboard operability, labels, ARIA, focus, WCAG contrast
- **Performance**: re-render hotspots, list keys, missing memoization where the codebase uses it
- **Type soundness**: `any` leaks, unsafe casts, `@ts-ignore` misuse

## Tooling

When eslint is configured with `plugin:react-hooks` + `eslint-plugin-jsx-a11y`, run:
`npx eslint . --rule 'react-hooks/exhaustive-deps: error'`

## Report

Severity table (CRITICAL/HIGH/MEDIUM/LOW) with `file:line` findings and a final verdict.

Fix CRITICAL and HIGH findings. Re-run `npm run build` after fixes.