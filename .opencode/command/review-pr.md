---
description: Review a GitHub pull request by number or URL with specialized reviewer subagents. Optionally focus an area, e.g. /review-pr 12 --focus=security
---

# review-pr — Structured Pull Request Review

## Input

```
/review-pr <PR-number-or-URL> [--focus=<area>]
```

Optional `--focus` narrows the run: `security`, `types`, `tests`, `cleanup`,
`review`, `comment`, `simplify`.

## Process

1. **Fetch the PR**

   - `gh pr view <num>` and `gh pr diff <num>` when `gh` is available (or fetch via API/URL if gh is unavailable).
   - Read the description, changed files list, and key hunks in full.

2. **Dispatch parallel reviewers** (default: all six)

   - `code-reviewer` — general correctness, security, code quality; severity-gated output
   - `comment-analyzer` — comment accuracy/stale/low-value findings
   - `pr-test-analyzer` — test coverage adequacy for the changed surface
   - `silent-failure-hunter` — swallowed errors and unchecked failures
   - `type-design-analyzer` — type precision and soundness of the change
   - `code-simplifier` — complexity and over-engineering in the diff

   When `--focus=<area>` is passed, run only the matching reviewer(s).

3. **Get CI status**

   - `gh pr checks` — report failing checks and tie them to files in the PR.

4. **Consolidate into a single verdict**

   - Merge findings; drop duplicates; apply the >80% confidence gate (drop speculative or unverifiable findings).
   - Highest severity wins the verdict.

## Output

```
## PR #<num> Review — <title>

### Summary
[2-3 sentences]

### Findings
| Severity | Count |
|----------|-------|
| CRITICAL | #     |
| HIGH     | #     |
| MEDIUM   | #     |
| LOW      | #     |

### Verdict
BLOCK | WARN | APPROVE WITH NOTES | APPROVE

### Rationale
[What the verdict is based on]
```

## Verdict Rules

- **BLOCK**: CRITICAL (exploitable security hole, data loss, definite crash)
- **WARN**: HIGH issues that plausibly break user-visible behavior
- **APPROVE WITH NOTES**: MEDIUM/LOW only
- **APPROVE**: clean review, including zero findings