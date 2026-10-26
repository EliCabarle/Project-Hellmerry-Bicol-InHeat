---
description: Clean up dead code, unused exports, and unused dependencies with safety tiers (SAFE/CAUTION/DANGER) and a rollback loop
---

# refactor-clean — Clean Up Dead Code and Unused Dependencies

## Trigger

Run on request to remove dead code, unused exports, and unused dependencies from the project.

## Detect Unused Code

Run the appropriate tool for the stack:

```
npx knip            # JS/TS — modern
npx depcheck        # JS — dependency checker fallback
npx ts-prune        # TS — unused exports
npx unimported      # TS — unreferenced files
cargo udeps         # Rust — unused deps
vulture .           # Python — dead code
```

If `knip` is not installed, do not auto-install; fall back to manual trace:
`rg` for each candidate symbol's references across the repo.

## Safety Tiers

- **SAFE to remove** — zero references anywhere in the repo, not loaded dynamically, not part of a documented public contract
- **CAUTION** — referenced only in comments, tests, or dead branches. Verify before removing.
- **DANGER** — references exist but appear unused (config, dynamic import, mirror contract). Investigate, do not just delete.

## Deletion Loop

1. Identify the removal candidate and its tier.
2. Delete the smallest safe unit (one export, one import, one branch).
3. Re-run the build/typecheck: `npm run build` + `npx tsc --noEmit`.
4. If the build breaks, `git checkout <file>` to restore and reclassify the candidate as DANGER.
5. Repeat per candidate — delete only what is provably dead.

## Guardrails

- Do not remove code that is exported as a public/documented API.
- Do not touch `.env` keys or schema columns — flag them, don't delete.
- After cleanup, run the project's test suite if one exists.