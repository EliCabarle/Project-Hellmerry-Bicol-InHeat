# opencode Boilerplate — `.opencode/`

A reusable opencode harness for the Pharmacy Web Application project, ported
from the older `.claude/` configuration. The `.claude/` folder is left intact
for Claude Code usage; **opencode** is the active harness and is configured
entirely from this directory.

## Why this exists

Portable, self-contained opencode setup: agent library, slash commands,
skills, guardrails plugin, and project memory. Copy it into any new project
(alongside this file) to inherit the same working conventions.

## Structure

```
.opencode/
├── opencode.json          # Config: plugins, permissions, formatter, snapshot
├── AGENTS.md              # Project memory loaded into every session
├── README.md              # This file
├── agent/                 # 20 subagents for the `task` tool
├── command/               # 11 slash commands (/plan, /code-review, ...)
├── skills/                # 16 skills auto-surfaced to the model
├── plugin/guardrails.js   # Local guardrails plugin (auto-loaded)
├── scripts/
│   └── copy-boilerplate.ps1  # Copies this harness to a new project
└── sessions/              # Bounded session-memory notes (gitignored by guardrails)
```

## Agents (20)

**Ports from `.claude/agents/` (15):**

| Agent | Role |
|-------|------|
| `planner` | Implementation plans, phases, risks, success criteria |
| `architect` | System architecture, trade-offs, ADRs |
| `code-architect` | Feature blueprint matching existing repo patterns |
| `code-explorer` | Deep codebase analysis before new work |
| `code-reviewer` | Structured code review with severity gates |
| `code-simplifier` | Reduce complexity without behavior change |
| `refactor-cleaner` | Dead-code removal with SAFE/CAUTION/DANGER tiers |
| `comment-analyzer` | Comment accuracy / staleness / low-value detection |
| `database-reviewer` | PostgreSQL/Supabase: queries, schema, RLS, performance |
| `tdd-guide` | RED-GREEN-REFACTOR discipline |
| `a11y-architect` | WCAG 2.2 AA audit + remediation |
| `react-architect` | React implementation strategy (state, files, data model) |
| `react-reviewer` | React hooks/performance/a11y review |
| `react-build-resolver` | Vite/TS build failure diagnostics + fix loop |
| `build-error-resolver` | Stack-agnostic build error resolver |

**New for opencode (5):**

| Agent | Role |
|-------|------|
| `typescript-reviewer` | Type soundness, `any` leaks, unsafe casts |
| `security-reviewer` | OWASP-aligned + Supabase RLS security review |
| `pr-test-analyzer` | Test coverage adequacy for PR diffs |
| `silent-failure-hunter` | Swallowed errors, unchecked responses, silent UI failures |
| `type-design-analyzer` | Discriminated unions, branded types, type precision |

All agents carry the same Prompt Defense Baseline footer from the originals.

## Commands (11)

`/plan`, `/code-review`, `/build-fix`, `/feature-dev`, `/react-build`,
`/react-review`, `/react-test`, `/refactor-clean`, `/aside`,
`/build-analytics`, `/review-pr`

Docs live in `command/`. Some persist to `.opencode/plans/` and
`.opencode/reviews/`.

## Skills (16)

13 ports from `.claude/skills/`: accessibility, dashboard-builder,
database-migrations, frontend-a11y, frontend-design-direction,
frontend-patterns, frontend-slides, react-native-patterns, react-patterns,
react-performance, react-testing, tdd-workflow, vite-patterns.

3 converted to `SKILL.md`: `supabase-crud`, `recharts-olap` (from orphan
`instructions.md` files), and `pragmatic-coding` (root skill).

Excluded: `ecc-guide`, `ecc-recipes` — they document the ECC repo itself, not
importable project workflow.

## Plugins

Personal plugins live in the global config (`~/.config/opencode/`), not here, so
one machine-wide install serves every project and no boilerplate copy can drift
out of date:

- `~/.config/opencode/plugins/helicone-session.js` — Helicone session tracking
- `opencode-wakatime` — editor time tracking (in global `opencode.jsonc`)
- `@dietrichgebert/ponytail` — agent working-style plugin (in global `opencode.jsonc`)
- `@upstash/context7-opencode` — docs MCP (in global `opencode.jsonc`)

The project `opencode.json` intentionally lists no plugins. To use
GitHub-sourced plugins, add them to the global `opencode.jsonc` (forms:
`github:owner/repo`, `git+https://...git#tag`,
`github:owner/repo#branch::path:sub/dir`). Any entry can be disabled by
prefixing `-`.

**Do not** add the `opencode-helicone-session` npm package back anywhere: v1.0.1
(latest) default-exports the OpenCode 1.x plugin function shape, so OpenCode 2.x
rejects it with *"Plugin must export a default definition with an id and an
effect or setup function"* and the plugin never runs. The global
`helicone-session.js` is a V2 port of it.

**Local guardrails plugin** — `.opencode/plugin/guardrails.js` (auto-loaded,
no need to list it):

- Warns when edits introduce `console.log` / `debugger` / `TODO` / `FIXME`
- Best-effort `npx tsc --noEmit` after edits to `.ts`/`.tsx` files (only when
  a local `tsc` exists; timed out after 30s)
- Writes bounded session checkpoints to `.opencode/sessions/` (kept to 30)

Env-var opt-outs: `OPENCODE_GUARD_WARN_DEBUG=0`, `OPENCODE_GUARD_WARN_TODO=0`,
`OPENCODE_GUARD_TSC=0`, `OPENCODE_GUARD_NOTES=0`,
`OPENCODE_GUARD_TSC_TIMEOUT=<ms>`, `OPENCODE_GUARD_QUIET=1`.

## Porting notes (Claude Code → opencode)

- Agent frontmatter: `mode: subagent`; removed `model: sonnet|opus|haiku`;
  `tools:` → `permission` (`edit: deny` on the 14 read-only reviewers);
  `CLAUDE.md` → `AGENTS.md`.
- Hooks: opencode has no `.claude/hooks/hooks.json` shell system; the
  equivalent is the local JS plugin in `plugin/`. Memory-persistence and
  tmux/dev-server hooks were intentionally not ported — they depended on the
  ECC plugin.
- Command frontmatter is `description` only; `$ARGUMENTS` works identically.
- `.claude/plans` / `.claude/reviews` artifact paths moved to `.opencode/`.

## Copying to a new project

```powershell
# From Windows PowerShell, inside this project:
.\ .opencode\scripts\copy-boilerplate.ps1 -Target C:\path\to\new-project
```

The script copies `.opencode/` (excluding `sessions/` and `node_modules/`) and
optionally installs the default plugins. After copying, edit `opencode.json`
(plugins) and `AGENTS.md` (stack/layout) to match the target project.

## Restart required

`opencode.json` and plugins are read once at startup. **Restart opencode**
after editing this directory's config. `plugin/` files and new commands/agents
are picked up on restart or per session as documented.