# PLANCONTINUATION — Session Handoff: Canva Layout Integration → main

> Created by the outgoing session (2026-11-14) after verifying every claim below against the disk.
> Goal of a NEW session: resume with **zero re-discovery** and land `frontend/canva-layout-integration` onto `main`.

## 1. Situation summary

The branch `frontend/canva-layout-integration` carries the "canva layout" UI work (floating NavBar, AppMenu, account/settings screens, chatbot modal, dashboard focus-tab contract). Phase 1 (a11y fixes) is committed as `1596a71`, Phase 2 (merge of `main`, one conflict in `apps/web/src/app.jsx` header resolved taking OURS — branch NavBar wins per lead decision) is committed as `992a0e6`. Phase 3 — quest-model unification (pending→submit model from `main`), the `--bih-nav-clear` clearance variable, alpha-card/`bih-btn` token adoption, and a critical missing-`useEffect`-import crash fix — is **applied to disk but NOT committed** (12 modified files, +220/−154). All automated verification passed: esbuild parse of touched JSX, `npm run build` green, 22/22 unit tests, prod headless-Chrome smoke with 0 uncaught errors, and the map-screen quests popover visually verified working (5/5 CSV quests render; the user's "lost daily quests" report was NOT reproduced on the map screen). What remains: browser-verify menu → dashboard → Quests tab (the one probe that failed, likely a probe-target bug not an app bug), commit Phase 3, push the branch, fast-forward `main`, update HANDOFF.md, clean up processes, then have the user re-test quests in their own browser.

## 2. Exact git state (verified 2026-11-14)

- **Remote:** `https://github.com/EliCabarle/NASA-ProjectHellMerry.git`
- **Current branch:** `frontend/canva-layout-integration` @ `992a0e6` — **ahead of `origin/frontend/canva-layout-integration` (tip `4a17e35`) by 34 commits** (never pushed since).
- **`main`:** `fc0c3f7` locally and on origin. `git merge-base main frontend/canva-layout-integration` = `fc0c3f7` → **main is an ancestor of the branch tip → the merge in step 4 will be a fast-forward.**
- **Phase 1 commit:** `1596a71` — `feat(ui): canva layout - floating NavBar, AppMenu, account/settings screens, chatbot modal, dashboard focus-tab contract`
- **Phase 2 commit:** `992a0e6` — `Merge branch 'main' into frontend/canva-layout-integration` (single conflict in `apps/web/src/app.jsx` header block, resolved taking OURS; integrity greps confirmed the `focusTab` contract survived in `DashboardScreen.jsx`).
- **Phase 3 — UNCOMMITTED, 12 modified files (matches `git status` exactly, `git diff --stat`: 12 files, +220/−154):**

| File | Phase-3 change |
|---|---|
| `apps/web/src/index.css` | `--bih-nav-clear` fallback `calc(5.25rem+env(safe-area-inset-top))` |
| `apps/web/src/components/NavBar.jsx` | rewritten: publishes `--bih-nav-clear` (rect.bottom+12) via ResizeObserver, `bg-[rgba(13,20,30,var(--alpha-header))]`, `.bih-btn` menu button |
| `apps/web/src/app.jsx` | dead `SCREENS` removed, user-keyed `createProgress({userId})`, `bih-progress` listener, `handleSignIn` gains `queryParams:{prompt:'select_account'}`, spacer uses var, QuestsPopover gets `userId`/`onChanged`; **CRITICAL: `useEffect` added to the React import (line 1 verified on disk — the missing import caused a `ReferenceError: useEffect is not defined` crash)** |
| `features/gamified-dashboard/src/DashboardScreen.jsx` | 3× `window.dispatchEvent(new Event('bih-progress'))` in act/checkIn/restoreTo |
| `features/gamified-dashboard/index.js` | exports `parseQuestCsv` |
| `apps/web/src/components/QuestsPopover.jsx` | full rewrite to main's pending→submit quest model (`createProgress({userId, catalog})`, `getPending`/`togglePending`/`submitQuest`, `derive().todayTotal`, module-level CSV cache, min-h-11 rows, `.bih-btn` trigger) |
| `apps/web/src/components/AppMenu.jsx` | panel `bg-[rgba(13,20,30,var(--alpha-card))]`, dead `MENU_BTN` deleted, rows intentionally NOT `.bih-btn` (commented) |
| `features/chatbot-llm/src/ChatbotModal.jsx` | alpha-card surface, `.bih-btn` buttons, 11px/slate-400 microcopy |
| `features/map-controls/src/components/MapControlsOverlay.jsx` | row compensates root p-3 with `pt-[calc(var(--bih-nav-clear)-12px)]` |
| `features/map-controls/src/components/MunicipalityIndex.jsx` | single `--bih-nav-clear` var at all widths |
| `features/map-controls/src/components/MunicipalityLegend.jsx` | mobile clearance var |
| `features/map-controls/src/BicolMap.jsx` | first banner ~line 631 uses clearance var |

Note: git prints LF→CRLF warnings for `app.jsx`, `NavBar.jsx`, `QuestsPopover.jsx` — normal for this repo, not a problem.

## 3. Verified vs unverified

| Item | Status | Evidence |
|---|---|---|
| Phase 1 + Phase 2 commits exist | ✅ verified | `git log --oneline`: `1596a71`, `992a0e6` |
| `useEffect` import fix on disk | ✅ verified | `app.jsx` line 1 includes `useEffect` |
| esbuild parse of all Phase-3-touched JSX | ✅ done (do not repeat) | exit 0 |
| `npm run build` in `apps/web` | ✅ done (do not repeat) | GREEN ~11.6s; known >500 kB chunk warning only |
| 22 unit tests (`node test_*.mjs` across the 4 feature dirs) | ✅ done (do not repeat) | 22/22 PASS |
| Prod smoke (`npm run preview`, port 4199) | ✅ done (do not repeat) | 0 uncaught errors; navbar/menu/quests trigger/FAB render |
| Map-screen quests popover | ✅ verified visually | `%TEMP%\bih-quests.png`: 0/100 HP navbar, "TODAY'S QUESTS" popover with all 5 CSV quests (Combine Errands 5HP, Unplug Vampire 1HP, Public Transport 19HP, Gardening 16HP, Rainwater 21HP); CDP: trigger `Quests 0/5`, 5 rows, `/data/eco_quests_tasks.csv` HTTP 200, present in `apps/web/dist/data/` |
| Menu → Dashboard navigation | ❌ **UNVERIFIED** | `%TEMP%\opencode\dashprobe.mjs` returned `menuRows: []`, `dashboardH1: undefined` — likely probe picked wrong page target (`targets.find(t=>t.type==='page')`), or 400 ms too short; diagnose before assuming an app bug |
| Dashboard Quests tab (5 quests, pending→Submit→Recorded) | ❌ **UNVERIFIED** | source-confirmed only: `DashboardScreen.jsx` renders `QuestsTab` (line 775), `store.getDailyQuests()` (line 135), fetches `/data/eco_quests_tasks.csv` (line 90) |
| User's "lost daily quests" report | ⚠️ not reproduced on map screen | if dashboard probes show quests missing there, that's the real bug — reconcile against the working map popover |
| Full test sweeps this session | 🚫 policy | user wants build + ONE targeted browser smoke per session; no full sweeps unless code in a tested area changed |

## 4. Ordered next steps (exact commands)

Run from `C:\Users\winst\Desktop\NASA`. Do steps in order; do not skip the verification in step 1 before committing in step 2.

**1. Finish browser verification of menu → dashboard → Quests tab.**
- Fix the probe first: in `%TEMP%\opencode\dashprobe.mjs` (and `menudiag.mjs`), select the CDP page target whose `url` includes `4199` (close/ignore other tabs) and raise the post-click wait above 400 ms. Screenshot pattern to reuse: `%TEMP%\opencode\questsprobe.mjs` (`Page.captureScreenshot`).
- If probes stay flaky: note it, then verify manually with `npm run dev` (dev port 4200). Confirm: menu opens → Dashboard → Quests tab lists 5 quests → pending → Submit → Recorded.
- Fix any real bug found. If nothing is broken, proceed — probes being flaky is not a blocker for the commit.

**2. Commit Phase 3 on the branch.**
```powershell
git status                      # expect exactly the 12 files in section 2, nothing else
git diff                        # review the uncommitted Phase 3 diff
git add apps/web/src/app.jsx apps/web/src/components/AppMenu.jsx apps/web/src/components/NavBar.jsx apps/web/src/components/QuestsPopover.jsx apps/web/src/index.css features/chatbot-llm/src/ChatbotModal.jsx features/gamified-dashboard/index.js features/gamified-dashboard/src/DashboardScreen.jsx features/map-controls/src/BicolMap.jsx features/map-controls/src/components/MapControlsOverlay.jsx features/map-controls/src/components/MunicipalityIndex.jsx features/map-controls/src/components/MunicipalityLegend.jsx
git commit -m "feat(ui): unify quest model + nav-clear var + alpha tokens"
```
(Commit style check first: `git log --oneline -10` — repo uses `feat(scope): …` lowercase conventional-ish messages.)

**3. Push branch backup.**
```powershell
git push origin frontend/canva-layout-integration
```
(Branch is 34 commits ahead of its remote; this also publishes `1596a71` + `992a0e6` + the new Phase-3 commit.)

**4. Merge to main (fast-forward) and push.**
```powershell
git checkout main
git merge frontend/canva-layout-integration    # expect fast-forward: main fc0c3f7 is an ancestor of the branch tip
git push origin main
```
If git reports anything other than a fast-forward, STOP and re-check `git merge-base` — do not force anything.

**5. Update `HANDOFF.md` session history** (repo convention — file has sections `## 1. Goal and current status` … `## 9. Constraints and warnings`; append/update the session entry in that style; HANDOFF is history, not a code map).

**6. Cleanup leftover processes** (verified still listening as of handoff):
```powershell
Stop-Process -Id 29744 -Force    # port 4199 vite preview
Stop-Process -Id 23772 -Force    # port 4200 vite dev
Stop-Process -Id 30396 -Force    # port 9333 headless chrome
```
(PIDs re-check with `Get-NetTCPConnection -State Listen | Where-Object LocalPort -in 4199,4200,9333`. Temp probes in `%TEMP%\opencode\` — `dashprobe.mjs`, `menudiag.mjs`, `questsprobe.mjs`, `smoke.mjs` — may be deleted if desired; keep `%TEMP%\bih-quests.png` as evidence until the user re-tests.)

**7. Post-merge:** ask the user to re-test the "lost daily quests" observation in their own browser (map screen quests popover is proven working; the dashboard Quests tab is the part to watch).

## 5. Open risks / bugs

- **R1 — Menu → Dashboard probe failure (`menuRows: []`).** Three candidate causes, diagnose in this order: (a) CDP attached to the wrong page target (script uses `targets.find(t=>t.type==='page')` — must pick the tab whose url contains 4199 or close others); (b) menu genuinely fails to open (inspect `apps/web/src/components/AppMenu.jsx` open effect + `apps/web/src/app.jsx` `menuOpen` state); (c) 400 ms wait too short. Do not assume a bug until (a) and (c) are ruled out.
- **R2 — Dashboard Quests tab never seen in a browser.** Source inspection only. If quests render there, done; if missing while the map popover works, reconcile the two code paths (`DashboardScreen.jsx` `getDailyQuests()` vs `QuestsPopover.jsx` pending→submit model) — that would be the real "lost daily quests" bug.
- **R3 — User-visible quest regression.** The user reported losing daily quests; map popover demonstrably shows all 5. Treat any dashboard-side absence as the priority bug; re-test with the user after merge (step 7).
- **R4 — Fast-forward assumption.** Holds right now (`merge-base` = `fc0c3f7` = `main` tip). If `main` moves on origin before step 4, the merge becomes a real merge — stop and re-plan instead of forcing.
- **R5 — Unpushed work.** 34 commits exist only locally until step 3. Do the push before the checkout-to-main so the branch is safe.
- **R6 — Large-file rule.** Root `AGENTS.md`: never read `*.csv`/`*.json` >100 KB raw (`apps/api/data/`, `apps/api/output/`, `apps/web/public/data/` are generated — skip). No secrets in the client; significance is rendered, never filtered; cut lines h30/h42/h44 are hard.

## 6. Environment, ports, probe pointers

- **Repo:** `C:\Users\winst\Desktop\NASA` · **Web app:** `apps/web/` (`npm run dev` → 4200, `npm run build`, `npm run preview` → 4199). Root `package.json` has no scripts.
- **Ports in use at handoff:** 4199 (vite preview, PID 29744), 4200 (vite dev, PID 23772), 9333 (headless Chrome CDP, PID 30396). Kill before finishing (step 6).
- **Probe scripts** in `%TEMP%\opencode\`:
  - `dashprobe.mjs` — menu→dashboard probe; **broken target selection, fix before trusting output** (see R1).
  - `menudiag.mjs` — menu diagnostics, same target-selection caveat.
  - `questsprobe.mjs` — **working** screenshot/CDP pattern (`Page.captureScreenshot`); use as the template.
  - `smoke.mjs` — general prod smoke.
- **Screenshots:** `%TEMP%\bih-quests.png` — proof the map-screen quests popover works (5/5 quests). Older: `bih-dashboard*.png`, `bih-quests-tab.png` (from 11/11, pre-Phase-3 — do not treat as current evidence).
- **Browser tooling:** Playwright MCP is DEAD in this environment (`Connection closed`, exit 255) — do not retry. Use headless Chrome + CDP over **native Node 24 WebSocket** (no `ws` package anywhere — `apps/web/node_modules/ws` does NOT exist; do not `npm install` one).
- **Test policy this session:** build + ONE targeted browser smoke. Full `node test_*.mjs` sweeps only if code in a tested area changes (the last full sweep: 22/22 PASS, already recorded above).
- **Write boundaries:** root docs (`AGENTS.md`/`README`/`CONCEPT.md`) are lead-owned — do not edit them; this `PLANCONTINUATION.md` was explicitly requested by the lead. Feature dirs are each feature agent's own; Phase-3 files above are already touched under the lead's direction.
