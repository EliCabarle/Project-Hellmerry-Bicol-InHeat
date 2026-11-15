---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 0
total_count: 1
last_updated: 2026-11-15T06:28:49.432Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | deviation | apps/web/src/app.jsx |  | Matrix row 3 'select a municipality' exercised via the showOnMap selection write (the plan's designated C-02 path); an on-map polygon click does not write #muni= because BicolMap selection is internal and features/ is out of write boundary (C-01) - would need a shell callback prop on features/map-controls/src/BicolMap.jsx (lead decision) | open |  | 2026-11-15T06:28:49.432Z |  |

````json
[
  {
    "id": 1,
    "kind": "deviation",
    "phase": "01",
    "file": "apps/web/src/app.jsx",
    "line": null,
    "description": "Matrix row 3 'select a municipality' exercised via the showOnMap selection write (the plan's designated C-02 path); an on-map polygon click does not write #muni= because BicolMap selection is internal and features/ is out of write boundary (C-01) - would need a shell callback prop on features/map-controls/src/BicolMap.jsx (lead decision)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-11-15T06:28:49.432Z",
    "resolved_at": null,
    "milestone": null
  }
]
````
