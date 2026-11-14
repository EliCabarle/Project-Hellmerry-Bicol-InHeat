---
phase: guest-landing
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/src/index.css
  - apps/web/tailwind.config.js
  - apps/web/index.html
  - apps/web/package.json
  - apps/web/src/app.jsx
  - apps/web/src/lib/auth.js
  - apps/web/src/screens/LandingScreen.jsx
  - apps/web/src/components/AppMenu.jsx
  - apps/web/src/components/Icons.jsx
  - apps/web/src/components/AuthButton.jsx
  - apps/web/public/fonts/Fredoka-600.woff2
  - apps/web/public/fonts/Nunito-400.woff2
  - apps/web/public/fonts/Nunito-600.woff2
  - apps/web/public/mascot_512.png
  - apps/web/public/BICOL_IN_HEAT.png
  - apps/web/assets/mascot_icon_2048.png
autonomous: false            # Task 8 is checkpoint:human-verify gate="blocking-human" (package legitimacy — never auto-approved)
requirements: [UI-SPEC]
user_setup: []

estimate:
  tokens: 130000
  raw_tokens: 130000
  tasks: 10
  confidence: low

must_haves:
  truths:
    - "A guest loading the app with no URL hash lands on the cream clay landing page whose hero shows the wordmark, mascot, the single H1 hook, and exactly 2 CTAs within first paint (entrance complete ≤700 ms)."
    - "A #muni= deep link opened logged-out still opens the map directly with that municipality selected (h44 shared-link rule)."
    - "'Explore as guest' (hero AND climax band) enters the map with the existing local-only guest progress model (userId: null) and moves focus to #main."
    - "'Continue with Google' triggers the single shared Google OAuth helper; when Supabase is unconfigured it renders disabled with aria-disabled + title; OAuth failure renders 'Sign-in failed — try again' with role=alert."
    - "A signed-in user's AppMenu shows a Home row first that navigates back to the landing screen."
    - "Keyboard focus is visibly ringed on every interactive control including amber-filled .bih-btn (audit B1 closed), and the landing scrolls entirely inside its own scroller with no document scrollbar appearing."
    - "With prefers-reduced-motion: reduce, the page renders in static final position (no tweens created, press transform off) and remains fully readable in DOM order."
    - "Every claim on the page maps to a CONCEPT §8 CORE item; the page uses both prepared assets (512px mascot derivative ≤150 KB, transparent wordmark) and ships no fourth CTA."
    - "gsap@3.15.1 is installed only after a human approved the package-legitimacy checkpoint (T8) with the tool verdict and npm evidence on the table."
  artifacts:
    - "apps/web/src/screens/LandingScreen.jsx — 5 sections, exactly 1 H1, exactly 3 CTA buttons"
    - "apps/web/src/lib/auth.js — one shared signInWithGoogle helper consumed by app.jsx, AuthButton.jsx, LandingScreen"
    - "apps/web/src/index.css — dual-ring focus token (B1 fix) + scoped /* landing clay */ token block + .landing-root scroller + reduced-motion extension to .clay-btn"
    - "apps/web/tailwind.config.js — clay colors/fontFamily/shadow/radius extensions"
    - "apps/web/public/fonts/{Fredoka-600,Nunito-400,Nunito-600}.woff2 + preload links in index.html"
    - "apps/web/public/mascot_512.png (≤150 KB, blue frame intact) + transparent apps/web/public/BICOL_IN_HEAT.png + 2048 original relocated to apps/web/assets/"
    - "gsap@3.15.1 in apps/web/package.json (after T8 approval)"
    - "IconHome in Icons.jsx + Home row in AppMenu.jsx"
    - ".planning/guest-landing-verify/ — 8+ screenshots, contrast table, flow checklist, chunk sizes"
  key_links:
    - "app.jsx default screen useState ↔ parseMuniHash() — deep links must win over the landing default"
    - "Every ScrollTrigger's scroller option ↔ the landing-root element (document scrolling is disabled globally; a trigger on the document scroller never fires)"
    - "Landing clay namespace ↔ dark app theme — clay tokens scoped to .landing-root / landing subtree only; :root color-scheme stays dark"
    - "signInWithGoogle helper ↔ 3 call sites with identical configured/error state contracts"
    - "Skip link href=#main ↔ LandingScreen main id=main (WCAG 2.4.1)"
---

<objective>
Build the Claymorphism parallax guest landing page as the default screen of the Bicol In-Heat PWA, exactly to `.planning/UI-SPEC.md`, while closing the two audit gates (invisible amber focus ring — UI-REVIEW B1; overflow-hidden scroll-container strategy — UI-REVIEW (a)) that block it.

Purpose: hook guests at first glance with a non-cluttered 5-section story (Hero → Problem → How-it-works → Trust+climax → Footer), give both entry paths (guest + Google) and a signed-in Home path, and keep the dark app screens untouched behind a clean light/dark seam.

Output: `LandingScreen` wired as the default screen in `apps/web/src/app.jsx`, clay token layer + self-hosted fonts, prepared assets, GSAP parallax with reduced-motion fallback, AppMenu Home row, the two audit-gate fixes, and one blocking human checkpoint (gsap package legitimacy, Task 8).

Write boundary: ALL product edits are inside `apps/web/**` (web-agent jurisdiction). `features/**` is mounted read-only. This planning step wrote only `.planning/PLAN.md`; execution writes only apps/web + the `.planning/guest-landing-verify/` evidence folder.
</objective>

<execution_context>
@C:/Users/winst/.config/opencode/gsd-core/workflows/execute-plan.md
@C:/Users/winst/.config/opencode/gsd-core/templates/summary.md
</execution_context>

<context>
@AGENTS.md
@apps/web/AGENTS.md
@.planning/UI-SPEC.md
@.planning/UI-REVIEW.md
@CONCEPT.md

No ROADMAP.md or phase directory exists for this phase — `requirements: [UI-SPEC]` is the single requirement key, covering the full design contract (see Source Audit below). Knowledge graph exists but is stale (70 h / 108 commits behind, query for "guest landing page claymorphism" returned 0 nodes) — treated as no graph context. No prior-phase SUMMARYs exist.

Binding inputs recap:
- UI-SPEC is the WHAT. Locked: default screen `landing` (except `#muni=` → map), exactly 5 sections, exactly 3 CTAs, clay tokens (#FFF7ED bg / #F97316 surface-only / #2563EB accent / Fredoka+Nunito self-hosted woff2), gsap@3.15.1 with `scroller: landingRoot`, mascot keeps its blue frame as a ≤150 KB 512px derivative, wordmark background-to-alpha one-time processing.
- UI-REVIEW gates: B1 focus-ring blocker (index.css:53-56) and the html/body overflow:hidden scroll strategy must be explicit tasks. Other majors (M1 slate-500 copy, M2 dead-keys, M3 Tab escape, M5 toast collision, M4 quests-vs-OUT) are OUT of this phase's scope per the brief; the coverage audit records them as excluded.
- CONCEPT §8 CORE only — every page claim maps via the UI-SPEC claims table. §3 seed-contrast card is GATED (apps/web/AGENTS.md workboard: "2 Try this demo seeds wired — todo") → does not ship this phase.
- Demo-video narrative (README opening hook, CONCEPT §8/§10) supplies the H1 hook and section copy already transcribed verbatim into UI-SPEC Copywriting/Section specs — no new copy authored.

## Executor environment contract (verified 2026-11-14 on this machine — every `<automated>` command below already runs green in this form)

- Shell is **Windows PowerShell 5.1**: `&&` is a PARSE ERROR (never use it), `grep`/`bash`/`curl` are NOT on PATH, `npx`/`python`/`node`/`npm` are. Chain with `;`, gate with `if ($?)`, assert with `node -e` (or `Select-String`).
- Build command: `npm --prefix apps/web run build` from repo root — verified EXIT=0 (~12 s). Every build-including verify is a SINGLE `node -e "..."` that runs the build itself via `execSync('npm --prefix apps/web run build',{stdio:'inherit'})` (throws on non-zero) and then asserts with pure-Node fs/regex (paths prefixed `apps/web/`), so no `cd`, no `&&`, no grep.
- `node -e` quoting rule on PS 5.1: outer double quotes, JS uses only single quotes, NO `$`, NO backticks, no `"` inside (PS would expand/parse them).
- Pillow is NOT installed and no pip install happens this phase (package-legitimacy gate): image work uses Windows-built-in `Add-Type -AssemblyName System.Drawing` (verified working).
- Chrome: `C:\Program Files\Google\Chrome\Application\chrome.exe` — `--headless=new --screenshot=... --window-size=WxH --virtual-time-budget=8000` verified (200,039-byte shot at 1440×900 against `npm run preview` on port 4173). `--force-prefers-reduced-motion` verified empirically (media-query test pixel flips to green). Preview server start pattern: `Start-Process cmd.exe -ArgumentList '/c','npm --prefix apps/web run preview'` (plain `Start-Process npm` fails — npm is npm.cmd).
- fonts.googleapis.com / fonts.gstatic.com reachable (css2 API returned woff2 URLs, 200) — self-host download feasible; runtime must never call them.
- Package legitimacy: `gsd-tools package-legitimacy check --ecosystem npm gsap` → verdict **SUS ("too-new", published 2026-11-04)** despite 8.15 M weekly downloads and official greensock/GSAP repo. Per protocol, SUS → blocking-human checkpoint BEFORE install → **Task 8**. Pillow never enters the plan, so no pypi gate applies. Evidence gathered at planning time: `npm view gsap@3.15.1` → license "Standard 'no charge'", maintainers `greensock <info@greensock.com>`, repo `git+https://github.com/greensock/GSAP.git`, dist.integrity `sha512-63yjWRFWj3QRP1UOuD8kcidCcy3nxb1mMRpwHr/xJRvPfm9GtWOXFAYUiL0ro1fgPq2nY53LR+98pAgy9BumBg==`.
- Asset pre-state (verified): `apps/web/public/BICOL_IN_HEAT.png` corners are ALREADY alpha 0 (2048×1024, 119,170 B) — Task 2 asserts first, processes only if a check fails. `apps/web/public/mascot_icon.png` still 2048×2048 / 2,054,860 B — derivative needed. Measured System.Drawing output: resize alone = 191,795 B (over budget) → resize + 5-bit RGB posterize = 77,797 B (76 KB, under 150 KB).
- Baseline chunk sizes (pre-phase `npm --prefix apps/web run build`, recorded 2026-11-14): index 1,381.72 kB / **320.40 kB gz**, vendor 376.91 kB, charts 420.57 kB, maps 153.30 kB, Municipality3DLayer (lazy) 1,069.48 kB. Task 9 compares against these.
</context>

<tasks>

<!-- planner-discipline-allow: --heat-amber -->
<task type="tracer">
  <name>Task 1: Close audit gate B1 — visible focus ring + reduced-motion-ready focus token</name>
  <files>apps/web/src/index.css</files>
  <action>Replace the single-layer amber focus shadow on `.bih-btn:focus-visible` (index.css:53-56) with a dual-ring `--focus-ring` token that always separates ring from fill: outer 4px amber ring with a 2px separator in the underlying surface color, expressed as two stacked box-shadows so the ring stays visible on amber-filled buttons (ring-vs-fill is 1.0:1 today). Define `--focus-ring` once on `:root` using the existing `--bih-amber` token (fixing the undefined heat-amber variable reference, audit m1 — the shadow currently names a variable that does not exist and only works via its hardcoded fallback) and point `.bih-btn:focus-visible` at it. Keep `outline: none` behavior unchanged for `.bih-btn` only — do not touch `.leaflet-interactive:focus` and do not add global outline resets. This token is the single focus treatment for the dark app; the landing's `#0F172A` clay ring is scoped separately in Task 4 and must not be wired here. Per UI-REVIEW B1 + m1.</action>
  <verify>
    <automated>node -e "const{execSync}=require('child_process');execSync('npm --prefix apps/web run build',{stdio:'inherit'});const fs=require('fs');const css=fs.readFileSync('apps/web/src/index.css','utf8');if(!/--focus-ring/.test(css))throw new Error('focus token missing');if(/--heat-amber/.test(css))throw new Error('undefined heat-amber variable still present');console.log('focus token ok')"</automated>
  </verify>
  <done>The quests Submit button (`.bih-btn` + `bg-heat-amber`) shows a ring distinguishable from its fill at ≥2:1 against BOTH the amber fill and the dark panel behind it; zero occurrences of the undefined heat-amber variable remain in index.css outside comments (proved by the verify command); the existing global reduced-motion block is untouched.</done>
</task>

<task type="auto">
  <name>Task 2: One-time asset preparation — mascot 512px derivative + wordmark transparency (zero-install, System.Drawing)</name>
  <files>apps/web/public/mascot_512.png, apps/web/public/BICOL_IN_HEAT.png, apps/web/assets/mascot_icon_2048.png</files>
  <action>Run the two offline asset operations per UI-SPEC Asset Treatment using Windows-built-in .NET only (`Add-Type -AssemblyName System.Drawing` in throwaway PowerShell snippets kept in the temp workspace, NOT committed — Pillow is not installed and no pip install is permitted this phase). (1) Mascot: load `apps/web/public/mascot_icon.png` (2048×2048, 2,054,860 B), KEEP the blue rounded-square frame (do not strip it; no CSS border-radius is ever added to it), draw it to 512×512 Format32bppArgb with HighQualityBicubic interpolation, save as `apps/web/public/mascot_512.png`, then measure: plain resize measured 191,795 B (>150 KB), so posterize RGB channels to 5 bits (byte-band each channel with 0xF8) and re-save — measured 77,797 B (≤150 KB); if a re-run still exceeds 153,600 B, fall back to a 256-color indexed PNG (GDI+ indexed PNG save verified working). Then move the 2048 original out of `public/` to `apps/web/assets/mascot_icon_2048.png` (create the directory) so the 2 MB source never ships in the PWA bundle. (2) Wordmark: first SAMPLE the four corners of `apps/web/public/BICOL_IN_HEAT.png` — as of 2026-11-14 they are already alpha 0 (pre-processed), so in that case do nothing but assert. Only if a corner is opaque, color-key the flat background: background color = corner pixel; pixels within tolerance (RGB distance ≤24) → alpha 0, feather band (24–48) → linear partial alpha, all other pixels untouched; write 32bppArgb back to the same path with ≤1 px anti-aliased edge and no gray halo at 200 % zoom. Both files are one-time offline operations, never runtime. Per UI-SPEC Asset Treatment Decisions (both rows).</action>
  <verify>
    <automated>Add-Type -AssemblyName System.Drawing; $m=[System.Drawing.Bitmap]::new('apps/web/public/mascot_512.png'); if($m.Width -ne 512 -or $m.Height -ne 512){$m.Dispose(); throw 'mascot not 512x512'}; $m.Dispose(); if((Get-Item 'apps/web/public/mascot_512.png').Length -gt 153600){throw 'mascot over 150KB'}; $w=[System.Drawing.Bitmap]::new('apps/web/public/BICOL_IN_HEAT.png'); foreach($p in @(@(0,0),@($w.Width-1,0),@(0,$w.Height-1),@($w.Width-1,$w.Height-1))){if($w.GetPixel($p[0],$p[1]).A -ne 0){$w.Dispose(); throw 'wordmark corner not alpha 0'}}; $w.Dispose(); if(-not (Test-Path 'apps/web/assets/mascot_icon_2048.png')){throw '2048 original not moved to apps/web/assets/'}; if(Test-Path 'apps/web/public/mascot_icon.png'){throw '2MB original still in public/'}; 'assets ok'</automated>
  </verify>
  <done>`mascot_512.png` is 512×512 and ≤150 KB with the blue frame intact; all four wordmark corners are alpha 0 with glyphs untouched (visual check at 200 % zoom: no gray halo); the 2048 mascot original lives in `apps/web/assets/` outside the shipped bundle; `public/` contains no other changed files; no package was installed.</done>
</task>

<!-- planner-discipline-allow: signInWithOAuth -->
<task type="auto">
  <name>Task 3: Extract the single Google OAuth helper (dedupe before the hero adds a third copy)</name>
  <files>apps/web/src/lib/auth.js, apps/web/src/app.jsx, apps/web/src/components/AuthButton.jsx</files>
  <action>Create `apps/web/src/lib/auth.js` exporting `signInWithGoogle(supabase)` — the exact call currently duplicated at app.jsx:120-131 (`handleSignIn`: provider google, `redirectTo: window.location.origin`, `queryParams: { prompt: 'select_account' }`) and AuthButton.jsx:71-82 — plus a `googleOAuthUnavailable(supabase, configured)` predicate returning true when `!supabase || !configured`. Refactor `app.jsx` `handleSignIn` and `AuthButton.jsx`'s submit handler to consume the helper so exactly ONE OAuth call implementation remains in the codebase (inside lib/auth.js). Preserve AuthButton's existing error string `Sign-in failed — try again` and its unconfigured pill behavior byte-for-byte — this task dedupes the call, it does not change auth UX. The landing Google CTA (Task 5) consumes the same helper; do not build it here. Per UI-REVIEW (c).</action>
  <verify>
    <automated>node -e "const{execSync}=require('child_process');execSync('npm --prefix apps/web run build',{stdio:'inherit'});const fs=require('fs');const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(d+'/'+e.name):[d+'/'+e.name]);const impl=fs.readFileSync('apps/web/src/lib/auth.js','utf8');if(!impl.includes('signInWithOAuth'))throw new Error('helper missing OAuth call');const hits=walk('apps/web/src').filter(f=>(f.endsWith('.js')||f.endsWith('.jsx'))&&!f.endsWith('lib/auth.js')&&fs.readFileSync(f,'utf8').includes('signInWithOAuth'));if(hits.length)throw new Error('OAuth call sites outside lib/auth.js: '+hits.join(', '));console.log('single OAuth site ok')"</automated>
  </verify>
  <done>`src/lib/auth.js` exists; the OAuth call implementation appears in exactly one file under `apps/web/src` (lib/auth.js); `npm run build` passes; AuthButton sign-in / unconfigured / error flows behave identically to before (manual spot-check: button click still initiates Google OAuth when configured).</done>
</task>

<task type="auto">
  <name>Task 4: Clay token layer + self-hosted fonts + landing scroll-container CSS (theme seam foundation)</name>
  <files>apps/web/src/index.css, apps/web/tailwind.config.js, apps/web/index.html, apps/web/public/fonts/Fredoka-600.woff2, apps/web/public/fonts/Nunito-400.woff2, apps/web/public/fonts/Nunito-600.woff2</files>
  <action>Build the light-clay foundation exactly per UI-SPEC Token Block + Responsive + Motion universal rules, without disturbing the dark app. (1) In `src/index.css`, add a `/* landing clay */` block defining `--clay-outer`, `--clay-inset`, the clay press classes `.clay-btn` (200 ms ease-out, translateY(-2px) hover / scale(0.97) active), `.clay-card`, `.clay-chip`, and the universal clay focus ring `outline: 3px solid #0F172A; outline-offset: 2px` — all scoped under `.landing-root` (or `data-theme="clay"` on the landing subtree), NEVER on `:root`; do not flip `color-scheme`, do not touch the `body` background. Extend the EXISTING global `prefers-reduced-motion` block (index.css:228-243) so `.clay-btn` also gets `transition-duration: 0.01ms` + `transform: none`. Define `.landing-root` itself: `overflow-y: auto; overflow-x: clip; scroll-behavior: smooth; background: #FFF7ED` — this IS the scroll-container strategy (UI-REVIEW (a) option 1): `html/body` keep `overflow: hidden/clip`, the landing root owns the single scrollbar, and every ScrollTrigger will pass `scroller:` pointing at this element (Task 9). (2) In `tailwind.config.js` `theme.extend`: clay colors (`clay-bg #FFF7ED`, `clay-surface #FFFFFF`, `clay-border #FED7AA`, `clay-ink #9A3412`, `clay-orange #F97316`, `clay-on-orange #0F172A`, `clay-accent #2563EB`), `fontFamily.clay-heading` (Fredoka fallback stack) and `fontFamily.clay-body` (Nunito fallback stack), the clay shadows, and radii 16/24/pill. Extend — do not replace — the existing `heat.*` palette. (3) Fonts: download the OFL woff2 files (latin subset) for Fredoka 600 and Nunito 400/600 from the Google Fonts static host (css2 API reachable, verified 2026-11-14) into `public/fonts/` with exactly the filenames above; add `@font-face` rules with `font-display: swap` in index.css; add `<link rel="preload" as="font" type="font/woff2" crossorigin>` for each in `index.html` `<head>`. If the download becomes unreachable, stop and report — do NOT substitute a CDN import (breaks the offline PWA contract). Per UI-SPEC Design System + UI-REVIEW (d).</action>
  <verify>
    <automated>node -e "const{execSync}=require('child_process');execSync('npm --prefix apps/web run build',{stdio:'inherit'});const fs=require('fs');const css=fs.readFileSync('apps/web/src/index.css','utf8');const tw=fs.readFileSync('apps/web/tailwind.config.js','utf8');const html=fs.readFileSync('apps/web/index.html','utf8');for(const f of ['Fredoka-600','Nunito-400','Nunito-600']){if(!fs.existsSync('apps/web/public/fonts/'+f+'.woff2'))throw new Error('missing font '+f);if(!html.includes(f+'.woff2'))throw new Error('missing preload '+f)}for(const t of ['--clay-outer','.clay-btn','.landing-root','#0F172A'])if(!css.includes(t))throw new Error('missing css '+t);if(!tw.includes('clay-bg'))throw new Error('missing tailwind clay tokens');if(/color-scheme:\s*light/.test(css))throw new Error('root color-scheme flipped');if(!css.includes('--bih-bg'))throw new Error('dark app bg token lost');console.log('clay foundation ok')"</automated>
  </verify>
  <done>All three woff2 files exist in `public/fonts/` with preload links and `font-display: swap`; the clay token block is scoped to the landing subtree (no `--clay-` definition at `:root`, no `color-scheme` change, `body` background untouched); reduced-motion block covers `.clay-btn`; `npm run build` passes.</done>
</task>

<task type="auto">
  <name>Task 5: Tracer — wire the landing screen end-to-end (default screen, scroll root, both hero CTAs, one path to the map)</name>
  <files>apps/web/src/screens/LandingScreen.jsx, apps/web/src/app.jsx</files>
  <action>Prove the architecture on one full path before building out content. (1) Create `src/screens/LandingScreen.jsx` as a thin but production-quality skeleton: `<main id="main" className="flex-1 min-h-0 overflow-y-auto bih-scroll landing-root">` containing the §1 Hero only (brand row: `mascot_512.png` at 72/96 px `alt="" aria-hidden` + `BICOL_IN_HEAT.png` height 40/32 `alt="Bicol In-Heat"`, eyebrow chip "2026 NASA Space Apps Challenge", the single H1 hook verbatim from UI-SPEC Copywriting, sub, and the 2 hero CTAs as real `<button>`s), plus `aria-hidden` decorative layer placeholders (no motion yet). Primary CTA "Explore as guest" → `navigate('map')` — the existing guest progress model needs no new state (`createProgress({ userId: null })` already derives from `user?.id ?? null`, app.jsx:53); after the screen swap, move focus to the map's `#main`. Secondary CTA "Continue with Google": consume Task 3's helper — when `googleOAuthUnavailable(...)` renders it `disabled` + `aria-disabled="true"` + `title="VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing"` + 48 % opacity with the label unchanged; error path renders `<span role="alert">Sign-in failed — try again</span>` beside the CTA. (2) In `app.jsx`: default `useState(() => (parseMuniHash() ? 'map' : 'landing'))` so `#muni=` deep links still win (h44); add the `navigate('landing')` branch (sets `screen='landing'`, `focusTab=null` — navigate has no default case, so without this branch Home/landing navigation silently no-ops); render LandingScreen in a THIRD branch (not the spacer branch) with NO `--bih-nav-clear` spacer; hide `NavBar` when `screen === 'landing'` (dark HUD clashes with cream and duplicates the brand row — UI-SPEC Entry Flow #5) while keeping it mounted unchanged on every other screen; keep the skip link pointing at `#main`. Per UI-SPEC Entry/Auth Flow contract rows 1, 2, 3, 5, 6 + UI-REVIEW (a).</action>
  <verify>
    <automated>node -e "const{execSync}=require('child_process');execSync('npm --prefix apps/web run build',{stdio:'inherit'});const fs=require('fs');const app=fs.readFileSync('apps/web/src/app.jsx','utf8');const land=fs.readFileSync('apps/web/src/screens/LandingScreen.jsx','utf8');if(!/parseMuniHash\(\)\s*\?\s*'map'\s*:\s*'landing'/.test(app))throw new Error('default screen not wired');if((app.match(/target === 'landing'/g)||[]).length!==1)throw new Error('navigate landing branch missing');if((land.match(/<h1[\s>]/g)||[]).length!==1)throw new Error('hero must carry the single h1');if(!/id=.main./.test(land))throw new Error('main id missing - skip link would break');console.log('tracer path ok')"</automated>
  </verify>
  <done>Manual smoke (preview server): (a) plain load → landing hero visible, no NavBar floating over it, page scrolls inside `.landing-root` with no second document scrollbar; (b) load with `#muni=bato%7Ccamarines%20sur` logged-out → map opens with selection, landing skipped; (c) hero "Explore as guest" → map + guest progress; (d) with env vars removed, Google CTA is disabled with title tooltip; (e) Tab order: skip link → hero primary → hero Google; (f) `npm --prefix apps/web run build` passes.</done>
</task>

<task type="auto">
  <name>Task 6: Build the full 5-section clay page (Problem, How-it-works, Trust+climax, Footer) to spec copy</name>
  <files>apps/web/src/screens/LandingScreen.jsx</files>
  <action>Expand LandingScreen to the exact UI-SPEC section structure — §1 Hero (done in Task 5, keep), §2 Problem, §3 How-it-works, §4 Trust closing with the climax band, §5 Footer — in that DOM order, using only verbatim spec copy (H2s, body, badge strings, trust-card lines, footer attribution columns; the copy is already transcribed in UI-SPEC — author nothing new). Anti-clutter contract enforced in markup: exactly one `<h1>` (hero), `<h2>` per section, exactly 3 elements carrying the clay CTA button treatment (hero primary, hero Google, climax "Explore as guest" — the climax one inverted white-on-blue per spec; preview cards and trust cards are NOT links/buttons), one idea per section, decorative art `aria-hidden` `pointer-events: none` behind content. Danger tile §2 (orange `#F97316` fill, `#0F172A` text, "42–51 °C"), source badges §3 with inline 16 px SVGs, three static preview cards reusing `IconMap/IconTrophy/IconGrid`, four trust cards with `IconCheck` in an orange chip, climax band `#2563EB`, footer 3 columns with the exact attribution/licence/challenge strings and 24/20 px asset reuses. OMIT the §3 seed-contrast card entirely — its gate (2 demo seeds wired) is not met (apps/web/AGENTS.md workboard: todo); note the omission in the SUMMARY for the lead. Orange `#F97316` appears only as surface fill with `#0F172A` labels — never as text color; `#2563EB` only on its four reserved uses. All images carry width/height attrs; spacing follows the 4-based scale with 48/64/96 section padding-y. Per UI-SPEC sections §2–§5 + Claims map + anti-clutter contract.</action>
  <verify>
    <automated>node -e "const{execSync}=require('child_process');execSync('npm --prefix apps/web run build',{stdio:'inherit'});const fs=require('fs');const s=fs.readFileSync('apps/web/src/screens/LandingScreen.jsx','utf8');const count=re=>(s.match(re)||[]).length;if(count(/<h1[\s>]/g)!==1)throw new Error('h1 count wrong');if(count(/<h2[\s>]/g)!==4)throw new Error('expected 4 h2 for sections 2-5');if(count(/clay-btn/g)<3)throw new Error('CTA classes missing: '+count(/clay-btn/g));for(const t of ['42–51','Theil-Sen','Mann-Kendall','association','geoBoundaries','Be An Earth System Trend Detective','Explore as guest','Continue with Google'])if(!s.includes(t))throw new Error('missing copy: '+t);for(const bad of ['Bicolano','FIRMS','ECOSTRESS','IMERG','barangay'])if(s.includes(bad))throw new Error('OUT claim present: '+bad);console.log('sections ok')"</automated>
  </verify>
  <done>All 5 sections render with verbatim spec copy; DOM contains exactly 1 h1 and 4 h2; the page exposes exactly 3 CTA buttons; zero OUT/STRETCH claims (verify greps); seed-contrast card absent with reason recorded; every text pair meets the UI-SPEC contrast table (6.9 / 7.3 / 5.17 / 6.4 — orange never carries text); `npm --prefix apps/web run build` passes.</done>
</task>

<task type="auto">
  <name>Task 7: AppMenu Home row + IconHome (signed-in path back to landing)</name>
  <files>apps/web/src/components/Icons.jsx, apps/web/src/components/AppMenu.jsx</files>
  <action>Add `IconHome` to `Icons.jsx` following the file's SVG contract (viewBox 0 0 24 24, stroke-width 1.8, `aria-hidden`, currentColor stroke — house glyph). In `AppMenu.jsx` `rows` useMemo, PREPEND `{ label: "Home", icon: IconHome, major: true, onClick: () => navigate("landing") }` gated on `user` using the existing signed-in conditional-spread pattern (the same pattern that already gates Settings/Sign-out rows). Do not alter the roving-tabindex machinery, active-row highlight, or row ARIA — rows are data-driven and inherit them. The `navigate('landing')` branch already exists from Task 5. Per UI-SPEC Entry Flow #4 + UI-REVIEW (b).</action>
  <verify>
    <automated>node -e "const{execSync}=require('child_process');execSync('npm --prefix apps/web run build',{stdio:'inherit'});const fs=require('fs');const icons=fs.readFileSync('apps/web/src/components/Icons.jsx','utf8');const menu=fs.readFileSync('apps/web/src/components/AppMenu.jsx','utf8');if(!icons.includes('IconHome'))throw new Error('IconHome missing from Icons.jsx');if(!menu.includes('IconHome'))throw new Error('Home row not wired to IconHome');if(!/label:\s*.Home./.test(menu))throw new Error('Home row label missing');if(!/navigate\(.{0,20}landing/.test(menu))throw new Error('Home row not wired to navigate landing');console.log('home row ok')"</automated>
  </verify>
  <done>Signed-in session: AppMenu opens with Home as the first row, Enter/click navigates to the landing screen and the menu closes with focus handled as before; guest session: no Home row (row array otherwise unchanged); `npm --prefix apps/web run build` passes.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking-human">
  <name>Task 8: Package-legitimacy gate — confirm gsap@3.15.1 before install (never auto-approved)</name>
  <what-built>Everything up to the gsap install: focus-ring gate, assets, clay foundation, wired landing screen, full 5-section page, Home row — all committed and build-green. The gsap dependency is NOT yet installed; this checkpoint exists because `gsd-tools package-legitimacy check --ecosystem npm gsap` returned verdict **SUS (reason: "too-new" — published 2026-11-04, ~10 days old)** and protocol requires a human to see a SUS package before it enters package.json.</what-built>
  <how-to-verify>Confirm this is the real GSAP before approving (evidence already gathered by the agent — you only judge it):
    1. npmjs.com/package/gsap — maintainer `greensock <info@greensock.com>`, ~8.15 M weekly downloads, repository github.com/greensock/GSAP (the official GreenSock org), not deprecated, no install/postinstall script.
    2. License: "Standard 'no charge'" (gsap.com/standard-license) — already verified in UI-SPEC Registry Safety on 2026-11-14; Standard tier fits this project's use.
    3. Version pin: package.json will get exactly `gsap@^3.15.1` (locked UI-SPEC decision); registry tarball `https://registry.npmjs.org/gsap/-/gsap-3.15.1.tgz`, dist.integrity `sha512-63yjWRFWj3QRP1UOuD8kcidCcy3nxb1mMRpwHr/xJRvPfm9GtWOXFAYUiL0ro1fgPq2nY53LR+98pAgy9BumBg==` (npm records and enforces this in package-lock.json on install).
    4. The only SUS signal is recency — no typosquat/maintenance/ownership signals fired.
    Typical approval: this is the official package; a rejection means the lead must supply an alternate motion approach (locked UI-SPEC decision would need lead action).</how-to-verify>
  <resume-signal>Type "approved" to install gsap@3.15.1 (Task 9 proceeds), or describe the issue</resume-signal>
</task>

<task type="auto">
  <name>Task 9: GSAP 3.15.1 parallax + entrances, scroller-bound, reduced-motion static</name>
  <files>apps/web/package.json, apps/web/src/screens/LandingScreen.jsx</files>
  <precondition>Task 8 checkpoint approved ("approved" resume signal) — do not install gsap without it.</precondition>
  <reversibility rating="costly">Adds a runtime dependency to the shipped PWA bundle; removal later requires motion rework (UI-SPEC locked decision).</reversibility>
  <action>ONLY after Task 8 approval: add `gsap@3.15.1` to `apps/web/package.json` and install it (registry-tarball integrity per checkpoint evidence; lockfile update only — no other dependency changes in the same commit). Import and `registerPlugin(ScrollTrigger)` ONLY from LandingScreen (never app.jsx top-level). Implement the Motion Spec exactly: `gsap.matchMedia()` — under `(prefers-reduced-motion: no-preference)` create everything, under `(prefers-reduced-motion: reduce)` create NOTHING (elements stay at CSS final state; a failed/absent GSAP load still leaves the page readable because all entrances use `gsap.from` on base DOM that is already the final state). Every trigger passes `scroller:` = the landing-root element from Task 4 — a trigger left on the document scroller never fires under `html/body overflow:hidden`. Parallax ONLY on decorative `aria-hidden` layers (hero 3, §2 2, §3 2, §4 2, footer 0), `yPercent` −12…+15, `scrub: 0.6`, `start: 'top bottom'`, `end: 'bottom top'`; NEVER on copy, cards with text, badges, or buttons. Hero entrance on mount (brand → H1 → sub → CTAs, 500 ms power2.out, stagger 80 ms, complete ≤700 ms); §2–§4 container entrances `once: true` at `top 80%`. Mobile ≤767: no scrub layers at all — entrances only, y 12, 400 ms. `visibilitychange` → hidden: `gsap.ticker.sleep()` + disable all triggers; visible: enable + `ScrollTrigger.refresh()` + wake. After wiring, measure the built `index` chunk gzip against the recorded baseline (320.40 kB gz pre-phase): if landing + gsap pushes it beyond ~60 kB gz over baseline, convert the LandingScreen import in app.jsx to `React.lazy` with a minimal Suspense fallback so map-first loads don't pay for gsap; record actual chunk sizes either way. Per UI-SPEC Motion Spec.</action>
  <verify>
    <automated>node -e "const{execSync}=require('child_process');execSync('npm --prefix apps/web run build',{stdio:'inherit'});const fs=require('fs');const zlib=require('zlib');const land=fs.readFileSync('apps/web/src/screens/LandingScreen.jsx','utf8');const pkg=JSON.parse(fs.readFileSync('apps/web/package.json','utf8'));if(!pkg.dependencies||!pkg.dependencies.gsap)throw new Error('gsap not declared in package.json');if(!pkg.dependencies.gsap.startsWith('3.15.'))throw new Error('gsap version not 3.15.x: '+pkg.dependencies.gsap);if((land.match(/scroller/g)||[]).length<1)throw new Error('scroller option missing');if((land.match(/matchMedia/g)||[]).length<1)throw new Error('reduced-motion matchMedia missing');if(!/ScrollTrigger/.test(land))throw new Error('ScrollTrigger missing');const dir='apps/web/dist/assets';const table=fs.readdirSync(dir).filter(f=>f.endsWith('.js')).map(f=>({f:f,g:zlib.gzipSync(fs.readFileSync(dir+'/'+f)).length})).sort((a,b)=>b.g-a.g);for(const c of table)console.log(c.f,c.g+'B gz');const idx=table.find(c=>c.f.startsWith('index-'));if(!idx)throw new Error('index chunk missing');console.log('index gz baseline 320400B pre-phase, now '+idx.g+'B');console.log('motion wiring ok')"</automated>
  </verify>
  <done>Reduced-motion render check (Chrome `--headless=new --force-prefers-reduced-motion` against `npm run preview` — flag verified working): all 5 sections render in final position, zero tween-driven movement, clay press transform disabled. Normal motion: decorative layers parallax on scroll inside the landing root, content/cards never move on scrub, hero entrance completes ≤700 ms, tab-hidden ticker sleeps (no rAF work). Mobile 375: no scrub layers. Bundle: gsap lands in the landing chunk or the index chunk stays within +60 kB gz of the 320.40 kB baseline — actual chunk sizes recorded in the SUMMARY; `npm --prefix apps/web run build` passes.</done>
</task>

<task type="auto">
  <name>Task 10: Milestone verification loop — build, screenshots, flows, contrast, logged-out links, offline</name>
  <files>.planning/guest-landing-verify/ (screenshots + notes only — PNGs are gitignored by .planning/.gitignore)</files>
  <action>Run the full acceptance loop against `npm --prefix apps/web run preview` (start it with `Start-Process cmd.exe -ArgumentList '/c','npm --prefix apps/web run preview'` — plain `Start-Process npm` fails because npm is npm.cmd) and record evidence in `.planning/guest-landing-verify/`. (1) Build: `npm --prefix apps/web run build` clean. (2) Screenshots with headless Chrome (verified recipe): `& 'C:\Program Files\Google\Chrome\Application\chrome.exe' --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$env:TEMP\opencode\gl-plan-<n>" --window-size=W,H --screenshot=<out> --virtual-time-budget=8000 http://localhost:4173/` — capture for each of 375×812, 768×1024, 1024×768, 1440×900: one viewport shot (hero first-glance) AND one tall shot (`--window-size=W,8000`, captures the whole page because the landing root grows with the viewport) = ≥8 PNGs named `{w}x{h}.png` / `{w}x{h}-full.png`. (3) Reduced-motion pass: re-shoot the 1440 hero with `--force-prefers-reduced-motion` (flag verified) — content must sit at final position; cross-check Task 9's code gate. (4) Contrast: the automated verify below computes every UI-SPEC pair from the actual token hexes; record the ratios in the notes. (5) Offline/fonts: re-shoot with `--log-net-log=$env:TEMP\opencode\gl-netlog.json` then assert the log contains zero `fonts.gstatic.com` / `fonts.googleapis.com` requests (self-hosted fonts only) — record the result. (6) Manual flows (do what headless can, log the rest): guest CTA (hero + climax) → map with local progress; Google CTA → disabled state with title when Supabase unconfigured, OAuth redirect when configured; error string path; signed-in Home row → landing. (7) Keyboard: skip link → hero primary → hero Google → (scroll) climax CTA → footer links, no trap, focus ring visible on every stop including `.bih-btn` amber (Task 1 spot-check). (8) h44: open the built app logged-out in a fresh `--user-data-dir` — default landing renders, `#muni=` deep link opens the map, footer/challenge links resolve (none point at unwired features). (9) Scroll regression: map/account/settings screens show no document scrollbar and their scrolling still works (Task 4 must not have leaked). (10) Write `.planning/guest-landing-verify/SUMMARY-notes.md`: chunk sizes vs baseline, contrast table, flow checklist, omitted seed-card note, answers needed from the lead (open questions below).</action>
  <verify>
    <automated>node -e "const{execSync}=require('child_process');execSync('npm --prefix apps/web run build',{stdio:'inherit'});const fs=require('fs');const dir='.planning/guest-landing-verify';if(!fs.existsSync(dir))throw new Error('evidence dir missing');const pngs=fs.readdirSync(dir).filter(f=>f.endsWith('.png'));if(pngs.length<8)throw new Error('need at least 8 screenshots (4 viewports x viewport+full), found '+pngs.length);if(!fs.existsSync(dir+'/SUMMARY-notes.md'))throw new Error('SUMMARY-notes.md missing');const css=fs.readFileSync('apps/web/src/index.css','utf8');const tw=fs.readFileSync('apps/web/tailwind.config.js','utf8');for(const h of ['#FFF7ED','#F97316','#2563EB','#9A3412','#FED7AA','#0F172A'])if(!(tw.includes(h)||css.includes(h)))throw new Error('clay token hex missing: '+h);const lum=h=>{const v=[1,3,5].map(i=>parseInt(h.substring(i,i+2),16)/255).map(x=>x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4));return .2126*v[0]+.7152*v[1]+.0722*v[2]};const cr=(a,b)=>{const p=[lum(a),lum(b)].sort((x,y)=>y-x);return (p[0]+.05)/(p[1]+.05)};const pairs=[[['#9A3412','#FFF7ED'],4.5],[['#9A3412','#FFFFFF'],4.5],[['#FFFFFF','#2563EB'],4.5],[['#0F172A','#F97316'],4.5],[['#2563EB','#FFF7ED'],4.5],[['#FFFFFF','#FED7AA'],4.5]];const seen={};for(const [[a,b],min] of pairs){const k=a+b;if(seen[k])continue;seen[k]=1;const r=cr(a,b);if(r<min)throw new Error('contrast '+a+' on '+b+' = '+r.toFixed(2)+' need '+min)}console.log('evidence + contrast ok:',pngs.length,'pngs')"</automated>
    <human-check>End-of-phase UAT batch (workflow.human_verify_mode=end-of-phase): (1) Guest flow — click "Explore as guest" from hero AND climax band, land on map with local-only progress, focus on #main; (2) Google CTA — configured: OAuth redirect starts; unconfigured: disabled + aria-disabled + title; forced failure shows 'Sign-in failed — try again' role=alert; (3) Signed-in AppMenu shows Home first → returns to landing; (4) Reduce-motion: page fully readable, nothing animates; (5) 375/768/1024/1440 screenshots look uncluttered, hook lands at first glance, both assets visible (mascot + wordmark); (6) h44 — fresh private window logged-out: default landing, #muni= deep link opens map, every footer link resolves; (7) Keyboard walk with visible focus at every stop.</human-check>
  </verify>
  <done>All automated checks pass with evidence on disk (≥8 screenshots, contrast table with per-pair ratios, net-log showing zero third-party font requests, chunk sizes vs baseline); every human-check item recorded as PASS/FAIL in SUMMARY-notes.md with any failure fixed in the owning task and this loop re-run; SUMMARY-notes.md contains the seed-card omission note and the open questions for the lead.</done>
</task>

</tasks>

<dependency_graph>
## Task dependency graph (needs → creates)

| Task | Needs | Creates | Wave |
|------|-------|---------|------|
| T1 focus-ring | — | `--focus-ring` token in index.css | 1 |
| T2 assets | — | mascot_512.png, transparent-verified wordmark, assets/ original | 1 |
| T3 oauth dedupe | — | lib/auth.js; single OAuth implementation site | 1 |
| T4 clay+fonts+scroll CSS | T1 (index.css ownership) | clay block, .landing-root scroller, fonts, tailwind tokens | 2 |
| T5 tracer wiring | T2 (hero assets), T3 (Google CTA), T4 (clay classes, scroller CSS) | LandingScreen skeleton, default screen, navigate branch, NavBar seam | 3 |
| T6 5-section content | T5 (component + wiring) | full section markup | 4 |
| T7 Home row | T5 (`navigate('landing')` branch) | IconHome, gated Home row | 4 |
| T8 legitimacy checkpoint | T5 (tracer slice proven) | human approval record → unlocks gsap install | 4 |
| T9 GSAP motion | T6 (final markup), T8 (approval), T4 (scroller element) | gsap dep, parallax/entrances | 5 |
| T10 verification | T1–T9 | evidence + SUMMARY-notes | 6 |

Parallelism: T1 ∥ T2 ∥ T3 (wave 1, zero file overlap — asset prep, focus gate, OAuth run concurrently); T6 ∥ T7 ∥ T8 (wave 4, zero file overlap — content, menu row, and the human checkpoint proceed independently; the checkpoint ends execution segment 1). index.css is owned sequentially T1 → T4; app.jsx T3 → T5; LandingScreen.jsx T5 → T6 → T9. The checkpoint partitions Pattern-B execution: segment 1 = T1–T8, segment 2 = T9–T10.
</dependency_graph>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → static bundle | Guest loads a public PWA; landing content is static files, but the bundle must contain zero secrets (Supabase anon key only). |
| Landing CTA → Supabase OAuth | "Continue with Google" crosses from the public page into the auth provider via the existing anon client. |
| npm/font installs → build | New artifacts (gsap, 3 woff2 files) enter the supply chain from the internet. |
| Landing (light) ↔ app (dark) | Theme seam: clay namespace must not leak into dark screens or flip root color-scheme. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-GL-01 | Information Disclosure | Landing bundle / env | high | mitigate | No new env vars; Google CTA uses the existing anon client only (apps/web AGENTS: zero API keys in client). T10 build output scanned for secrets before close-out. |
| T-GL-02 | Tampering | npm install (gsap) | high | mitigate | Tool verdict SUS ("too-new") → **T8 blocking-human checkpoint** with maintainer/repo/integrity evidence before install; then pin `^3.15.1`, lockfile-only diff, registry tarball integrity enforced by npm. Never auto-approved. |
| T-GL-03 | Tampering | Font download (fonts.gstatic.com) | medium | mitigate | woff2 files fetched once at build prep, committed as static assets — runtime never contacts Google. T10 net-log assertion proves zero third-party font requests. |
| T-GL-04 | Spoofing | Google OAuth CTA | medium | mitigate | Single shared helper (T3) with `redirectTo: window.location.origin`; disabled state when unconfigured prevents a dead/phishing-looking button; error surfaced via `role="alert"`. |
| T-GL-05 | Tampering | Theme seam (clay vs dark) | low | accept | Scoped tokens only; residual risk is cosmetic leakage — covered by T10 scroll/theme regression check. |
| T-GL-06 | Elevation of Privilege | Guest → app entry | low | accept | Guest path intentionally uses the existing local-only `userId: null` model; no privilege granted (h30: landing must work signed-out — no new auth surface). |
| T-GL-SC | Tampering | npm/pip/cargo installs | high | mitigate | Only install this phase: gsap (SUS → T8 checkpoint, evidence above). Pillow explicitly NOT installed — image work uses Windows-built-in System.Drawing. No `[SLOP]` packages permitted. |
</threat_model>

<verification>
Milestone gates (each must pass before the next wave starts):

- **M1 (end wave 1):** T1–T3 verifies pass — build green through the single-`node -e` pattern; single OAuth implementation site; focus token present, undefined variable gone; asset assertions green (System.Drawing).
- **M2 (end wave 2):** T4 verify — fonts on disk + preloads, clay block scoped, `.landing-root` present, `body` background and `--bih-bg` intact.
- **M3 (end wave 3):** T5 manual smoke (a)–(f) — the tracer path including `#muni=` logged-out deep link.
- **M4 (end wave 4):** T6 + T7 verifies — section/copy/CTA-count gates, Home row signed-in behavior; **T8 human approval recorded before segment 2 starts** (blocking-human, never auto-approved).
- **M5 (end wave 5):** T9 — reduced-motion static render, scroller-bound triggers, chunk sizes recorded vs 320.40 kB gz baseline.
- **M6 (phase close):** T10 full loop: automated evidence gates + human-check batch recorded in SUMMARY-notes.md.

Overall phase checks: `npm --prefix apps/web run build` passes after every task; final state satisfies every `must_haves.truths` entry; no file outside `apps/web/**` (plus `.planning/guest-landing-verify/` evidence) was modified.
</verification>

<success_criteria>
- Guest default → clay landing; `#muni=` → map; both hero CTAs + climax CTA work; signed-in Home row returns to landing.
- Audit gates closed: visible focus ring on amber buttons (B1), landing scrolls in its own container with no document scrollbar (overflow strategy).
- Reduced-motion renders static final state; contrast pairs ≥4.5:1; keyboard order = DOM order with visible focus; no scroll-jack.
- Assets: mascot 512 ≤150 KB with blue frame, wordmark transparent, both used (hero + footer); self-hosted fonts load offline (net-log: zero third-party font requests).
- Exactly 5 sections, 1 H1, 3 CTAs, only CONCEPT §8 CORE claims, seed-contrast card omitted (gate unmet).
- gsap installed only after the T8 human approval; lockfile diff contains gsap and nothing else.
- Evidence bundle in `.planning/guest-landing-verify/` (≥8 screenshots across 4 viewports, contrast table, flow checklist, chunk sizes, SUMMARY-notes.md).
</success_criteria>

<output>
Create `.planning/guest-landing-verify/SUMMARY-notes.md` when T10 completes (evidence notes; PNGs are gitignored). Commit message for this planning step: `docs(guest-landing): create phase plan` covering `.planning/PLAN.md` only.
</output>

## Multi-Source Coverage Audit

| Source | Item | Covered by | Status |
|--------|------|-----------|--------|
| GOAL | (no ROADMAP.md — phase goal taken from UI-SPEC frontmatter + brief: guest landing that hooks at first glance, uncluttered, both assets, guest + Google entry, signed-in Home path) | whole plan + must_haves | COVERED |
| REQ | UI-SPEC (single key `UI-SPEC`): default landing + deep links | T5 | COVERED |
| REQ | UI-SPEC: 5 sections / 3 CTAs / verbatim copy / anti-clutter | T6 | COVERED |
| REQ | UI-SPEC: clay tokens + Fredoka/Nunito self-hosted woff2 | T4 | COVERED |
| REQ | UI-SPEC: gsap 3.15.1 ScrollTrigger, scroller constraint, reduced-motion, decorative-only parallax | T8 (gate) + T9 | COVERED |
| REQ | UI-SPEC: Entry flow — guest CTA, Google CTA (deduped), Home row, NavBar hidden, focus to #main | T3+T5+T7 | COVERED |
| REQ | UI-SPEC: asset treatment (mascot derivative ≤150 KB, wordmark alpha) | T2 | COVERED |
| REQ | UI-SPEC: A11y contract (contrast, focus, keyboard, semantics) | T1+T4+T6+T10 | COVERED |
| RESEARCH/UI-REVIEW | B1 focus-ring BLOCKER | T1 (wave 1) | COVERED |
| RESEARCH/UI-REVIEW | html/body overflow:hidden scroll-container strategy | T4 (CSS) + T5 (wiring) + T9 (`scroller:`) | COVERED |
| RESEARCH/UI-REVIEW | (c) OAuth dedupe | T3 | COVERED |
| RESEARCH/UI-REVIEW | (d) theme seam / NavBar clash / JS reduced-motion guard | T4+T5+T9 | COVERED |
| PROTOCOL | Package legitimacy: gsap SUS verdict → blocking human before install | T8 | COVERED |
| CONTEXT | h30: landing works fully signed-out (auth exists) | T5 disabled-state contract + T10 human-check (2) | COVERED |
| CONTEXT | h44: links resolve logged-out | T10 human-check (6) | COVERED |
| CONTEXT | Only CONCEPT §8 claims | T6 negative-grep for OUT terms + claims table | COVERED |
| CONTEXT | Demo-video narrative copy (hook, Danger band, methods, contrast, attribution) | T6 verbatim copy | COVERED |
| DEFERRED / GATED | §3 seed-contrast card (seeds not wired) | omitted by gate — recorded for lead | EXCLUDED (gate, not a gap) |
| OUT OF SCOPE | UI-REVIEW majors M1/M2/M3/M4/M5 beyond the two named gates | not in this phase's scope per brief | EXCLUDED |
| ESTIMATE | estimate-check: 130 K tokens = 1.30× the 100 K smart-zone budget (advisory: split into 2 slices) | kept as ONE file per the explicit brief; advisory recorded here — split only if the lead asks | NOTED |

No unplanned items. Task count is 10 (9 build/verify tasks + 1 blocking checkpoint).

## Open questions for the lead (from UI-SPEC §Open Questions — do not block execution)

1. Signed-in cold load: plan ships spec default (landing for everyone). One `useEffect` to switch to map-after-session if preferred.
2. Home row gating: plan ships signed-in-only per spec row 4; recommend all-users if lead prefers.
3. Seed card: omitted (gate unmet — confirm seeds stay out this phase).
4. `theme-color` stays `#070a0f` (single value, dark chrome on cream page) — confirm.
5. h30 fallback: hide Google CTA, keep guest + climax — pre-agreed, implemented as a 1-line conditional if triggered.
6. H1 hook wording must match the canonical demo-video opening sentence — using UI-SPEC's string verbatim.
7. **gsap legitimacy (T8):** the human checkpoint itself — approve the SUS("too-new") official package to unlock Task 9.

## Risks & mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| ScrollTrigger on document scroller never fires under `html/body overflow:hidden` | Parallax silently dead | `.landing-root` owns scrolling (T4); every trigger passes `scroller:` (T9); M3/M5 verify scroll behavior |
| Light/dark theme seam leaks (root color-scheme, body bg, NavBar) | Visual regression on dark screens | Clay tokens scoped under landing root only; NavBar hidden only when `screen==='landing'`; T10 regression check (9) |
| GSAP bundle growth on the eager map-first path | Slower first paint | gsap imported only in LandingScreen; +60 kB gz threshold over the recorded 320.40 kB baseline → `React.lazy` fallback in T9; chunk sizes recorded |
| Fonts break offline PWA (CDN import) | Non-identical offline render | Self-hosted woff2 + preload (T4); T10 net-log assertion for zero third-party requests |
| h30 auth cut | Google CTA dead weight | Pre-agreed 1-line conditional (spec row 7); guest + climax unaffected — landing never depends on auth |
| Non-CORE claims slip into copy | Challenge-rule violation | T6 greps OUT terms; claims mapped in UI-SPEC table; SUMMARY records seed omission |
| gsap SUS verdict blocks install unprompted | Mid-phase stall | T8 checkpoint presents complete evidence (downloads/repo/integrity) so the lead approves in seconds; documented as needed-from-lead |
| Shell mismatch kills verify commands | False failures | Every `<automated>` command was executed green in this environment before the plan shipped (see environment contract); no `&&`, no grep, no Pillow |
| Font/asset download unreachable at execution | T4/T2 blocked | Both hosts verified reachable 2026-11-14; if they fail at run time, report — never fall back to CDN import |
