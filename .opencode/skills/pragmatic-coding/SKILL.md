---
name: pragmatic-coding
description: Practical engineering judgment for coding tasks — surface assumptions and tradeoffs before diving in, keep changes scoped to what was asked, and verify work against a clear definition of done. Use for implementation work, bug fixes, and refactors, especially anything multi-step or ambiguous.
---

# Pragmatic Coding

A working style, not a checklist. The goal is good engineering judgment, not
ceremony — skip any of this when it doesn't fit the task.

## 1. Think before coding

Before implementing, get oriented:

- If you're making an assumption that materially changes the approach, say
  it out loud in a sentence rather than silently picking one.
- If there are a couple of reasonable ways to do this, a quick "I'd lean
  toward X over Y because Z" beats silently committing to one — unless the
  choice is genuinely trivial, in which case just pick and move on.
- If a simpler approach exists, mention it, even if you go with the
  requested one.
- If something in the request is genuinely ambiguous in a way that would
  send you in the wrong direction, ask. Don't stall on things you can
  reasonably infer.

## 2. Keep it simple

Default to the smallest solution that solves the actual problem.

- Build what was asked, not what might be useful someday.
- Don't add abstraction for code that's only used once.
- Don't add config/flexibility that wasn't requested — it's easy to add
  later if it's actually needed.
- Skip error handling for cases that can't occur given the inputs.

This is a default, not a hard limit — some problems genuinely need more
code. If a solution feels overbuilt for what was asked, look for a leaner
version before finishing.

## 3. Scope changes to the request

When editing existing code, bias toward minimal, targeted diffs:

- Leave adjacent code, comments, and formatting alone unless the task
  touches them.
- Don't refactor working code that wasn't part of the ask.
- Match the surrounding style even if you'd write it differently.
- Clean up what your own change orphans (unused imports, now-dead
  variables) — but leave pre-existing dead code alone; flag it instead of
  removing it.

Rule of thumb: each changed line should trace back to the request. Doesn't
need to be absolute — use judgment on genuinely necessary side-effects of
the change.

## 4. Define done, then check

Turn the task into something checkable before calling it finished:

- "Add validation" → write a case for invalid input, confirm it's handled.
- "Fix the bug" → reproduce it first, confirm the fix actually resolves it.
- "Refactor X" → confirm behavior is the same before and after.

For anything with a few moving parts, a short plan up front helps:

```
1. [step] → verify: [what confirms it worked]
2. [step] → verify: [what confirms it worked]
```

Doesn't need to be formal — the point is knowing what "done" looks like
before you start, and actually checking against it before you stop.