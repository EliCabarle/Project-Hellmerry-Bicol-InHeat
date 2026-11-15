// Guest landing screen — Claymorphism scroll-storytelling (UI-SPEC, approved
// 2026-11-14). Light clay surface scoped by .landing-root (index.css); the dark
// app theme is untouched. Exactly 5 sections, 1 H1, 3 CTAs — anti-clutter is
// binding. Claims map to CONCEPT §8 CORE only; the Bato vs San Fernando seed
// card stays gated out until the demo seeds are wired. Decorative layers carry
// data-parallax hooks for the GSAP ScrollTrigger pass (T9); without it the page
// renders in its final readable state (gsap.from contract).
import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { IconCheck, IconGrid, IconMap, IconTrophy } from '../components/Icons.jsx'

// Motion engine lives ONLY here (never app.jsx top-level): the 2D bundle must
// stay map-first, and the landing screen is the sole scroll-storytelling owner.
gsap.registerPlugin(ScrollTrigger)

// Official Google "G", inline so the button carries no third-party request.
function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19Z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
    </svg>
  )
}

const GoogleHint = () => (
  <span id="google-hint" className="sr-only">
    VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing
  </span>
)

export default function LandingScreen({ user = null, supabase = null, configured = false, navigate = () => {}, onSignIn = () => {}, onOpenPrivacy = () => {} }) {
  // FLAG-1 contract: the shared async helper's error lands here as the
  // mandated role="alert" string (same copy as AuthButton).
  const [signInError, setSignInError] = useState(null)
  const rootRef = useRef(null)
  const googleDisabled = !configured || !supabase

  const handleGoogle = async () => {
    setSignInError(null)
    const { error } = (await onSignIn?.()) ?? {}
    if (error) setSignInError('Sign-in failed — try again')
  }

  const enterMap = () => navigate('map')

  // Motion Spec (UI-SPEC, locked): the landing root owns the scrollbar
  // (html/body are overflow-hidden), so every trigger passes scroller: root —
  // a trigger left on the document scroller never fires. gsap.matchMedia keeps
  // prefers-reduced-motion users on the static final state (the base DOM IS the
  // final state; entrances are gsap.from), and ≤767px gets entrances only — no
  // scrub layers. Parallax touches decorative aria-hidden layers exclusively.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined

    const revealTargets = root.querySelectorAll('[data-reveal]')
    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference) and (min-width: 768px)', () => {
      const drifts = [
        [-12, 15],
        [15, -12],
        [-10, 12],
        [12, -10],
      ]
      root.querySelectorAll('[data-parallax]').forEach((el, i) => {
        const [a, b] = drifts[i % drifts.length]
        gsap.fromTo(el, { yPercent: a }, {
          yPercent: b,
          ease: 'none',
          scrollTrigger: {
            trigger: el.closest('section') ?? el.parentElement,
            scroller: root,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.6,
          },
        })
      })
      revealTargets.forEach((el) => {
        gsap.from(el, {
          y: 24,
          autoAlpha: 0,
          duration: 0.5,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, scroller: root, start: 'top 80%', once: true },
        })
      })
    })

    // ≤767px: entrances only (y 12, 400 ms) — no scrub layers at all.
    mm.add('(prefers-reduced-motion: no-preference) and (max-width: 767px)', () => {
      revealTargets.forEach((el) => {
        gsap.from(el, {
          y: 12,
          autoAlpha: 0,
          duration: 0.4,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, scroller: root, start: 'top 85%', once: true },
        })
      })
    })

    // Hero entrance on mount: brand → H1 → sub → CTAs. The ≤700 ms completion
    // gate wins over the 80 ms stagger, so the four rows stagger at 50 ms
    // (3 × 50 + 500 = 650 ms).
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const hero = root.querySelector('section')
      if (!hero) return
      gsap.from(hero.querySelectorAll('[data-hero]'), {
        y: 18,
        autoAlpha: 0,
        duration: 0.5,
        ease: 'power2.out',
        stagger: 0.05,
      })
    })

    // Tab hidden: stop all rAF work; visible: re-enable + re-measure.
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        gsap.ticker.sleep()
        ScrollTrigger.getAll().forEach((t) => t.disable())
      } else {
        ScrollTrigger.getAll().forEach((t) => t.enable())
        ScrollTrigger.refresh()
        gsap.ticker.wake()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      mm.revert()
    }
  }, [])

  return (
    <main
      id="main"
      tabIndex={-1}
      ref={rootRef}
      className="landing-root bih-scroll min-h-0 flex-1 overflow-y-auto"
    >
      {/* §1 Hero — Intro hook (first glance, not cluttered). */}
      <section className="relative flex min-h-[88vh] flex-col items-center justify-center px-4 py-12 text-center md:py-16 lg:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            data-parallax="hero-a"
            className="absolute -left-16 top-16 h-44 w-44 rounded-full bg-clay-primary/25 blur-2xl"
          />
          <div
            data-parallax="hero-b"
            className="absolute -right-8 top-40 h-56 w-56 rounded-full bg-clay-border/70 blur-2xl"
          />
          <svg
            data-parallax="hero-c"
            viewBox="0 0 220 40"
            className="absolute bottom-16 left-1/2 h-10 w-[220px] -translate-x-1/2 text-clay-primary/40"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
          >
            <path d="M6 26c22-16 32 10 54-4s32 10 54-4 32 10 54-4 32 10 46-2" />
          </svg>
        </div>

        <div className="relative mx-auto flex max-w-[1120px] flex-col items-center">
          <div data-hero className="flex flex-wrap items-center justify-center gap-4">
            <img
              src="/BICOL_IN_HEAT.png"
              alt="Bicol In-Heat"
              width={201}
              height={40}
              className="h-8 w-auto md:h-10"
            />
          </div>

          <p className="clay-chip mt-6 inline-flex items-center px-4 py-1.5 text-clay-ink">
            2026 NASA Space Apps Challenge
          </p>

          {/* Verbatim hook (lead ruling): a long sentence, so the mobile size
              drops to 28px and the desktop clamp is dropped — keeps the hero
              hook + CTAs on one viewport instead of 8+ wrapped lines. */}
          <h1 data-hero className="mt-6 max-w-[46ch] text-[1.75rem] font-semibold leading-[1.15] text-clay-ink md:text-[3.5rem] md:leading-[1.1]">
            Every dry season in Bicol, the heat index climbs into PAGASA&rsquo;s Danger
            band above 42 degrees Celsius, yet neighboring municipalities heat at
            different rates and existing advisories never show why.
          </h1>

          <p data-hero className="mt-5 max-w-[46ch] text-base leading-relaxed text-clay-ink">
            Bicol In-Heat reads 45 years of NASA data to show which municipalities
            are heating, how fast, and what&rsquo;s driving them.
          </p>

          <div data-hero className="mt-8 flex w-full flex-col items-center justify-center gap-3">
            <span className="contents">
              <GoogleHint />
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleDisabled}
                aria-disabled={googleDisabled || undefined}
                aria-describedby={googleDisabled ? 'google-hint' : undefined}
                title={googleDisabled ? 'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing' : undefined}
                className="clay-btn clay-btn--secondary flex w-full items-center justify-center gap-2 px-7 sm:w-auto"
              >
                <GoogleG />
                Continue with Google
              </button>
            </span>
            <button type="button" onClick={enterMap} className="clay-btn clay-btn--primary px-5 py-2 text-sm">
              Explore as guest
            </button>
          </div>
          {signInError && (
            <span role="alert" className="mt-3 text-sm font-semibold text-clay-ink">
              {signInError}
            </span>
          )}
        </div>
      </section>

      {/* §2 Problem — one idea: advisories tell you what, never why. */}
      <section className="relative px-4 py-12 md:py-16 lg:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            data-parallax="problem-a"
            className="absolute -left-12 bottom-10 h-40 w-40 rounded-full bg-clay-primary/15 blur-2xl"
          />
          <svg
            data-parallax="problem-b"
            viewBox="0 0 40 100"
            className="absolute right-6 top-10 h-24 w-10 text-clay-primary/30"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          >
            <path d="M20 8v10M20 8a8 8 0 0 1 0 0M14 18v40a12 12 0 1 0 12 0V18M20 8v2M20 34v20" />
            <circle cx="20" cy="70" r="10" />
          </svg>
        </div>

        <div data-reveal className="relative mx-auto grid max-w-[1120px] items-center gap-8 md:grid-cols-2 md:gap-12">
          <div>
            <p className="clay-chip inline-flex bg-clay-primary px-4 py-1.5 text-clay-onprimary">
              THE PROBLEM
            </p>
            <h2 className="mt-4 text-[1.625rem] font-semibold leading-[1.2] text-clay-ink md:text-[2rem]">
              Today&rsquo;s advisory tells you what happened &mdash; not what&rsquo;s coming.
            </h2>
            <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-clay-ink">
              PAGASA&rsquo;s Danger band is 42&ndash;51 &deg;C of felt heat index; Extreme
              Danger starts at 52 &deg;C. LDRRMO officers act on advisories that track
              the spike after it happens &mdash; no multi-decade trend, no ranked
              drivers, no answer to why one municipality swelters while its neighbor
              does not.
            </p>
          </div>
          <div className="clay-card clay-card--emphasis flex flex-col items-center gap-2 bg-clay-primary p-8 text-center md:p-10">
            <p className="text-[2.5rem] font-semibold leading-[1.1] text-clay-onprimary md:text-[3.5rem]">
              42&ndash;51 &deg;C
            </p>
            <p className="text-sm font-semibold leading-[1.4] text-clay-onprimary">
              PAGASA Danger heat-index band
            </p>
          </div>
        </div>
      </section>

      {/* §3 How it works — journey + solution. No blue here (accent contract). */}
      <section className="relative px-4 py-12 md:py-16 lg:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            data-parallax="how-a"
            className="absolute right-0 top-24 h-48 w-48 rounded-full bg-clay-border/50 blur-2xl"
          />
          <svg
            data-parallax="how-b"
            viewBox="0 0 120 120"
            className="absolute left-4 top-8 h-24 w-24 text-clay-primary/25"
            fill="currentColor"
          >
            <circle cx="20" cy="30" r="4" />
            <circle cx="95" cy="18" r="3" />
            <circle cx="105" cy="70" r="5" />
            <circle cx="55" cy="100" r="3" />
          </svg>
        </div>

        <div data-reveal className="relative mx-auto max-w-[1120px]">
          <p className="clay-chip inline-flex bg-clay-primary px-4 py-1.5 text-clay-onprimary">
            HOW IT WORKS
          </p>
          <h2 className="mt-4 max-w-[24ch] text-[1.625rem] font-semibold leading-[1.2] text-clay-ink md:text-[2rem]">
            45 years of NASA data, turned into a trend you can act on.
          </h2>

          <ul className="mt-6 flex flex-wrap gap-2">
            {[
              'NASA POWER T2M + RH2M · 1981–2025',
              'Landsat C2 L2 (LST)',
              'MODIS MOD44B + MCD12Q1',
              'SEDAC GPW (exposure)',
            ].map((label) => (
              <li key={label} className="clay-chip px-4 py-1.5 text-clay-ink">
                {label}
              </li>
            ))}
          </ul>

          <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-clay-ink">
            Theil-Sen slope + Mann-Kendall test at &alpha;&nbsp;=&nbsp;0.05 &mdash;
            significance is a flag, never a filter.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                Icon: IconMap,
                title: 'Map',
                line: 'Region V heat layer with time scrubber, municipality tooltips, significance flags.',
              },
              {
                Icon: IconTrophy,
                title: 'Ranking',
                line: 'Municipalities sorted by warming trend and danger-band exceedance, each with slope + significance.',
              },
              {
                Icon: IconGrid,
                title: 'Narration',
                line: 'Plain-language (EN + Filipino) why — drivers ranked, mitigation list, every variable defined.',
              },
            ].map(({ Icon, title, line }) => (
              <article key={title} className="clay-card p-6">
                <span className="clay-chip inline-flex h-10 w-10 items-center justify-center bg-clay-primary text-clay-onprimary">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-sm font-semibold leading-[1.4] text-clay-ink">{title}</h3>
                <p className="mt-2 text-base leading-relaxed text-clay-ink">{line}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* §4 Trust — closes with the single climax CTA band (the only blue block). */}
      <section className="relative px-4 py-12 md:py-16 lg:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            data-parallax="trust-a"
            className="absolute -right-10 bottom-16 h-44 w-44 rounded-full bg-clay-primary/10 blur-2xl"
          />
          <svg
            data-parallax="trust-b"
            viewBox="0 0 120 120"
            className="absolute left-2 top-6 h-28 w-28 text-clay-border"
            fill="currentColor"
          >
            <circle cx="10" cy="10" r="2" />
            <circle cx="40" cy="10" r="2" />
            <circle cx="70" cy="10" r="2" />
            <circle cx="100" cy="10" r="2" />
            <circle cx="10" cy="40" r="2" />
            <circle cx="100" cy="40" r="2" />
            <circle cx="10" cy="70" r="2" />
            <circle cx="100" cy="70" r="2" />
            <circle cx="10" cy="100" r="2" />
            <circle cx="40" cy="100" r="2" />
            <circle cx="70" cy="100" r="2" />
            <circle cx="100" cy="100" r="2" />
          </svg>
        </div>

        <div data-reveal className="relative mx-auto max-w-[1120px]">
          <p className="clay-chip inline-flex bg-clay-primary px-4 py-1.5 text-clay-onprimary">
            WHY TRUST IT
          </p>
          <h2 className="mt-4 max-w-[24ch] text-[1.625rem] font-semibold leading-[1.2] text-clay-ink md:text-[2rem]">
            Every number comes with its receipts.
          </h2>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              {
                title: 'Hold-out validation',
                line: 'One PAGASA station and the last 3 years are held out; bias and RMSE are reported.',
              },
              {
                title: 'Sample sizes shown',
                line: 'Every municipality carries its sample count and Landsat ST_QA uncertainty.',
              },
              {
                title: 'Association, not causation',
                line: 'RF/SHAP ranks drivers. The page never claims proof.',
              },
              {
                title: 'Private by design',
                line: 'The leaderboard shows your chosen handle, never your name. Installable PWA — offline shows your last-viewed content.',
              },
            ].map(({ title, line }) => (
              <article key={title} className="clay-card flex items-start gap-4 p-6">
                <span className="clay-chip inline-flex h-10 w-10 shrink-0 items-center justify-center bg-clay-primary text-clay-onprimary">
                  <IconCheck className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold leading-[1.4] text-clay-ink">{title}</h3>
                  <p className="mt-2 text-base leading-relaxed text-clay-ink">{line}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="clay-card mt-10 bg-clay-accent p-6 md:p-12" style={{ boxShadow: 'var(--clay-outer-primary)' }}>
            <p className="text-center text-base leading-relaxed text-white">
              Start with your own municipality &mdash; no account needed.
            </p>
            <div className="mt-6 flex justify-center">
              <button type="button" onClick={enterMap} className="clay-btn clay-btn--secondary clay-btn--inverted px-7">
                Explore as guest
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* §5 Footer — attribution (compliance box 8). Links ≥24px targets (FLAG-4). */}
      <footer className="px-4 pb-12 pt-2 md:pb-16">
        <div className="clay-card clay-card--emphasis mx-auto max-w-[1120px] rounded-3xl p-6 md:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <img src="/BICOL_IN_HEAT.png" alt="" aria-hidden="true" width={100} height={20} className="h-5 w-auto" />
          </div>

          <div className="mt-6 grid gap-8 text-sm leading-relaxed text-clay-ink md:grid-cols-3">
            <div>
              <h3 className="text-sm font-semibold leading-[1.4] text-clay-ink">Data &amp; attribution</h3>
              <p className="mt-2">
                NASA: POWER (T2M/RH2M), Landsat Collection 2 L2, MODIS MOD44B.061 /
                MCD12Q1.061, SEDAC GPW. PAGASA: heat-index bands &amp; station
                observations. LGU boundaries: geoBoundaries adm3, CC BY 4.0
                (PSA/PSGC swap pending).
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {[
                  ['NASA POWER', 'https://power.larc.nasa.gov'],
                  ['PAGASA', 'https://www.pagasa.dost.gov.ph'],
                  ['geoBoundaries', 'https://www.geoboundaries.org'],
                ].map(([label, href]) => (
                  <li key={href}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-6 items-center text-clay-accent underline decoration-clay-border underline-offset-2 hover:decoration-clay-ink"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold leading-[1.4] text-clay-ink">Licences</h3>
              <p className="mt-2">
                Fonts: Fredoka &amp; Nunito (SIL OFL). Code &amp; data used under
                their respective source licences.
              </p>
              {/* The landing is the only screen without a menu, and the Google
                  button sits on it: without this, the notice is unreachable
                  before the sign-in that collects the account data. */}
              <button
                type="button"
                onClick={onOpenPrivacy}
                className="mt-3 inline-flex min-h-6 cursor-pointer items-center text-clay-accent underline decoration-clay-border underline-offset-2 hover:decoration-clay-ink"
              >
                Privacy Notice
              </button>
            </div>
            <div>
              <h3 className="text-sm font-semibold leading-[1.4] text-clay-ink">Challenge credit</h3>
              <p className="mt-2">
                2026 NASA Space Apps Challenge &mdash; Be An Earth System Trend
                Detective!
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
