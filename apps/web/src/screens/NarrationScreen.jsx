// Narration screen — screen #3 of 3 (CORE). Two views:
//
//   Region (default): the Bicol-wide story — all 114 municipalities warming,
//   the drivers shared across the region, and a replicability message that this
//   method works anywhere.
//   Municipality: one LGU's trend, plain-language narration (EN + Filipino),
//   driver ranking labeled association-only, a simple trend graph, and limitations.
//
// Reads the static narrative bank from narratives.json: stored numbers verbatim,
// no runtime LLM, no API key, no compute on displayed values.
//
// Mode: Operate — the visitor completes the task of understanding why Bicol is
// heating and what to do about it. Scanability and honest error bars outrank
// expression; brand lives in precise details.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { IconMap, IconShield, IconTrophy, IconGrid, IconHome } from '../components/Icons.jsx'
// Sillie mascot assets (Vite handles fingerprinting + dist output)
import SillieThinking from '../../assets/Sillie Thinking.png'
import SillieHappy from '../../assets/Sillie Happy.png'
import SillieSad from '../../assets/Sillie Sad.png'
import SillieDisappointed from '../../assets/Sillie Disappointed.png'
import SillieSearch from '../../assets/Sillie Search.png'

gsap.registerPlugin(ScrollTrigger)

function joinKey(name, province) {
  return `${String(name).toLowerCase()}|${String(province).toLowerCase()}`
}

function formatPValue(p) {
  if (p == null) return 'n/a'
  if (p < 0.001) return 'p < 0.001'
  if (p < 0.01) return `p = ${p.toExponential(1)}`
  return `p = ${p.toFixed(3)}`
}

function formatSlope(slope) {
  const sign = slope > 0 ? '+' : slope < 0 ? '−' : ''
  return `${sign}${Math.abs(slope).toFixed(3)} °C/yr`
}

function templateNarration(m, lang) {
  const { name, trend, sample, latest } = m
  const slope = formatSlope(trend.slope_c_per_year)
  const p = formatPValue(trend.p_value)
  const sig = trend.is_significant ? 'statistically significant' : 'not statistically significant'
  const years = sample.n_years
  const hi = latest?.mean_heat_index_c ?? null
  const band = latest?.danger_band ?? 'not classified'

  if (lang === 'fil') {
    return `${name} ay ${trend.direction === 'increasing' ? 'umiinit' : 'napanatili'} nang ${slope} bawat taon (${p}). Ang kalakaran ay ${sig}, batay sa ${years} taon ng data (${sample.n_days?.toLocaleString() ?? 'n/a'}) araw. Noong ${latest?.year ?? 'huling taon'}, ang karaniwang heat index ay ${hi != null ? hi.toFixed(1) : 'hindi kilala'} °C, nasa antas ng ${band} ng PAGASA. Ang pagpapahalaga ng driver ay pag-uugnay lamang, hindi katunayan ng sanhi.`
  }

  return `${name} is ${trend.direction === 'increasing' ? 'heating' : 'holding steady'} by about ${slope} (${p}). The trend is ${sig}, based on ${years} years of data (${sample.n_days?.toLocaleString() ?? 'n/a'} daily observations). In ${latest?.year ?? 'the latest year'}, the average heat index was ${hi != null ? hi.toFixed(1) : 'unavailable'} °C, inside PAGASA's ${band} band. Driver ranking shows association, not causation.`
}

function aggregateRegion(municipalities) {
  const total = municipalities.length
  const significant = municipalities.filter((m) => m.trend?.is_significant).length
  const slopes = municipalities.map((m) => m.trend?.slope_c_per_year ?? 0).filter((s) => s != null)
  const avgSlope = slopes.length ? slopes.reduce((a, b) => a + b, 0) / slopes.length : 0
  const increasing = municipalities.filter((m) => m.trend?.direction === 'increasing').length
  const decreasing = municipalities.filter((m) => m.trend?.direction === 'decreasing').length
  const flat = municipalities.filter((m) => m.trend?.direction === 'flat' || m.trend?.direction === 'steady').length

  const driverCounter = {}
  for (const m of municipalities) {
    for (const d of m.top_drivers ?? []) {
      const label = d.label
      driverCounter[label] = (driverCounter[label] || 0) + 1
    }
  }
  const topDrivers = Object.entries(driverCounter)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const totalDangerDays = municipalities.reduce(
    (sum, m) => sum + (m.total_danger_days_45y ?? 0),
    0,
  )

  return {
    total,
    significant,
    notSignificant: total - significant,
    avgSlope,
    increasing,
    decreasing,
    flat,
    topDrivers,
    totalDangerDays,
  }
}

const BicolRegionIntroEN = `Every dry season, Bicol breaks its own heat record. Across all 114 municipalities in Region V, the heat index — what the body actually feels — is climbing. The thermometer says one number; the body experiences another. Bicol In-Heat reads 45 years of NASA data to show which municipalities are heating fastest, why, and whether the trend is statistically significant.`

const BicolRegionIntroFIL = `Bawat tag-init, sinisira ng Bicol ang sarili nitong rekord sa init. Sa lahat ng 114 na munisipalidad sa Rehiyon V, ang heat index — ang tunay na nararamdaman ng katawan — ay umiinit. Ang termometro ay isang numero; ang katawan ang nararamdang iba. Sinasabi ng Bicol In-Heat ang 45 taon ng datos ng NASA upang ipakita kung aling munisipalidad ang pinakamabilis na umiinit, bakit, at kung ang kalakaran ay statistically significant.`

const ReplicabilityEN = `This method is replicable for any region. The same pipeline — NASA POWER air temperature and humidity, Theil–Sen slope, Mann–Kendall significance at α = 0.05, Random Forest / SHAP driver ranking — can be applied to any province, state, or country with gridded climate data. Bicol is the proving ground; the method is the product.`

const ReplicabilityFIL = `Maipaplano ang paraang ito sa anumang rehiyon. Ang parehong pipeline — NASA POWER hangin at humidity, Theil–Sen slope, Mann–Kendall significance sa α = 0.05, Random Forest / SHAP driver ranking — ay maaaring gamitin sa anumang probinsya, estado, o bansa na may gridded na climate data. Ang Bicol ang patunayan; ang paraan ang produkto.`

const WhyBicolEN = `Bicol’s geography makes it a natural heat trap: a long coastal strip facing the Pacific, mountain ranges that stall airflow, and urban centers that trap heat. Neighboring municipalities can share one driver yet trend in opposite directions — that is the pattern this tool exists to surface, not an error.`

const WhyBicolFIL = `Angograpiya ng Bicol ang nagpapaliwanag: mahabang batayan ng karagatan na harapin sa Pacific, mga bundok na humihinto sa hangin, at sentro ng lungsod na nakahahalas sa init. Ang mga kamailang munisipalidad ay maaaring magkaroon ng isa pang driver ngunit magkalabi-labi ang kalakaran — iyon ang patakaran na nililikha ng tool na ito, hindi isang error.`

const StartCaringEN = `Start caring — this municipality is heating fast and the trend is statistically significant. The drivers below show what’s moving with the heat index, ranked by importance.`
const StartCaringFIL = `Simulan ang pag-alaga — ang munisipalidad na ito ay umiinit nang mabilis at ang kalakaran ay makabuluhan. Ang mga driver sa ibaba ay nag-uugnay sa heat index, na pinapagusu-suso ayon sa kahalagahan.`

export default function NarrationScreen({
  narratives = null,
  status = 'loading',
  error = null,
  initialKey = null,
  onBack = () => {},
}) {
  const [lang, setLang] = useState('en')
  const [view, setView] = useState('region') // 'region' | 'municipality'
  const [key, setKey] = useState(initialKey || null)

  const containerRef = useRef(null)
  const municipalities = narratives?.municipalities ?? []
  const region = useMemo(() => aggregateRegion(municipalities), [municipalities])
  // Regional average heat-index series over 45 years — one line to skim the
  // region-wide heating trend. Aggregates stored series verbatim; no new stats.
  const regionSeries = useMemo(() => {
    if (municipalities.length === 0) return []
    const byYear = {}
    for (const m of municipalities) {
      for (const pt of m.series ?? []) {
        if (!byYear[pt.year]) byYear[pt.year] = []
        if (pt.mean_heat_index_c != null) byYear[pt.year].push(pt.mean_heat_index_c)
      }
    }
    return Object.entries(byYear)
      .map(([year, vals]) => ({
        year: Number(year),
        mean_heat_index_c: vals.reduce((a, b) => a + b, 0) / vals.length,
      }))
      .sort((a, b) => a.year - b.year)
  }, [municipalities])
  const muni = key
    ? municipalities.find((m) => joinKey(m.name, m.province) === key)
    : municipalities[0] ?? null

  const options = useMemo(
    () =>
      municipalities.map((m) => ({
        label: `${m.name}, ${m.province}`,
        value: joinKey(m.name, m.province),
      })),
    [municipalities],
  )

  const handleChange = useCallback((event) => {
    setKey(event.target.value)
  }, [])

  const narrationText = useMemo(() => {
    if (!muni) return null
    const stored = muni.narration?.[lang]
    if (stored && stored.trim()) return stored
    return templateNarration(muni, lang)
  }, [muni, lang])

  const drivers = useMemo(() => {
    if (!muni) return []
    return Array.isArray(muni.top_drivers) ? muni.top_drivers : []
  }, [muni])

  const isSad = muni?.trend?.is_significant && muni?.trend?.direction === 'increasing'

  // ── Motion thesis (Operate + Read) ──
  // Focal moment: hero entrance — Sillie scales in, heading rises, intro fades.
  // Continuity: parallax scroll on section backgrounds; view/language toggles crossfade.
  // Feedback: stat cards lift on hover; driver bars grow on scroll reveal; graph draws on mount.
  // Budget: one matchMedia block, ScrollTrigger scrub for parallax, transforms only.
  useEffect(() => {
    if (document.visibilityState === 'hidden') return undefined

    const root = containerRef.current
    if (!root) return undefined

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mm = gsap.matchMedia()

    if (!prefersReduced) {
      // Hero entrance: the one authored moment for this surface.
      const hero = root.querySelector('[data-hero]')
      const sillie = root.querySelector('[data-sillie]')
      const heading = root.querySelector('[data-heading]')
      const intro = root.querySelector('[data-intro]')

      const tl = gsap.timeline()
      if (hero) tl.fromTo(hero, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0)
      if (heading) tl.fromTo(heading, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.15)
      if (intro) tl.fromTo(intro, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.3)
      if (sillie) tl.fromTo(sillie, { opacity: 0, scale: 0.8, rotation: -3 }, { opacity: 1, scale: 1, rotation: 0, duration: 1, ease: 'power3.out' }, 0.2)

      // Pulse glow behind Sillie — breathing effect, not spatial movement.
      if (sillie) {
        gsap.to(sillie, {
          filter: 'drop-shadow(0 0 24px rgba(212, 175, 55, 0.35))',
          duration: 3,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        })
        // Float — Sillie bobs up and down gently, feels alive.
        gsap.to(sillie, {
          y: -14,
          duration: 4,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        })
      }

      // Parallax: section backgrounds drift slower than foreground text as you scroll.
      gsap.utils.toArray('[data-parallax-bg]').forEach((el) => {
        const speed = parseFloat(el.dataset.speed ?? '0.15')
        gsap.to(el, {
          yPercent: -50 * speed,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            scroller: '#main',
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        })
      })

      // Section reveals on scroll — subtle slide-up, content always visible.
      gsap.utils.toArray('[data-section]').forEach((section) => {
        gsap.fromTo(section,
          { y: 30 },
          {
            y: 0, duration: 0.7, ease: 'power3.out',
            scrollTrigger: {
              trigger: section,
              scroller: '#main',
              start: 'top 85%',
              once: true,
            },
          }
        )
      })

      // Driver bars grow from zero — reveals importance.
      gsap.utils.toArray('[data-driver-bar]').forEach((bar) => {
        const targetWidth = bar.style.width
        gsap.fromTo(bar,
          { width: 0 },
          {
            width: targetWidth,
            duration: 1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: bar,
              scroller: '#main',
              start: 'top 85%',
              once: true,
            },
          }
        )
      })

      // Sad bubbles rise above Sillie's head — only when significant warming.
      if (isSad) {
        gsap.utils.toArray('[data-sad-bubble]').forEach((bubble, i) => {
          gsap.fromTo(bubble,
            { y: 0, opacity: 0, scale: 0.5 },
            {
              y: -80,
              opacity: 0.6,
              scale: 1,
              duration: 3 + i * 0.4,
              repeat: -1,
              ease: 'power1.inOut',
              delay: i * 0.5,
            }
          )
        })
      }
    }

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
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [view, key, lang, isSad])

  if (status === 'error') {
    return (
      <div className="flex h-full min-h-0 flex-col bg-clay-bg">
        <main id="main" className="min-h-0 flex-1 overflow-y-auto bih-scroll">
          <div className="mx-auto max-w-7xl px-3 py-8 sm:px-5 sm:py-10 lg:px-8">
            <p className="text-xs font-clay font-semibold uppercase tracking-[0.18em] text-clay-coral-shadow mb-1">
              Narration
            </p>
            <h1 className="mt-0 text-3xl font-clay font-extrabold tracking-tight text-clay-text-heading sm:text-4xl">
              Narration unavailable
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-clay-text-muted font-clay leading-relaxed">
              {error}
            </p>
            <button
              type="button"
              onClick={onBack}
              className="mt-6 clay-btn clay-btn--secondary"
            >
              Back to map
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (status !== 'ready') {
    return (
      <div className="flex h-full min-h-0 flex-col bg-clay-bg">
        <main id="main" className="min-h-0 flex-1 overflow-y-auto bih-scroll">
          <div className="mx-auto max-w-7xl px-3 py-8 sm:px-5 sm:py-10 lg:px-8">
            <p className="text-xs font-clay font-semibold uppercase tracking-[0.18em] text-clay-coral-shadow mb-1">
              Narration
            </p>
            <h1 className="mt-0 text-3xl font-clay font-extrabold tracking-tight text-clay-text-heading sm:text-4xl">
              Loading…
            </h1>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-clay-bg">
      <main id="main" ref={containerRef} className="min-h-0 flex-1 overflow-y-auto bih-scroll">
        <div className="mx-auto max-w-7xl px-3 py-8 sm:px-5 sm:py-10 lg:px-8">
          {/* ── Header bar ── */}
          <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <button
                type="button"
                onClick={onBack}
                aria-label="Back to map"
                className="inline-flex items-center gap-2 text-sm font-clay font-semibold text-clay-text-muted hover:text-clay-text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-blue"
              >
                <IconMap className="h-4 w-4" /> Back to map
              </button>
              <h1
                data-heading
                className="mt-3 text-4xl font-clay font-extrabold tracking-tight text-clay-text-heading sm:text-5xl lg:text-6xl"
              >
                {view === 'region' ? 'Bicol Region' : `${muni?.name}, ${muni?.province}`}
              </h1>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* View toggle */}
              <div
                role="radiogroup"
                aria-label="View"
                className="inline-flex items-center rounded-[16px] border border-white/30 bg-white shadow-sm"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={view === 'region'}
                  onClick={() => setView('region')}
                  className={`px-5 py-2.5 text-xs font-clay font-semibold transition-all duration-200 ${
                    view === 'region'
                      ? 'bg-clay-amber text-clay-text-heading'
                      : 'text-clay-text-body hover:bg-clay-bg-blue-white hover:text-clay-text-heading'
                  }`}
                >
                  Region
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={view === 'municipality'}
                  onClick={() => setView('municipality')}
                  className={`px-5 py-2.5 text-xs font-clay font-semibold transition-all duration-200 ${
                    view === 'municipality'
                      ? 'bg-clay-amber text-clay-text-heading'
                      : 'text-clay-text-body hover:bg-clay-bg-blue-white hover:text-clay-text-heading'
                  }`}
                >
                  Municipality
                </button>
              </div>

              {/* Language toggle */}
              <div
                role="radiogroup"
                aria-label="Language"
                className="inline-flex items-center rounded-[16px] border border-white/30 bg-white shadow-sm"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={lang === 'en'}
                  onClick={() => setLang('en')}
                  className={`px-5 py-2.5 text-xs font-clay font-semibold transition-all duration-300 ${
                    lang === 'en'
                      ? 'bg-clay-amber text-clay-text-heading'
                      : 'text-clay-text-body hover:bg-clay-bg-blue-white hover:text-clay-text-heading'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={lang === 'fil'}
                  onClick={() => setLang('fil')}
                  className={`px-5 py-2.5 text-xs font-clay font-semibold transition-all duration-300 ${
                    lang === 'fil'
                      ? 'bg-clay-amber text-clay-text-heading'
                      : 'text-clay-text-body hover:bg-clay-bg-blue-white hover:text-clay-text-heading'
                  }`}
                >
                  Filipino
                </button>
              </div>
            </div>
          </div>

          {view === 'region' ? (
            <>
              {/* ── §1 Hero — the Bicol story ──
                  Sillie centered in his zone on the left, text on the right. No overlap.
                  Sillie drop-shadow pulse glow. ── */}
              <section data-section data-parallax-bg data-speed="0.12" className="mb-10 relative overflow-hidden md:mb-14">
                <div className="clay-card--white rounded-[40px] border border-clay-text-muted/10 p-0 md:p-0 shadow-card overflow-hidden">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-0 min-h-[320px] md:h-[420px]">
                    {/* Sillie contained inside card, left side, centered in his zone */}
                    <div className="w-full md:w-[45%] h-full flex items-center justify-center p-6 md:p-12">
                      <div data-sillie className="w-full max-w-[280px] h-auto shrink-0 relative">
                        <img
                          src={SillieThinking}
                          alt="Sillie thinking about heat trends"
                          className="w-full h-auto block drop-shadow-lg"
                          loading="eager"
                          decoding="async"
                        />
                      </div>
                    </div>
                    <div className="w-full md:w-[55%] p-8 md:p-16 flex flex-col justify-center">
                      <h2
                        data-heading
                        className="mt-0 text-3xl font-clay font-extrabold tracking-tight text-clay-text-heading sm:text-4xl"
                      >
                        {lang === 'fil'
                          ? 'Bawat tag-init, umiinit ang Bicol.'
                          : 'Every dry season, Bicol heats up.'}
                      </h2>
                      <p
                        data-intro
                        className="mt-6 text-lg leading-relaxed text-clay-text-body font-clay max-w-[65ch]"
                      >
                        {lang === 'fil' ? BicolRegionIntroFIL : BicolRegionIntroEN}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* ── §2 Region at a glance ── */}
              <section data-section className="mb-14">
                <h2 className="mt-0 mb-10 flex items-center gap-2 text-2xl font-clay font-extrabold tracking-tight text-clay-text-heading sm:text-3xl">
                  <span className="clay-chip inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-white bg-clay-amber">2</span>
                  The region at a glance
                </h2>
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                  <StatCard
                    label={lang === 'fil' ? 'Munisipalidad' : 'Municipalities'}
                    value={region.total}
                    sublabel="in Region V"
                    icon={<RegionIcon />}
                    tone="neutral"
                  />
                  <StatCard
                    label={lang === 'fil' ? 'Katamtamang pag-init' : 'Avg warming'}
                    value={formatSlope(region.avgSlope)}
                    sublabel="Theil–Sen slope per year"
                    icon={<TrendIcon />}
                    tone="coral"
                  />
                  <StatCard
                    label={lang === 'fil' ? 'Mahalaga ang kalakaran' : 'Significant trends'}
                    value={`${region.significant} / ${region.total}`}
                    sublabel="Mann–Kendall α = 0.05"
                    icon={<SignIcon />}
                    tone="green"
                  />
                  <StatCard
                    label={lang === 'fil' ? 'Mga araw ng panganib (45 taon)' : 'Danger days (45y)'}
                    value={region.totalDangerDays.toLocaleString()}
                    sublabel="PAGASA ≥ 42 °C threshold"
                    icon={<DangerIcon />}
                    tone="coral"
                  />
                </div>
              </section>

              {/* ── §3 Why the region is heating — trend graph ── */}
              <section data-section className="mb-14">
                <h2 className="mt-0 mb-8 flex items-center gap-2 text-2xl font-clay font-extrabold tracking-tight text-clay-text-heading sm:text-3xl">
                  <span className="clay-chip inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-white bg-clay-coral-shadow">3</span>
                  Why the region is heating
                </h2>
                <p className="mb-8 text-base leading-relaxed text-clay-text-body font-clay max-w-[65ch]">
                  Annual mean daily peak heat index, averaged across all 114 Bicol
                  municipalities (1981–2025). The dashed line shows the region-wide
                  trend. PAGASA's Danger band starts at 42 °C — every year since
                  the mid-2000s sits above it.
                </p>
                <div className="h-[240px] sm:h-[260px] w-full">
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={regionSeries} margin={{ top: 20, right: 30, bottom: 40, left: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="year"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickFormatter={(tick) => String(tick)}
                        width={80}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        width={50}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                        itemStyle={{ color: '#1e293b' }}
                        labelStyle={{ color: '#64748b', fontWeight: 600 }}
                        formatter={(value) => `${value.toFixed(1)} °C`}
                      />
                      <ReferenceLine
                        y={42}
                        stroke="#ef4444"
                        strokeDasharray="6 4"
                        label={{ value: 'Danger 42 °C', position: 'insideLeft', fill: '#ef4444', fontSize: 10 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="mean_heat_index_c"
                        stroke="#ef4444"
                        strokeWidth={3}
                        dot={false}
                        animationDuration={1500}
                        animationEasing="ease-out"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* ── §3b What's driving the heat across Bicol — qualitative why ── */}
              <section data-section className="mb-14">
                <div className="clay-card--white rounded-[32px] border border-clay-text-muted/10 p-8 md:p-14 shadow-card">
                  <div className="flex items-start gap-3 mb-8">
                    <span className="shrink-0 clay-chip inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-white bg-clay-amber">3b</span>
                    <div>
                      <h2 className="mt-0 mb-2 text-2xl font-clay font-extrabold tracking-tight text-clay-text-heading sm:text-3xl">
                        What's driving the heat across Bicol
                      </h2>
                      <p className="mt-0 text-sm text-clay-text-muted font-clay">
                        The geographic and physical drivers — the "why" behind the numbers.
                      </p>
                    </div>
                  </div>
                  <p className="mb-8 text-base leading-relaxed text-clay-text-body font-clay max-w-[65ch]">
                    {lang === 'fil'
                      ? 'Ang Bicol ay mainit dahil sa kataas-patayo ng lupa, distansya sa dagat, at kapal ng mga puno. Ang POWER grid ng NASA ay tumatakda ng temperatura bawat 0.5° (tungkol 55 km), kaya ang mga nakapiling na munisipalidad ay maaaring mag-ambag ng parehong cell ng datos. Ang ulat na ito ay batay sa observed na data, hindi sa hulaan.'
                      : 'Bicol heats up because of its terrain, distance from the coast, and tree cover. NASA POWER’s 0.5° grid (~55 km) means neighboring municipalities can share a grid cell. Every figure below is based on observed 1981–2025 data — not projections.'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="flex gap-3 items-start">
                      <span className="shrink-0 text-clay-amber font-clay font-extrabold text-lg">1</span>
                      <div className="min-w-0">
                        <p className="mt-0 text-sm font-clay font-semibold text-clay-text-heading">
                          {lang === 'fil' ? 'Mga bundok humahinto sa hangin' : 'Mountains stall airflow'}
                        </p>
                        <p className="mt-1 text-sm text-clay-text-body leading-relaxed">
                          {lang === 'fil'
                            ? 'Ang mga bundok ng Bicol ay humihinga sa hangin at lumilikha ng mga mikroklima — ang init ay nahahalaan sa ilalim ng bundok.'
                            : 'Bicol’s mountain ranges block airflow and create microclimates — heat gets trapped behind the ranges.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <span className="shrink-0 text-clay-amber font-clay font-extrabold text-lg">2</span>
                      <div className="min-w-0">
                        <p className="mt-0 text-sm font-clay font-semibold text-clay-text-heading">
                          {lang === 'fil' ? 'Batayan ng karagatan' : 'Pacific coastline'}
                        </p>
                        <p className="mt-1 text-sm text-clay-text-body leading-relaxed">
                          {lang === 'fil'
                            ? 'Ang mahabang baybayin ay nakahahalas sa init at malinya, lalo na sa tag-init.'
                            : 'The long coastal strip traps heat and moisture, especially in the dry season.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <span className="shrink-0 text-clay-amber font-clay font-extrabold text-lg">3</span>
                      <div className="min-w-0">
                        <p className="mt-0 text-sm font-clay font-semibold text-clay-text-heading">
                          {lang === 'fil' ? 'Sentro ng lungsod' : 'Urban centers'}
                        </p>
                        <p className="mt-1 text-sm text-clay-text-body leading-relaxed">
                          {lang === 'fil'
                            ? 'Ang mga lungsod ay nakakahalas sa init, lumalaki ang heat island effect.'
                            : 'Cities trap heat and intensify the heat-island effect.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <span className="shrink-0 text-clay-amber font-clay font-extrabold text-lg">4</span>
                      <div className="min-w-0">
                        <p className="mt-0 text-sm font-clay font-semibold text-clay-text-heading">
                          {lang === 'fil' ? 'Kakulangan ng punong-dahon' : 'Less tree cover'}
                        </p>
                        <p className="mt-1 text-sm text-clay-text-body leading-relaxed">
                          {lang === 'fil'
                            ? 'Kakulangan ng canopy at mas maraming nakagat na lupa ay nangangahulugang mas kaunting nitso at mas mainit ang lupa.'
                            : 'Less canopy and more paved land means less cooling and hotter ground.'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="mt-10 text-xs font-clay font-semibold uppercase tracking-[0.12em] text-clay-coral-shadow">
                    Association, not causation
                  </p>
                  <p className="mt-2 text-sm text-clay-text-muted font-clay">
                    {lang === 'fil'
                      ? 'Ang mga driver na ito ay kinakatutukan lamang ng pagsusuri, hindi patunay ng sanhi. Ang mga kamailang munisipalidad ay maaaring magkaroon ng isa pang driver ngunit magkalabi-labi ang kalakaran — iyon ang patakaran na nililikha ng tool na ito, hindi isang error.'
                      : 'These drivers are observational associations, not proven causes. Neighboring municipalities can share one driver yet trend in opposite directions — that is the pattern this tool exists to surface, not an error.'}
                  </p>
                </div>
              </section>

              {/* ── §4 Drivers across the region — SHAP data proof ── */}
              <section data-section className="mb-14">
                <div className="clay-card--white rounded-[32px] border border-clay-coral-shadow/20 p-8 md:p-14 shadow-card">
                  <div className="flex items-start gap-3 mb-8">
                    <span className="shrink-0 clay-chip inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-white bg-clay-coral-shadow">4</span>
                    <div>
                      <h2 className="mt-0 mb-2 text-2xl font-clay font-extrabold tracking-tight text-clay-text-heading sm:text-3xl">
                        What drives the region
                      </h2>
                      <p className="mt-0 text-sm text-clay-text-muted font-clay">
                        Random Forest / SHAP ranks which features move with the heat-index trend —
                        data-driven proof, not assumption.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-5">
                    {region.topDrivers.map((d, i) => (
                      <DriverRow
                        key={d.label}
                        rank={i + 1}
                        label={d.label}
                        count={d.count}
                        total={region.total}
                      />
                    ))}
                  </div>
                  <p className="mt-8 text-xs font-clay font-semibold uppercase tracking-[0.12em] text-clay-coral-shadow">
                    Association, not causation
                  </p>
                  <p className="mt-2 text-sm text-clay-text-muted font-clay">
                    These drivers are observational associations, not proven causes. Neighboring
                    municipalities can share one driver yet trend in opposite directions — that is
                    the pattern this tool exists to surface, not an error.
                  </p>
                </div>
              </section>

              {/* ── §4 Why Bicol ── */}
              <section data-section className="mb-10 relative md:mb-14">
                <div className="clay-card--white rounded-[40px] border border-clay-text-muted/10 p-0 md:p-0 shadow-card overflow-hidden">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-0 min-h-[320px] md:h-[420px]">
                    <div className="w-full md:w-[52%] p-6 md:p-16 flex flex-col justify-center">
                      <h2 className="mt-0 text-2xl font-clay font-extrabold tracking-tight text-clay-text-heading sm:text-3xl">
                        Why Bicol heats differently
                      </h2>
                      <p className="mt-6 text-base leading-relaxed text-clay-text-body font-clay max-w-[65ch]">
                        {lang === 'fil' ? WhyBicolFIL : WhyBicolEN}
                      </p>
                    </div>
                    <div className="w-full md:w-[48%] h-full p-6 md:p-12 flex flex-col justify-center items-center md:items-end">
                      <div data-sillie className="relative w-full max-w-[320px] h-auto shrink-0 -mb-8 md:-mb-0">
                        <img
                          src={SillieThinking}
                          alt="Sillie thinking about why Bicol heats"
                          className="w-full h-auto block drop-shadow-lg"
                          loading="eager"
                          decoding="async"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <FeatureItem
                    icon={<CoastIcon />}
                    title={lang === 'fil' ? 'Batayan ng karagatan' : 'Pacific coastline'}
                    line={lang === 'fil' ? 'Mahabang batayan na nakakahalas sa init at bagyo.' : 'Long coastal strip traps heat and moisture.'}
                  />
                  <FeatureItem
                    icon={<MountainIcon />}
                    title={lang === 'fil' ? 'Mga bundok' : 'Mountain ranges'}
                    line={lang === 'fil' ? 'Hihinto sa hangin, lumilikha ng mikroklima.' : 'Stalls airflow, creates microclimates.'}
                  />
                  <FeatureItem
                    icon={<CityIcon />}
                    title={lang === 'fil' ? 'Sentro ng lungsod' : 'Urban centers'}
                    line={lang === 'fil' ? 'Nakahahalas sa init, lumalaki ang heat island effect.' : 'Traps heat, intensifies the heat-island effect.'}
                  />
                </div>
              </section>

              {/* ── §5 Replicability ── */}
              <section data-section className="mb-14">
                <div className="relative rounded-[32px] border border-clay-blue/20 bg-clay-blue/5 p-10 md:p-14 shadow-[0_8px_24px_rgba(99,102,241,0.08)]">
                  <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-clay-blue flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </div>
                  <h2 className="mt-0 mb-5 text-2xl font-clay font-extrabold tracking-tight text-clay-text-heading sm:text-3xl">
                    This method works anywhere
                  </h2>
                  <p className="mb-6 text-base leading-relaxed text-clay-text-body font-clay max-w-[65ch]">
                    {lang === 'fil' ? ReplicabilityFIL : ReplicabilityEN}
                  </p>
                  <p className="text-sm font-clay text-clay-text-body leading-relaxed">
                    <strong className="text-clay-text-heading">NASA POWER</strong> air temperature +
                    humidity → <strong className="text-clay-text-heading">Theil–Sen slope</strong> +
                    <strong className="text-clay-text-heading">Mann–Kendall</strong> at α = 0.05 →
                    <strong className="text-clay-text-heading">Random Forest / SHAP</strong> driver
                    ranking. Gridded climate data + a boundary file = a trend detective tool for any
                    province, state, or country.
                  </p>
                </div>
              </section>

              {/* ── §6 Limitations ── */}
              <section data-section>
                <div className="clay-card--white rounded-[32px] border border-clay-text-muted/10 p-8 md:p-10 shadow-card">
                  <h2 className="mt-0 mb-6 text-2xl font-clay font-extrabold tracking-tight text-clay-text-heading sm:text-3xl">
                    Read this before acting
                  </h2>
                  <ul className="mt-0 space-y-4 text-sm text-clay-text-body font-clay leading-relaxed">
                    <li>
                      <strong className="text-clay-text-heading">LST ≠ heat index.</strong> Satellites measure
                      surface temperature — much hotter than air. Heat index comes from NASA POWER air
                      temperature + humidity; Landsat LST gives the spatial pattern only.
                    </li>
                    <li>
                      <strong className="text-clay-text-heading">Grid-cell overlap.</strong> POWER's 0.5° grid
                      (~55 km) means adjacent municipalities may share a grid cell. Trends are per
                      municipality but should be read at grid scale where cells overlap.
                    </li>
                    <li>
                      <strong className="text-clay-text-heading">Cloud contamination.</strong> Optical thermal
                      retrievals over Bicol's cloudy tropics give uneven per-municipality sample counts.
                      Every result carries its n.
                    </li>
                    <li>
                      <strong className="text-clay-text-heading">Association, not causation.</strong> RF/SHAP
                      ranks drivers; it cannot prove causation. The mitigation list is a prioritisation
                      aid, not a proof.
                    </li>
                    <li>
                      <strong className="text-clay-text-heading">Municipality is the smallest unit.</strong>
                      POWER's ~55 km grid cannot resolve barangay-level differences.
                    </li>
                  </ul>
                </div>
              </section>
            </>
          ) : (
            <>
              {/* ── Municipality selector ── */}
              <div className="mb-10">
                <label
                  htmlFor="narration-muni"
                  className="text-xs font-clay font-semibold uppercase tracking-[0.14em] text-clay-text-muted block mb-3"
                >
                  Choose a municipality
                </label>
                <select
                  id="narration-muni"
                  value={key ?? ''}
                  onChange={handleChange}
                  aria-label="Municipality"
                  className="w-full min-w-[280px] rounded-[16px] border border-clay-text-muted/30 bg-white px-5 py-3.5 text-sm font-clay text-clay-text-body focus:outline-none focus:ring-2 focus:ring-clay-blue"
                >
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {muni && (
                <>
                  {/* ── Municipality hero ── */}
                  <section data-section className="mb-10 relative md:mb-14">
                    <div className="clay-card--white rounded-[40px] border border-clay-text-muted/10 p-0 md:p-0 shadow-card relative overflow-hidden">
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-0 min-h-[320px] md:h-[420px]">
                        <div className="w-full md:w-[52%] p-6 md:p-16 flex flex-col justify-center">
                          <div className="mb-3">
                            <h2
                              data-heading
                              className="mt-0 text-3xl font-clay font-extrabold tracking-tight text-clay-text-heading sm:text-4xl"
                            >
                              {muni.name}, {muni.province}
                            </h2>
                          </div>
                          <p className="mt-3 text-base text-clay-text-body font-clay">
                            {formatSlope(muni.trend.slope_c_per_year)} over {muni.sample.n_years} years
                          </p>
                          <p className="mt-2 text-sm {muni.trend.is_significant ? 'text-clay-coral-shadow' : 'text-clay-text-muted'} font-clay font-semibold">
                            {muni.trend.is_significant
                              ? 'Statistically significant at α = 0.05'
                              : 'Not statistically significant'}
                          </p>
                          {isSad && (
                            <div className="mt-6 p-4 rounded-[20px] bg-clay-coral-shadow/10 border border-clay-coral-shadow/20">
                              <p className="text-sm font-clay font-semibold text-clay-coral-shadow">
                                Start caring — this municipality is heating fast and the trend is statistically significant.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Sillie hero — framed breakout for intentional visual impact */}
                        <div className="w-full md:w-[48%] h-full p-6 md:p-12 flex flex-col justify-center items-center md:items-end">
                          <div className="relative w-full max-w-[420px] h-auto shrink-0 -mb-8 md:-mb-16">
                            <div className="absolute inset-0 bg-clay-amber/20 blur-[80px] rounded-full -z-10" />
                            <div data-sillie className="relative w-full max-w-[420px] h-auto shrink-0 -mb-8 md:-mb-16">
                              {isSad && (
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 md:-top-16 flex items-end justify-center pb-2">
                                  {[...Array(6)].map((_, i) => (
                                    <div
                                      key={i}
                                      data-sad-bubble
                                      className="absolute rounded-full bg-white/60 blur-sm"
                                      style={{
                                        left: `${10 + i * 16}%`,
                                        bottom: `${60 + i * 10}px`,
                                        width: `${6 + i * 2}px`,
                                        height: `${6 + i * 2}px`,
                                      }}
                                    />
                                  ))}
                                </div>
                              )}
                              <img
                                src={
                                  muni.trend?.is_significant && muni.trend?.direction === 'increasing'
                                    ? SillieSad
                                    : SillieHappy
                                }
                                alt={`${muni.name} — ${muni.trend?.direction === 'increasing' ? 'warming trend' : 'stable trend'}`}
                                className="w-full h-auto block drop-shadow-xl relative z-10"
                                loading="lazy"
                                decoding="async"
                                onError={(e) => {
                                  e.target.src = SillieThinking
                                  e.target.alt = 'Bicol In-Heat'
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* ── Plain-language narration — centerpiece ── */}
                  <section data-section className="mb-14">
                    <div className="clay-card--white rounded-[32px] border border-clay-text-muted/10 p-8 md:p-14 shadow-card">
                      <div className="relative mb-8">
                        <svg
                          className="absolute -top-6 -left-4 h-10 w-10 text-clay-amber/20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M14 10a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2z" />
                        </svg>
                        <h2 className="mt-0 text-2xl font-clay font-extrabold tracking-tight text-clay-text-heading sm:text-3xl">
                          Plain-language explanation
                        </h2>
                      </div>
                      <div className="text-xl leading-relaxed text-clay-text-body font-clay max-w-none" style={{ lineHeight: 1.8 }}>
                        {narrationText}
                      </div>
                      {!muni.narration?.[lang]?.trim() && (
                        <p className="mt-6 text-xs font-clay text-clay-text-muted">
                          Template built from stored numbers — no narrative entry for this municipality.
                        </p>
                      )}
                    </div>
                  </section>

                  {/* ── Trend graph ── */}
                  <section data-section className="mb-14">
                    <div className="clay-card--white rounded-[32px] border border-clay-text-muted/10 p-8 md:p-12 shadow-card">
                      <h2 className="mt-0 mb-6 text-2xl font-clay font-extrabold tracking-tight text-clay-text-heading sm:text-3xl">
                        Heat index over 45 years
                      </h2>
                      <p className="mb-8 text-sm text-clay-text-muted font-clay max-w-[65ch]">
                        Annual mean daily peak heat index from NASA POWER (1981–2025). The dashed line
                        shows the Theil–Sen trend. PAGASA’s Danger band starts at 42 °C; Extreme Danger
                        at 52 °C.
                      </p>
                      <div className="h-[200px] sm:h-[220px] w-full">
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart
                            data={muni.series}
                            margin={{ top: 20, right: 30, bottom: 40, left: 50 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis
                              dataKey="year"
                              tick={{ fontSize: 11, fill: '#64748b' }}
                              tickFormatter={(tick) => String(tick)}
                              width={80}
                            />
                            <YAxis
                              tick={{ fontSize: 11, fill: '#64748b' }}
                              width={50}
                              domain={['auto', 'auto']}
                            />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                              itemStyle={{ color: '#1e293b' }}
                              labelStyle={{ color: '#64748b', fontWeight: 600 }}
                              formatter={(value) => `${value.toFixed(1)} °C`}
                            />
                            <ReferenceLine
                              y={42}
                              stroke="#ef4444"
                              strokeDasharray="6 4"
                              label={{ value: 'Danger 42 °C', position: 'insideLeft', fill: '#ef4444', fontSize: 10 }}
                            />
                            <ReferenceLine
                              y={52}
                              stroke="#b91c1c"
                              strokeDasharray="6 4"
                              label={{ value: 'Extreme Danger 52 °C', position: 'insideLeft', fill: '#b91c1c', fontSize: 10 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="mean_heat_index_c"
                              stroke="#ef4444"
                              strokeWidth={2}
                              dot={false}
                              animationDuration={1500}
                              animationEasing="ease-out"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </section>

                  {/* ── Drivers ── */}
                  <section data-section className="mb-14">
                    <div className="clay-card--white rounded-[32px] border border-clay-text-muted/10 p-8 md:p-12 shadow-card">
                      <h2 className="mt-0 mb-6 text-2xl font-clay font-extrabold tracking-tight text-clay-text-heading sm:text-3xl">
                        What drives the trend
                      </h2>
                      <p className="mb-8 text-sm text-clay-text-muted font-clay max-w-[65ch]">
                        Random Forest / SHAP ranks which features move with the heat-index trend.
                        Listed by importance — association, not proof of cause.
                      </p>
                      <div className="space-y-5">
                        {drivers.length > 0 ? (
                          drivers.slice(0, 5).map((d, i) => (
                            <DriverRow
                              key={d.feature}
                              rank={i + 1}
                              label={d.label}
                              count={Math.round((d.share ?? 0) * 100)}
                              total={100}
                            />
                          ))
                        ) : (
                          <p className="text-sm text-clay-text-muted">
                            Driver ranking not available for this municipality.
                          </p>
                        )}
                      </div>
                      <p className="mt-8 text-xs font-clay font-semibold uppercase tracking-[0.12em] text-clay-coral-shadow">
                        Association, not causation
                      </p>
                      <p className="mt-2 text-sm text-clay-text-muted font-clay">
                        These drivers are observational associations, not proven causes. Neighboring
                        municipalities can share one driver yet trend in opposite directions — that is
                        the pattern this tool exists to surface, not an error.
                      </p>
                    </div>
                  </section>

                  {/* ── Latest conditions ── */}
                  {muni.latest && (
                    <section data-section className="mb-14">
                      <div className="clay-card--white rounded-[32px] border border-clay-text-muted/10 p-8 md:p-12 shadow-card">
                        <h2 className="mt-0 mb-6 text-2xl font-clay font-extrabold tracking-tight text-clay-text-heading sm:text-3xl">
                          {muni.latest.year}
                        </h2>
                        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
                          <StatMini
                            label="Mean heat index"
                            value={
                              muni.latest.mean_heat_index_c != null
                                ? `${muni.latest.mean_heat_index_c.toFixed(1)} °C`
                                : 'n/a'
                            }
                            detail={`PAGASA band: ${muni.latest.danger_band ?? 'n/a'}`}
                          />
                          <StatMini
                            label="Danger band"
                            value={muni.latest.danger_band ?? 'n/a'}
                            detail="PAGASA ≥ 42 °C = Danger"
                          />
                          <StatMini
                            label="Danger days (year)"
                            value={muni.latest.danger_days != null ? muni.latest.danger_days.toLocaleString() : 'n/a'}
                            detail="Days above 42 °C"
                          />
                          <StatMini
                            label="Total danger days (45y)"
                            value={muni.total_danger_days_45y != null ? muni.total_danger_days_45y.toLocaleString() : 'n/a'}
                            detail="Cumulative exceedance"
                          />
                        </div>
                      </div>
                    </section>
                  )}

                  {/* ── Limitations ── */}
                  <section data-section>
                    <div className="clay-card--white rounded-[32px] border border-clay-text-muted/10 p-8 md:p-10 shadow-card">
                      <h2 className="mt-0 mb-6 text-2xl font-clay font-extrabold tracking-tight text-clay-text-heading sm:text-3xl">
                        Read this before acting
                      </h2>
                      <ul className="mt-0 space-y-4 text-sm text-clay-text-body font-clay leading-relaxed">
                        <li>
                          <strong className="text-clay-text-heading">LST ≠ heat index.</strong> Satellites measure
                          surface temperature — much hotter than air. Heat index comes from NASA POWER air
                          temperature + humidity; Landsat LST gives the spatial pattern only.
                        </li>
                        <li>
                          <strong className="text-clay-text-heading">Grid-cell overlap.</strong> POWER's 0.5° grid
                          (~55 km) means adjacent municipalities may share a grid cell. Trends are per
                          municipality but should be read at grid scale where cells overlap.
                        </li>
                        <li>
                          <strong className="text-clay-text-heading">Cloud contamination.</strong> Optical thermal
                          retrievals over Bicol's cloudy tropics give uneven per-municipality sample counts.
                          Every result carries its n.
                        </li>
                        <li>
                          <strong className="text-clay-text-heading">Association, not causation.</strong> RF/SHAP
                          ranks drivers; it cannot prove causation. The mitigation list is a prioritisation
                          aid, not a proof.
                        </li>
                        <li>
                          <strong className="text-clay-text-heading">Municipality is the smallest unit.</strong>
                          POWER's ~55 km grid cannot resolve barangay-level differences.
                        </li>
                      </ul>
                    </div>
                  </section>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

// ── Sub-components ──

function StatCard({ label, value, sublabel, icon, tone }) {
  const toneConfig = {
    neutral: { bg: 'bg-clay-amber/10', text: 'text-clay-amber', border: 'border-clay-amber/20' },
    coral: { bg: 'bg-clay-coral-shadow/10', text: 'text-clay-coral-shadow', border: 'border-clay-coral-shadow/20' },
    green: { bg: 'bg-clay-green/10', text: 'text-clay-green', border: 'border-clay-green/20' },
  }
  const cfg = toneConfig[tone] ?? toneConfig.neutral

  return (
    <div className="clay-card--white rounded-[24px] border border-clay-text-muted/10 p-6 md:p-8 shadow-sm hover:shadow-md hover:border-clay-text-muted/20 transition-all duration-200 group">
      <div className={`h-11 w-11 rounded-[20px] ${cfg.bg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200`}>
        {icon}
      </div>
      <p className="mt-0 mb-1.5 text-2xl font-clay font-extrabold tracking-tight text-clay-text-heading group-hover:text-clay-coral-shadow transition-colors duration-200">
        {value}
      </p>
      <p className="text-xs font-clay font-semibold uppercase tracking-[0.12em] text-clay-text-muted">
        {label}
      </p>
      <p className="mt-1 text-xs text-clay-text-body leading-tight">
        {sublabel}
      </p>
    </div>
  )
}

function StatMini({ label, value, detail, tone }) {
  const toneClass =
    tone === 'coral' ? 'text-clay-coral-shadow' : 'text-clay-text-heading'
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-clay font-semibold uppercase tracking-[0.12em] text-clay-text-muted">
        {label}
      </p>
      <p className="mt-0 text-lg font-clay font-bold {toneClass}">{value}</p>
      <p className="text-[10px] text-clay-text-muted leading-tight">{detail}</p>
    </div>
  )
}

function DriverRow({ rank, label, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-4 p-3 rounded-[16px] border border-clay-text-muted/10 bg-white/50 hover:bg-clay-bg-white/30 transition-colors duration-200">
      <span className="shrink-0 font-clay font-bold text-clay-text-heading">
        #{rank}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-clay font-semibold text-clay-text-body">
          {label}
        </p>
        <p className="mt-0.5 text-xs text-clay-text-muted">
          {pct}% of driver importance
        </p>
      </div>
      <div className="h-2 w-full flex-1 mx-4 rounded-full bg-clay-text-muted/10 overflow-hidden [data-driver-bar]">
        <div
          className="h-full bg-clay-coral-shadow transition-all duration-1000 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="shrink-0 text-xs font-clay font-semibold text-clay-text-muted">
        {pct}%
      </span>
    </div>
  )
}

function FeatureItem({ icon, title, line }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-10 w-10 rounded-[20px] bg-clay-text-muted/10 flex items-center justify-center">
        {icon}
      </div>
      <p className="mt-0 text-sm font-clay font-semibold text-clay-text-heading">{title}</p>
      <p className="text-xs text-clay-text-body leading-tight">{line}</p>
    </div>
  )
}

// ── Inline SVG illustrations ──
// Crisp, consistent stroke weight — no PNG converter needed.

function RegionIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-clay-amber" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9" />
      <polyline points="3 3 12 12 21 3" />
    </svg>
  )
}

function TrendIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-clay-coral-shadow" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function SignIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-clay-green" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 13 4 4L19 7" />
    </svg>
  )
}

function DangerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-clay-coral-shadow" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5L12 2Z" />
      <path d="M12 17V5" />
    </svg>
  )
}

function CoastIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-clay-blue" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12c2.5 0 5 2 5 5s2.5-5 5-5s2.5 2 5 5s2.5-5 5-5" />
    </svg>
  )
}

function MountainIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-clay-green" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m1 12 3 8 4-5 3 8 4-5 3 8 4-5l3-8Z" />
    </svg>
  )
}

function CityIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-clay-coral-shadow" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  )
}
