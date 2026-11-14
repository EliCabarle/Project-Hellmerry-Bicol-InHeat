# Phase BASELINE — UI Review (retroactive, current implemented frontend)

**Audited:** 2026-11-14
**Baseline:** Abstract 6-pillar standards + WCAG 2.2 AA lens (no UI-SPEC.md exists yet; companion researcher is producing `.planning/UI-SPEC.md` for the landing page — not touched)
**Screenshots:** Captured — dev server live at `localhost:5173`; `.planning/ui-reviews/baseline-20261114-151533/` (`desktop.png` 1440×900, `mobile.png` 375×812, `tablet.png` 768×1024, `menu-open.png`, `quests-open.png`, `menu-mobile.png`). Account/Settings screens are auth-gated (no guest route) — audited code-only.
**Registry audit:** Skipped — no `components.json` (shadcn not initialized in this repo).
**Screenshot storage:** `.planning/.gitignore` written/verified (`*.png` ignored recursively, `git check-ignore` confirmed).

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Visual hierarchy | **PASS** | Map-first focal point holds at all 3 viewports; screens use clear eyebrow→H1→body stack; menu active-row highlight works |
| 2. Consistency & tokens | **PARTIAL** | Two parallel token systems (`heat.*` vs `--bih-*`), an undefined CSS var relied on by the focus ring, two encodings of the same card surface, 12× arbitrary `text-[11px]` |
| 3. Accessibility | **PARTIAL** | Strong ARIA/keyboard/reduced-motion baseline, but amber focus ring on amber buttons is invisible (AA failure) + slate-500 copy at 4.17:1 + Tab escapes open overlays |
| 4. Responsiveness | **PARTIAL** | 1440/768 clean; 375 works with clamps, but top-left stack collides at 375 (toast over index card) and AppMenu never repositions after open |
| 5. Interaction & motion | **PARTIAL** | `bih-btn` press/hover/focus + global reduced-motion are solid; AppMenu Enter/Space can dead-key after mouse-leave (`preventDefault` + `activeIndex === -1`) |
| 6. Content clarity | **PARTIAL** | Honest placeholder/privacy copy and skip link; but generic "Submit", daily eco-quests vs CONCEPT §8 OUT list, "No data" as a loading label |

**Overall: 1 PASS + 5 PARTIAL — baseline is functional but not landing-ready.**

---

## Prioritized Findings

### BLOCKER

**B1. Keyboard focus is invisible on amber-filled buttons (WCAG 2.4.11 / 1.4.11)**
- Evidence: `.bih-btn:focus-visible` draws `box-shadow: 0 0 0 2px var(--heat-amber, #fbbf24)` — `apps/web/src/index.css:53-56`; the quests **Submit** button is `.bih-btn` + `bg-heat-amber` — `apps/web/src/components/QuestsPopover.jsx:15-16`. Ring `#fbbf24` on background `#fbbf24` = 1.0:1, i.e. no visible indicator. Same pattern will hit any future amber CTA that reuses `bih-btn`.
- Fix: dual-ring focus token with a dark separator, e.g. `box-shadow: 0 0 0 2px var(--bih-bg), 0 0 0 4px var(--bih-amber)` (or a `--focus-ring` token landing CTAs also consume).

### MAJOR

**M1. `text-slate-500` body copy fails 4.5:1 contrast (WCAG 1.4.3 AA)**
- `#64748b` on `#070a0f` = **4.17:1** (measured). Occurrences: `apps/web/src/screens/AccountScreen.jsx:20` ("Sign out clears the session…") and the handle input placeholder `apps/web/src/components/AuthButton.jsx:137` (`placeholder:text-slate-500` over `bg-black/30`). Fix: use `text-slate-400`/`heat-muted` (7.21:1 on `#0d141e`).

**M2. AppMenu Enter/Space can do nothing while a row holds focus**
- Keydown handler `preventDefault()`s Enter/Space and dispatches `rows[activeIndex]` — `apps/web/src/components/AppMenu.jsx:137-141`; `onMouseLeave` resets `activeIndex` to `-1` — `AppMenu.jsx:191`. Sequence: open menu → mouse crosses rows → mouse leaves panel → press Enter on the still-focused row → `rows[-1]` is undefined **and** the native click was prevented → dead key. Fix: dispatch from `document.activeElement`'s `data-menu-index` instead of `activeIndex`.

**M3. Open overlays don't contain Tab focus and don't close on focus escape**
- `apps/web/src/components/AppMenu.jsx:121-153` handles Escape/arrows but not Tab; same for `apps/web/src/components/QuestsPopover.jsx:83-109` (role="dialog" without trap). A keyboard user tabs out into the map while the menu stays floating with no focus inside it. Fix: trap Tab within `menuRef`/`panelRef`, or close on focusout.

**M4. Daily eco-quests appear to sit on CONCEPT §8 OUT items — claim-honesty adjudication needed before the landing page markets gamification**
- `apps/web/src/components/QuestsPopover.jsx:3,156-205` ships "Today's quests" with HP (CSV eco-tasks: "Unplug Vampire Electronics", "Harvest Rainwater"…); `CONCEPT.md:195-196` lists **"daily tasks / carbon-footprint actions"** in the OUT tier. CORE covers "offline last-view + progress" and "Supabase accounts + leaderboard" (`CONCEPT.md:181-183`) but not daily quests. Not a UI defect per se — but any landing copy like "complete daily eco-quests" would claim an OUT item. **Route to lead for scope ruling; hold landing gamification copy until answered.**

**M5. 375px top-stack collision — loading toast overlaps the municipality index card**
- Screenshot `mobile.png`: "Loading satellite view and municipality data…" toast renders over the "BICOL · REGION V" card (both anchored top-left). Component lives in `features/map-controls` (outside this audit's write boundary) — route to the map-controls owner; the landing page must not repeat uncoordinated fixed-position stacking.

**M6. No light theme exists anywhere — light landing vs dark app is an unmitigated clash**
- `color-scheme: dark` — `apps/web/src/index.css:6`; body bg `#070a0f` — `index.css:85`; Tailwind palette all dark — `apps/web/tailwind.config.js:6-25`; PWA chrome `background_color`/`theme_color` `#070a0f` — `apps/web/public/manifest.webmanifest`. See integration assessment (d) for measured contrast of the proposed clay tokens.

### MINOR

| # | Finding | Evidence |
|---|---------|----------|
| m1 | Focus ring reads an **undefined** variable `--heat-amber` (works only via hardcoded fallback); naming diverges from the actual token `--bih-amber` | `index.css:55` vs `index.css:12` |
| m2 | Dual token systems duplicate the same palette: Tailwind `heat.*` (`#fbbf24`, `#070a0f`, `#0d141e`) vs CSS `--bih-*` | `tailwind.config.js:6-25`, `index.css:5-34` |
| m3 | Two encodings of the same translucent card: `bg-[rgba(13,20,30,var(--alpha-card))]` vs `bg-heat-surface/90\|95` | `AppMenu.jsx:171`, `AuthButton.jsx:7`, `NavBar.jsx:49` vs `QuestsPopover.jsx:123,139` |
| m4 | Micro-type: 12× `text-[11px]` + 1× `text-[10px]` arbitrary values, no type-scale token; 11px sits below the 12px readability floor | `NavBar.jsx:54,59-62,80-81`; `QuestsPopover.jsx:14,16,123,129-146,188-211` |
| m5 | AppMenu position measured once on open; no resize/orientation re-measure while open → panel can detach from its button | `AppMenu.jsx:104-108` |
| m6 | Generic label "Submit" (list of flagged generic CTAs) — prefer "Record quest" | `QuestsPopover.jsx:200` |
| m7 | Timeline shows "No data" as its value during load — reads as a permanent empty claim, not a loading state (rendered by `features/map-controls`) | screenshot `desktop.png` |
| m8 | Guest menu "Sign in" row silently `disabled` when Supabase unconfigured, with no explanation (AuthButton's `title` tooltip doesn't exist in the menu) | `AppMenu.jsx:49` vs `AuthButton.jsx:63` |
| m9 | Quest checkbox exactly 24×24 and Submit ~24px tall — meets AA floor, below 44px comfort for touch | `QuestsPopover.jsx:16,174` |
| m10 | `.leaflet-interactive:focus { outline: none }` — focus visibility depends entirely on the map's separate roving-tabindex path surviving future refactors | `index.css:139-141` |
| m11 | Guest menu row order (Map / Sign in / Top BECOlanos / Dashboard) mixes concerns with no dividers — decide Home-row placement against this ordering | `AppMenu.jsx:38-62` |

**What passed (evidence, not assumption):** skip link `app.jsx:143-148`; `role=progressbar` + `aria-valuetext` `NavBar.jsx:66-73`; roving-tabindex menu `AppMenu.jsx:85-99`; Escape + focus-return on both overlays `AppMenu.jsx:114-127`, `QuestsPopover.jsx:86-108`; global `prefers-reduced-motion` block `index.css:228-243`; sr-only handle label + `role=alert` `AuthButton.jsx:126-144,167`; `aria-pressed` quest toggles `QuestsPopover.jsx:168`; 44px primary controls `NavBar.jsx:91`, `QuestsPopover.jsx:123`; active menu row `bg-heat-amber text-slate-950` (11:1+) `AppMenu.jsx:160`.

---

## Integration-Point Assessment (for the Claymorphism parallax landing page)

### (a) Where a guest default `landing` screen slots into `app.jsx`

- **Default:** `const [screen, setScreen] = useState('map')` — `apps/web/src/app.jsx:28`. Change to `'landing'` for guests; keep `parseMuniHash()` (`app.jsx:17-25`) forcing `map` when a `#muni=` deep link exists (`app.jsx:32-35` already seeds from it — landing must not swallow deep links).
- **Navigate has no default case:** `navigate()` (`app.jsx:86-118`) silently no-ops on unknown targets (only the token increments). A `'landing'` branch is mandatory or any Home row is dead.
- **Render slot:** two branches exist — map (`app.jsx:177-189`) and scrolled screens with a nav-clear spacer (`app.jsx:190-217`). Landing needs a third decision: full-bleed with **no** spacer (hero under the floating navbar) or spacer like `AccountScreen`. It must render `id="main"` (pattern: `AccountScreen.jsx:10`) or the skip link (`app.jsx:143-148`) breaks — WCAG 2.4.1.
- **⚠ Scroll blocker:** `html, body { overflow: hidden; overflow: clip }` — `index.css:78-82`. A tall landing **cannot document-scroll**. It must either (1) own an inner `overflow-y-auto` scroller (pattern: `AccountScreen.jsx:10`), with parallax scroll listeners attached to that container instead of `window`, or (2) toggle a per-screen class lifting the overflow rule. Parallax that assumes `window.scrollY` will silently never fire under option 1.
- **NavBar is always mounted** (`app.jsx:152-160`) on every screen — a dark translucent bar (`NavBar.jsx:49`, `bg-[rgba(13,20,30,…)]`) will float over the cream hero unless hidden/re-themed for the landing screen.

### (b) AppMenu "Home" row — feasible, 3 touch points

1. **Icon:** `Icons.jsx` (`apps/web/src/components/Icons.jsx:13-75`) has no home glyph — add one per the file's SVG contract (viewBox 24, stroke 1.8, `aria-hidden`).
2. **Row:** `rows` useMemo — `AppMenu.jsx:37-81`. The signed-in conditional spread pattern already exists (`AppMenu.jsx:63-78`) → add `{ label: "Home", icon: IconHome, onClick: () => navigate("landing") }` gated on `user`. Placement: prepend before "Map" (`AppMenu.jsx:39-44`); consider a divider (existing guest rows have none — m11).
3. **Navigate:** add the `'landing'` branch in `app.jsx:86-118` (see (a)).
No other changes needed — rows are data-driven, roving focus and ARIA apply automatically.

### (c) AuthButton / AppMenu OAuth reuse for a hero CTA

- **Duplication already exists:** the Google OAuth call is implemented twice — `app.jsx:120-131` (`handleSignIn`, `select_account` + `redirectTo`) and `AuthButton.jsx:71-82`. A hero CTA would be a third copy. **Extract one helper** (e.g. `src/lib/auth.js → signInWithGoogle(supabase)`) and consume it in all three before landing ships.
- **Plumbing already exists:** `handleSignIn` flows to AppMenu via `onSignIn` (`app.jsx:170`, `AppMenu.jsx:24`) — the hero can take the same prop.
- **Required fallback:** `configured` gate (`app.jsx:121`); AuthButton renders a "Sign-in unavailable / Offline" pill when unconfigured (`AuthButton.jsx:61-69`). The hero CTA must show an equivalent state rather than a dead button — also needed for the h44 logged-out-private-window link check.
- Handle-onboarding (picker UI) stays in AuthButton; the hero CTA should only trigger OAuth, not re-implement profile logic.

### (d) Existing tokens vs proposed clay tokens (#FFF7ED bg, #F97316 primary, #2563EB accent, Fredoka/Nunito) — theme-clash risk: **HIGH**

Measured contrast of the proposed palette (WCAG 2.2 AA = 4.5:1 text, 3:1 non-text):

| Pair | Ratio | Verdict |
|------|-------|---------|
| `#F97316` text on `#FFF7ED` | **2.64** | ✗ FAIL — orange must never be body/label text on cream |
| White text on `#F97316` button | **2.80** | ✗ FAIL — button labels need ≥4.5 (or dark ink) |
| `#1C1917` ink on `#F97316` | 6.24 | ✓ — the only safe label color on orange buttons |
| `#2563EB` on `#FFF7ED` | 4.87 | ✓ — safe for links/accent text |
| Existing `#fbbf24` on `#0d141e` (dark app) | 11.07 | ✓ (dark side unaffected) |

Integration rules for the landing:
- **Namespace, don't replace:** introduce `--clay-*` variables scoped to the landing root class (or `data-theme="clay"` on the landing screen div). Do **not** flip `:root { color-scheme: dark }` (`index.css:6`) — it controls UA defaults (scrollbars, form controls) for the entire dark app.
- **Paint the screen, not the body:** body stays `#070a0f` (`index.css:85`); the landing div must be full-bleed (`min-h-full` + own bg) or dark gutters show through overscroll (worse under the `overflow` rule in (a)).
- **Navbar seam:** the always-on dark NavBar over the cream hero is the visible clash — hide it on `screen === 'landing'` or add a light variant; the skip link and `--bih-nav-clear` consumers must stay consistent either way.
- **Fonts:** zero font loading exists — `index.html:1-16` has no font links; Tailwind `sans` = Segoe stack (`tailwind.config.js:26-29`). Fredoka/Nunito require self-hosting (e.g. `@fontsource`) + a `fontFamily.clay` token + CONCEPT §9 font-attribution compliance.
- **PWA chrome:** `manifest.webmanifest` `theme_color`/`background_color` are `#070a0f` — browser/OS chrome stays dark on the cream page. Acceptable, but decide deliberately; it can't be per-screen.
- **Reduced-motion gap:** the global block (`index.css:228-243`) only kills CSS animations/transitions (and only `transform: none` for `.bih-btn`, `index.css:237-242`). **JS parallax (scroll/rAF transforms) must check `matchMedia('(prefers-reduced-motion: reduce)')` itself** — claymorphism parallax is exactly the case the CSS rule won't cover.
- **Claymorphism-specific risk:** extruded shadows/insets on pastel surfaces invite low-contrast label placement — reuse the measured table above as the landing's contrast contract; shadow-only "depth" borders need 3:1 against adjacent fills (WCAG 1.4.11).

---

## Must-Fix Before Landing Ships

- [ ] **B1** — Replace amber-on-amber focus ring (`index.css:53-56`) with a dual-ring `--focus-ring` token; verify on `bg-heat-amber` buttons (`QuestsPopover.jsx:15-16`) and reuse for landing CTAs.
- [ ] **M1** — Swap `text-slate-500` 4.17:1 copy for ≥4.5:1 tokens (`AccountScreen.jsx:20`, `AuthButton.jsx:137`).
- [ ] **M2** — Fix AppMenu Enter/Space dead-key: dispatch from focused row's `data-menu-index`, not `activeIndex` (`AppMenu.jsx:137-141,191`).
- [ ] **M3** — Trap/contain Tab in AppMenu and QuestsPopover, or close on focusout (`AppMenu.jsx:121-153`, `QuestsPopover.jsx:83-109`).
- [ ] **(a)** — Add `'landing'` branch to `navigate()` (`app.jsx:86`), decide default screen, preserve `#muni=` deep links, render `id="main"`.
- [ ] **(a)** — Decide landing scroll strategy against `html/body overflow: hidden` (`index.css:78-82`); attach parallax listeners to the actual scroll container.
- [ ] **(d)** — Hide or retheme the always-mounted dark NavBar on the landing screen (`app.jsx:152`, `NavBar.jsx:49`).
- [ ] **(d)** — Ship `--clay-*` token namespace with the measured contrast rules (orange = surface/dark-ink only; `#2563EB` for accent text); self-host Fredoka/Nunito + §9 attribution; extend `tailwind.config.js` rather than hardcoding hexes.
- [ ] **(d)** — Guard parallax with `prefers-reduced-motion` `matchMedia` in JS (CSS rule at `index.css:228-243` is insufficient).
- [ ] **(c)** — Extract one shared Google OAuth helper (dedupe `app.jsx:120-131` and `AuthButton.jsx:71-82`); give the hero CTA the `configured` fallback state.
- [ ] **M4** — Lead ruling on daily quests vs CONCEPT §8 OUT (`QuestsPopover.jsx:3` vs `CONCEPT.md:195-196`) before any landing copy mentions quests/tasks.
- [ ] **M5** — Fix 375px toast/index-card collision (map-controls owner) so the landing's mobile hero doesn't inherit the pattern.
- [ ] **(b)** — Home row: new icon (`Icons.jsx`) + row entry (`AppMenu.jsx:37`) + navigate branch (`app.jsx:86`).

---

## Files Audited

- `apps/web/src/app.jsx` (224 lines)
- `apps/web/src/index.css` (243 lines)
- `apps/web/src/components/NavBar.jsx` (98 lines)
- `apps/web/src/components/AppMenu.jsx` (207 lines)
- `apps/web/src/components/AuthButton.jsx` (173 lines)
- `apps/web/src/components/QuestsPopover.jsx` (217 lines)
- `apps/web/src/components/Icons.jsx` (75 lines)
- `apps/web/src/screens/AccountScreen.jsx` (27 lines)
- `apps/web/src/screens/SettingsScreen.jsx` (20 lines)
- `apps/web/src/useSession.js` (24 lines)
- `apps/web/public/manifest.webmanifest`
- `apps/web/index.html`, `apps/web/tailwind.config.js`
- Context: `CONCEPT.md` §8–§9, root `AGENTS.md`, `apps/web/AGENTS.md`
- Screenshots: `.planning/ui-reviews/baseline-20261114-151533/` (6 PNGs, gitignored)
