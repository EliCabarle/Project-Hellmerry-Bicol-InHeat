---
description: Review local changes or a GitHub pull request for code quality and security. Optionally pass --severity to filter, e.g. /code-review --severity=HIGH
---

# code-review — Review Local Changes or a PR

Review the current diff or a specific pull request, prioritizing real problems over noise.

## Mode A: Local Changes

1. Run `git diff --stat` to see what changed.
2. Review `git diff` hunks in full; include `git diff --staged` when present.
3. Have the `code-reviewer` subagent run a structured review.
4. Read the surrounding context for each finding — never review a hunk in isolation.

## Mode B: Pull Request

```
/review-pr <PR-number-or-URL> [--focus=<area>]
```

Dedicated flow — see `/review-pr`.

## Severity Filtering

Optional: `/code-review --severity=HIGH` returns only HIGH and CRITICAL findings.

## Severity Level Definitions

- **CRITICAL**: Security vulnerabilities, data loss risk, production-breaking bugs. Block commit.
- **HIGH**: Notable bugs, silent failures, correctness edge cases. Must be fixed or consciously deferred.
- **MEDIUM**: Potential issues, error-handling gaps, minor correctness. Fix if low-risk.
- **LOW**: Style, naming, minor improvements, polish. Optional.

## Report Format

| Severity | Count |
|----------|-------|
| CRITICAL | #     |
| HIGH     | #     |
| MEDIUM   | #     |
| LOW      | #     |

For each finding: `file:line` • what is wrong • why it matters • suggested fix.

**Verdict:** `APPROVE` | `APPROVE WITH NOTES` | `WARN` | `BLOCK`