# Guest-landing verification notes (Task 10, 2026-11-14)

## Chunk sizes vs baseline

| Chunk | Baseline (pre-phase) | Final | Delta |
|---|---|---|---|
| index (eager) | 1,381.72 kB / **320.40 kB gz** | 1,512.17 kB / **371.31 kB gz** | +50.9 kB gz |
| Municipality3DLayer (lazy) | 1,069.48 kB / 290.62 kB gz | unchanged | 0 |
| vendor | 376.91 kB / 106.91 kB gz | unchanged | 0 |
| charts | 420.57 kB / 119.43 kB gz | unchanged | 0 |
| maps | 153.30 kB / 44.68 kB gz | unchanged | 0 |

- gsap@3.15.1 + ScrollTrigger + motion wiring = **+50.9 kB gz** on the eager chunk — inside the ~60 kB lazy-load threshold from the plan → **React.lazy conversion NOT applied** (no further code change).
- MapLibre still only in the lazy 3D chunk (bundle-split regression check intact).

## Contrast table (computed from shipped token hexes)

| Pair | Ratio | Requirement |
|---|---|---|
| ink `#9A3412` on bg `#FFF7ED` | 6.88 | 4.5 AA |
| ink `#9A3412` on card `#FFFFFF` | 7.31 | 4.5 AA |
| white on accent `#2563EB` (climax band, hero CTA label) | 5.17 | 4.5 AA |
| onprimary `#0F172A` on primary `#F97316` (tiles/chips) | 6.37 | 4.5 AA |
| accent `#2563EB` on bg `#FFF7ED` (footer links) | 4.87 | 4.5 AA |

Border `#FED7AA` is **non-text only** (card/chip/button borders, decorative blobs) — WCAG 1.4.3 does not apply; the plan's `#FFFFFF/#FED7AA` row was a transcription error and is excluded with this note.

`#F97316` never carries text (surface fill only, `#0F172A` labels); `#2563EB` confined to its 4 reserved uses (hero guest CTA fill, climax band bg, footer links, decorative underline hover).

## Flow checklist (headless Chrome CDP, logged out unless noted)

| Check | Result |
|---|---|
| Default load → landing (no NavBar) | PASS |
| `#muni=bato\|camarines sur` opened logged out in a fresh document → map directly, landing skipped (h44) | PASS |
| Skip link → `#main` receives focus | PASS |
| Footer external links present (POWER / PAGASA / geoBoundaries) | PASS |
| H1 verbatim hook, exactly 1 H1 | PASS |
| Exactly 3 CTA buttons (hero guest, Google, climax guest) | PASS |
| Hero "Explore as guest" → map, NavBar returns, focus to #main | PASS |
| AppMenu Home row (all users) → back to landing, focus to #main | PASS |
| Google CTA configured state: enabled, no title | PASS |
| Google error path: "Sign-in failed — try again" role=alert (smoke earlier in phase) | PASS |
| Reduced motion: static final position, 0 parallax transforms, press transform off | PASS |
| Normal motion: 9 decorative layers scrub inside landing root (yPercent −12…+15, scrub 0.6); content/cards never move on scrub | PASS |
| Tab-hidden: ticker sleep + trigger disable wired (code path); visible: enable + refresh + wake | PASS |
| 375px: no horizontal overflow (scrollWidth 375, H1 wraps at 343 px) | PASS |
| Theme seam: `body` stays dark, landing root cream, root color-scheme unchanged | PASS |
| Fonts: zero fonts.gstatic/googleapis page requests (net-log URL_REQUEST audit); both woff2 served from localhost | PASS |
| Scroll regression: map/account/settings untouched (index.css dark block intact, `.bih-scroll` unchanged) | PASS |

## Screenshots (this dir, gitignored)

375x812, 375x812-full, 768x1024, 768x1024-full, 1024x768, 1024x768-full, 1440x900, 1440x900-full, 1440x900-reduced — 9 PNGs, CDP captures (one-shot `--screenshot --virtual-time-budget` mis-renders the entrance window; CDP settled captures used instead).

## Seed-contrast card omission

§3 "Bato vs San Fernando" seed card **intentionally absent**: its gate (2 "Try this" demo seeds wired) is still `todo` on the apps/web workboard. It must not ship as a dead promise. Revisit only when the demo seeds land.

## Deviations (recorded, none blocking)

1. **Hero stagger 50 ms vs spec 80 ms** — spec's own ≤700 ms completion gate wins: 4 rows × 80 ms + 500 ms = 740 ms; at 50 ms: 650 ms. Duration stays 500 ms power2.out as locked.
2. **Hero primary CTA is accent blue** — hero guest CTA carries `.clay-btn--primary` (accent fill) per UI-SPEC's 4-reserved-uses list (hero guest CTA fill). Orange never appears as a CTA fill.

## Open questions for the lead

1. None blocking. The h30/h42/h44 cut lines and OUT-claims sweep come at event weekend; this page's claims map was verified CORE-only (negative-grep clean for Bicolano/FIRMS/ECOSTRESS/IMERG/barangay).
