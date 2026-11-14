# UI-CHECK — guest-landing design contract validation

**Checked:** 2026-11-14
**Subject:** `.planning/UI-SPEC.md` (status: draft, phase `guest-landing`)
**Corroborating only:** `.planning/UI-REVIEW.md` (baseline audit — not the thing being checked)
**Method:** read-only. Every feasibility claim was re-verified against the repo (file/line citations below). UI-SPEC.md was not modified.

---

## Verdict table

| Dimension | Verdict | One-line evidence |
|---|---|---|
| 1. Completeness | **PASS** | 5 sections, both CTAs + Home row, asset treatment, tokens, motion, responsive, a11y all specified; states resolved (empty dismissed w/ reason, loading = pre-paint disabled CTA, OAuth error locked, deep-link `#muni=` in Entry #1, h30 fallback in #7) — 5 covered, 1 dismissed, 0 unresolved |
| 2. Consistency | **FLAG** | Internal tokens/terminology coherent; AppMenu row pattern, `createProgress({userId:null})` guest model and error string all match source — but the accent reserved-list contradicts its own section specs, and Entry #2 claims a `'landing'` navigate branch that does not exist yet |
| 3. Feasibility | **FLAG** | `scroller: landingRoot` claim correct (html/body `overflow:hidden` index.css:80–81), fonts/assets/theme/boundaries all feasible — except Entry #3 "reuse `handleSignIn`" cannot produce the mandated error state (app.jsx:120–131 never awaits/catches the OAuth promise) |
| 4. Accessibility | **FLAG** | Contrast math mostly verified correct (6.9/7.3/5.17/6.4/2.6 all reproduced) — but focus-ring-vs-blue is stated 4.3:1 when it computes to ≈3.45:1, footer-link target sizing vs 2.5.8 unspecified, and Home→landing focus placement unspoken |
| 5. Responsiveness | **PASS** | 375/768/1024/1440 all covered; scrub parallax disabled ≤767 and re-enabled ≥768 with consistent boundaries (Motion Spec "Mobile ≤767" ↔ Responsive 768 row); Tailwind breakpoint mapping stated |
| 6. Content integrity | **FLAG** | Full Claims→CORE map, never-claim list matches CONCEPT §8 OUT/STRETCH, 3 CTAs / 1 H1 binding, handle-only + attribution present — but badge asserts "1981–2025" while root AGENTS marks the POWER start year an unverified open fact (h6), and the shared hook exists nowhere in the repo outside this spec |
| 7. Testability | **FLAG** | Contract points are concrete and falsifiable, but no verification plan is recorded — no build / screenshot-matrix / contrast-recheck / guest-Google-Home manual-flow checks; only the h44 logged-out link check and the checker sign-off checkboxes exist |

**Overall gate: PASS-WITH-FIXES** (0 BLOCK, 6 FLAG dimensions, 9 findings).

---

## Findings (ordered — BLOCKs first, then FLAGs by severity)

**BLOCK: none.** No dimension found the contract incomplete, inconsistent, or unimplementable.

### FLAG-1 — Feasibility: the error-state contract cannot be met by "reuse `handleSignIn`"
- **Spec:** Entry / Auth Flow Contract #3 ("Reuse `handleSignIn` in `app.jsx` … Error → inline `<span role="alert">Sign-in failed — try again</span>`").
- **Evidence:** `apps/web/src/app.jsx:120–131` calls `supabase.auth.signInWithOAuth(...)` with no `await` and no `.catch` — a failure becomes an unhandled rejection and never reaches the UI. The string it must mirror is only produced by AuthButton's own awaited handler (`AuthButton.jsx:71–81` `setFailure('Sign-in failed — try again', …)` — em dash verified, matches spec). Reuse as written satisfies neither.
- **Concrete fix:** make `handleSignIn` `async`, return/report its error, and give LandingScreen the error state (or extract the shared `signInWithGoogle(supabase)` helper UI-REVIEW (c) already recommends and consume it in all three call sites). The mandated string/`role="alert"` stay as specified.

### FLAG-2 — Accessibility: focus-ring contrast figure is wrong (conclusion survives, evidence does not)
- **Spec:** Token Block → Focus ring — "15:1 vs cream, **4.3:1 vs the blue button**, 6.4:1 vs orange chips".
- **Evidence:** recomputed from the spec's own hex values: L(#2563EB)=0.153, L(#0F172A)=0.0088 → ring-vs-blue = (0.203)/(0.059) = **≈3.45:1**, not 4.3:1. (Cream figure is actually ≈16.8:1 — the stated 15 is conservative; orange 6.4 checks out.) 3.45 ≥ 3:1 still clears WCAG 1.4.11/2.4.11, so no AA failure — but a "verified" number in the contract that re-verification disproves poisons the rest of the column.
- **Concrete fix:** correct the figure to ≈3.45:1 (keep the pass), or darken the ring/adjust the reserved list — but do not ship the current number.

### FLAG-3 — Accessibility: Home→landing navigation loses focus
- **Spec:** Entry Flow #2 specifies "Move focus to `#main` after the screen swap" for guest→map; Entry Flow #4 (Home row → `navigate('landing')`) specifies no focus handling.
- **Evidence:** NavBar — whose menu button holds focus when Home is clicked — is unmounted on landing (Entry #5), so focus falls to `<body>` mid-navigation. Asymmetric with the spec's own #2 pattern.
- **Concrete fix:** mirror #2 — after `screen === 'landing'` renders, move focus to the landing `#main` (or its H1), stated in Entry Flow #4.

### FLAG-4 — Accessibility: footer link targets not sized against WCAG 2.2 AA §2.5.8
- **Spec:** A11y Contract claims WCAG 2.2 AA; #3 sizes only CTAs (≥44 px). §5 Footer specs Label 14/400, line-height 1.40 → 19.6 px rows, with no link padding/min-height and no row-gap value.
- **Evidence:** 19.6 px < 24 px minimum target; footer column links are not "inline in a sentence", so the inline exception does not apply. It may still pass via the 24 px-circle spacing exception — but the contract never gives the spacing that would establish that.
- **Concrete fix:** spec `min-height: 24px` (or ≥4.4 px vertical padding) per footer link, or state the row-gap that satisfies the circle exception.

### FLAG-5 — Content integrity: "1981–2025" asserted while the start year is an open fact
- **Spec:** §3 source badge `NASA POWER T2M + RH2M · 1981–2025`; Claims map row "45-year POWER trend, 1981–2025".
- **Evidence:** root `AGENTS.md` open facts: "POWER daily start year (assumed 1981) → verify at h6"; also "Event name … verify at h0" (the eyebrow chip asserts "2026 NASA Space Apps Challenge"). Everything else in the Claims map traces cleanly to CONCEPT §8 CORE (verified line-by-line, CONCEPT.md:178–196).
- **Concrete fix:** mark the badge range contingent on the h6 verification (or verify now and record the evidence in the spec); re-verify the event name at h0 before ship.

### FLAG-6 — Content integrity: hook-sentence fidelity is unverifiable from the repo
- **Spec:** §1 H1 / Copywriting Contract — "shared opening-sentence hook — reuse for video/project page"; Open question 6 asks the lead to confirm it.
- **Evidence:** grep finds "breaking its own records / nobody can say why" **only in UI-SPEC.md** — no canonical occurrence in CONCEPT.md, docs, or code. The spec honestly surfaces this, but until answered the "shared sentence" claim is unsourced.
- **Concrete fix:** lead supplies/lock the canonical string (Open Q6) before any other artifact reuses it; then record the source in the spec.

### FLAG-7 — Testability: no verification plan recorded
- **Spec:** Checker Sign-Off lists the 7 standard dimensions as checkboxes; h44 logged-out link check appears twice (§5, footer note). Nothing else.
- **Evidence:** no checks recorded for `npm run build`, the 375/768/1024/1440 screenshot matrix, contrast re-measurement (incl. FLAG-2's recheck), the three manual flows (guest → `#main` focus; Google → OAuth/disabled/error states; Home row → landing), reduced-motion static render, or the ≤700 ms hero-entrance claim — all of which the contract itself makes falsifiable.
- **Concrete fix:** add a short Verification section mapping each contract point → an executable check (build, 4-viewport screenshots, contrast tool, the 3 manual flows, DevTools reduced-motion, h44 link sweep).

### FLAG-8 — Consistency: accent reserved-list contradicts the section specs
- **Spec:** Colors → reserved list "(1) the 'Explore as guest' primary button fill (**hero + climax**)" — but §4 specs the climax button as **white** fill on the blue band; §3 says "blue reappears only as link-free accent" though no blue element is specified in §3; the color table lists "hero eyebrow text on cream" as an accent usage while §1's eyebrow is `#9A3412`.
- **Evidence:** self-contradiction inside the contract; the reserved list is precisely the anti-overuse mechanism, so it must match actual usage.
- **Concrete fix:** rewrite the reserved list to the four real blue usages (hero primary fill, climax band bg, footer/text links, —) and delete the §3/blue-eyebrow notes, or add the elements they refer to.

### FLAG-9 — Consistency: Entry #2 overstates existing code
- **Spec:** Entry #2 — "`navigate('map')` (new `'landing'`/`'map'` target handling already exists)".
- **Evidence:** `app.jsx:86–118` has no `'landing'` branch today (verified); only `'map'` and the dashboard/account/settings targets exist. Entry #4 correctly says the branch is *added*. The parenthetical as written is false for `'landing'`.
- **Concrete fix:** reword to "map handling exists; the `landing` branch is added in #4".

### Recommendations (non-blocking)
- Disabled Google CTA explains itself only via `title` (hover-only): add `aria-describedby` or a visible hint for touch/AT users (Entry #3).
- Fonts in `public/fonts/` are runtime cache-first via `sw.js` (its precache regex, `sw.js:14`, only captures `/assets/` links) — the "last-view reload renders identically" contract holds, but first-install-offline falls back to the declared stack; optionally add `/fonts/` to the precache list.
- During the ≤700 ms hero entrance, `opacity: 0` elements remain focusable — consider skipping entrance tweens for elements as they receive focus (or starting the sequence focus-safe).

---

## Disposition of the 6 open questions (UI-SPEC §Open Questions for the Lead)

| # | Question | Disposition | Basis |
|---|---|---|---|
| 1 | Signed-in cold load: landing for everyone vs auto-navigate to map | **needs-lead-decision** | Product preference; no repo precedent (current default is `map`, app.jsx:28) and no lock in CONCEPT/AGENTS decides it |
| 2 | Home row gating: signed-in-only vs all users | **needs-lead-decision** | The source requirement says signed-in; showing it to guests too is a scope call the lead must make (spec's recommendation is sound either way) |
| 3 | Seed-contrast claim: ship §3 seed card or confirm seeds wired | **answerable-from-repo** | Seeds are **not** wired — no seed code exists (grep found only the join-key comment `features/map-controls/src/gis/engine.js:72`); `apps/web/AGENTS.md` workboard "todo" is accurate. Disposition: keep the gate, omit the card (as PLAN.md already does) |
| 4 | `<meta name="theme-color">` stays `#070a0f` vs `#FFF7ED` | **needs-lead-decision** | Repo evidence collected (meta `index.html:9`, manifest `theme_color`/`background_color` all `#070a0f`) but the single-value trade-off (dark OS chrome on cream landing vs dark app chrome) is an aesthetic/product call |
| 5 | h30 fallback: hide Google CTA, keep guest + climax | **answerable-from-repo** | The fallback is the direct consequence of the locked cut-line — root `AGENTS.md`: "h30: leaderboard not done → local-only progress, no auth. Do not renegotiate" (same in `apps/web/AGENTS.md`). No new decision needed; whether the *trigger* fires is evaluated at h30 against the leaderboard's state |
| 6 | Hook wording: confirm or supply canonical string | **needs-lead-decision** | Canonical string does not exist anywhere in the repo (grep: only UI-SPEC.md) — the lead must author/lock it (see FLAG-6) |

---

## Overall gate

**PASS-WITH-FIXES.** Zero BLOCK dimensions — the contract is implementable inside the `apps/web` write boundary and satisfies the locked source-of-truth constraints (CONCEPT §8 CORE-only claims, h30 fallback pre-agreed, significance rendered-not-filtered, handle-only leaderboard, zero client secrets, mascot blue frame + cut-out wordmark kept, GSAP ScrollTrigger, exactly 5 sections, guest + Google CTAs, Home row for signed-in users). Planning may proceed on the spec's structure and copy; the 9 FLAG findings above should be folded back into UI-SPEC.md by the researcher before execution — FLAG-1 (OAuth error plumbing) and FLAG-5 (1981 badge) are the two that would otherwise surface during build as rework.

**Verification appendix (what was checked against the repo):** `app.jsx` full read (navigate/handleSignIn/default screen/deep link/NavBar mount); `AuthButton.jsx:55–173`; `AppMenu.jsx` rows; `index.css:190–243` (reduced-motion, `.bih-scroll`) + overflow rule lines; `sw.js` precache/runtime strategy; `index.html` (lang, theme-color, no font links); `public/` asset sizes (mascot 2,054,860 B ≈ 2.0 MB ✓, wordmark 119,170 B ✓, both git-untracked ✓); `npm view gsap` → 3.15.1 / Standard no-charge ✓; CONCEPT §8 CORE/STRETCH/OUT read; greps for hook sentence (spec-only), seeds (unwired), landing code (none exists yet); contrast ratios independently recomputed from the spec's hex values.
