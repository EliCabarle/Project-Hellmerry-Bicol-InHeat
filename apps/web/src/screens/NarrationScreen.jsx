// Narration screen — screen #3 of 3 (CORE). Reads the static narrative bank
// from narratives.json: stored numbers verbatim, EN + Filipino language
// switch, driver ranking labeled association-only, template fallback when a
// municipality has no narrative. No runtime LLM, no API key, no compute on
// displayed values. Municipality is the smallest unit.
//
// Mode: Operate — the visitor understands why one municipality is heating
// and what to do about it. Scanability and honest error bars outrank
// expression; brand lives in precise details.
import { useCallback, useMemo, useState } from 'react'
import { IconMap, IconShield, IconTrophy, IconGrid } from '../components/Icons.jsx'

// Build a province-qualified joinKey from name + province, matching engine.js.
function joinKey(name, province) {
  return `${String(name).toLowerCase()}|${String(province).toLowerCase()}`
}

// Format a p-value for display, matching the precision the map uses.
function formatPValue(p) {
  if (p == null) return 'n/a'
  if (p < 0.001) return 'p < 0.001'
  if (p < 0.01) return `p = ${p.toExponential(1)}`
  return `p = ${p.toFixed(3)}`
}

// Format a slope with its unit and direction marker.
function formatSlope(slope) {
  const sign = slope > 0 ? '+' : slope < 0 ? '−' : ''
  return `${sign}${Math.abs(slope).toFixed(3)} °C/yr`
}

// Template fallback: build plain-language narration from stored numbers when
// the bank has no entry for this municipality. Never invents prose.
function templateNarration(m, lang) {
  const { name, trend, sample, latest } = m
  const slope = formatSlope(trend.slope_c_per_year)
  const p = formatPValue(trend.p_value)
  const sig = trend.is_significant ? 'statistically significant' : 'not statistically significant'
  const years = sample.n_years
  const hi = latest?.mean_heat_index_c ?? null
  const band = latest?.danger_band ?? 'not classified'

  if (lang === 'fil') {
    return `${name} ay ${trend.direction === 'increasing' ? 'umiinit' : trend.direction === 'decreasing' ? 'umiinit' : 'napanatiling-panatili'} nang ${slope} bawat taon (${p}). Ang kalakaran ay ${sig}, batay sa ${years} taon ng data (${sample.n_days?.toLocaleString() ?? 'n/a'}) araw. Noong ${latest?.year ?? 'huling taon'}, ang karaniwang heat index ay ${hi != null ? hi.toFixed(1) : 'hindi kilala'} °C, nasa antas ng ${band} ng PAGASA. Ang pagpapahalaga ng driver ay pag-uugnay lamang, hindi katunayan ng sanhi.`
  }

  return `${name} is ${trend.direction === 'increasing' ? 'heating' : trend.direction === 'decreasing' ? 'cooling' : 'holding steady'} by about ${slope} (${p}). The trend is ${sig}, based on ${years} years of data (${sample.n_days?.toLocaleString() ?? 'n/a'} daily observations). In ${latest?.year ?? 'the latest year'}, the average heat index was ${hi != null ? hi.toFixed(1) : 'unavailable'} °C, inside PAGASA's ${band} band. Driver ranking shows association, not causation.`
}

export default function NarrationScreen({
  narratives = null,
  status = 'loading',
  error = null,
  initialKey = null,
  onBack = () => {},
}) {
  const [lang, setLang] = useState('en')
  const [key, setKey] = useState(initialKey || null)

  const municipalities = narratives?.municipalities ?? []
  const muni = key
    ? municipalities.find((m) => joinKey(m.name, m.province) === key)
    : municipalities[0] ?? null

  // Select options: "Name, Province" → joinKey.
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

  if (status === 'error') {
    return (
      <div className="flex h-full min-h-0 flex-col bg-clay-bg">
        <main id="main" className="min-h-0 flex-1 overflow-y-auto bih-scroll">
          <div className="mx-auto max-w-7xl px-3 py-8 sm:px-5 sm:py-10 lg:px-8">
            <p className="text-xs font-clay font-semibold uppercase tracking-[0.18em] text-clay-coral-shadow mb-1">
              Narration
            </p>
            <h1 className="mt-0.5 text-3xl font-clay font-extrabold tracking-tight text-clay-text-heading sm:text-4xl">
              Narration unavailable
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-clay-text-muted font-clay">
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

  if (status !== 'ready' || !muni) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-clay-bg">
        <main id="main" className="min-h-0 flex-1 overflow-y-auto bih-scroll">
          <div className="mx-auto max-w-7xl px-3 py-8 sm:px-5 sm:py-10 lg:px-8">
            <p className="text-xs font-clay font-semibold uppercase tracking-[0.18em] text-clay-coral-shadow mb-1">
              Narration
            </p>
            <h1 className="mt-0.5 text-3xl font-clay font-extrabold tracking-tight text-clay-text-heading sm:text-4xl">
              Loading…
            </h1>
          </div>
        </main>
      </div>
    )
  }

  const { trend, sample, latest, top_drivers } = muni
  const slope = trend.slope_c_per_year
  const ciLow = trend.slope_ci_low
  const ciHigh = trend.slope_ci_high
  const p = trend.p_value
  const sig = trend.is_significant

  return (
    <div className="flex h-full min-h-0 flex-col bg-clay-bg">
      <main id="main" className="min-h-0 flex-1 overflow-y-auto bih-scroll">
        <div className="mx-auto max-w-7xl px-3 py-8 sm:px-5 sm:py-10 lg:px-8">
          {/* Header bar: back + municipality selector + language toggle. */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <button
                type="button"
                onClick={onBack}
                aria-label="Back to map"
                className="inline-flex items-center gap-2 text-sm font-clay font-semibold text-clay-text-muted hover:text-clay-text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-blue"
              >
                <IconMap className="h-4 w-4" /> Back to map
              </button>
              <h1 className="mt-1 text-3xl font-clay font-extrabold tracking-tight text-clay-text-heading sm:text-4xl">
                {muni.name}, {muni.province}
              </h1>
              <p className="mt-1 text-xs font-clay uppercase tracking-[0.14em] text-clay-text-muted">
                Region V · Bicol, Philippines
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <label
                htmlFor="narration-lang"
                className="text-xs font-clay font-semibold uppercase tracking-[0.14em] text-clay-text-muted"
              >
                Language
              </label>
              <div
                role="radiogroup"
                aria-labelledby={undefined}
                className="inline-flex items-center rounded-[14px] border border-white/30 bg-white shadow-sm"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={lang === 'en'}
                  onClick={() => setLang('en')}
                  className={`px-4 py-2 text-xs font-clay font-semibold transition-colors ${
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
                  className={`px-4 py-2 text-xs font-clay font-semibold transition-colors ${
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

          {/* Municipality selector. */}
          <div className="mb-8">
            <label
              htmlFor="narration-muni"
              className="text-xs font-clay font-semibold uppercase tracking-[0.14em] text-clay-text-muted block mb-2"
            >
              Choose a municipality
            </label>
            <select
              id="narration-muni"
              value={key ?? ''}
              onChange={handleChange}
              aria-label="Municipality"
              className="w-full min-w-[220px] rounded-[14px] border border-clay-text-muted/30 bg-white px-4 py-3 text-sm font-clay text-clay-text-body focus:outline-none focus:ring-2 focus:ring-clay-blue"
            >
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* §1 The trend — slope, significance, CI, sample size. */}
          <section className="mb-8">
            <div className="clay-card--white rounded-[24px] border border-clay-text-muted/10 p-6 md:p-8 shadow-sm">
              <p className="clay-chip inline-flex mb-4 text-clay-text-muted">
                THE TREND
              </p>
              <h2 className="mt-0 text-2xl font-clay font-bold tracking-tight text-clay-text-heading sm:text-3xl">
                Warming by {formatSlope(slope)}
              </h2>
              <p className="mt-2 text-base text-clay-text-body">
                Theil–Sen slope over {sample.n_years} years ({sample.n_days?.toLocaleString() ?? 'n/a'} daily
                observations), 1981–2025.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs font-clay font-semibold uppercase tracking-[0.12em] text-clay-text-muted">
                    Significance
                  </p>
                  <p className="mt-0.5 text-lg font-clay font-bold {sig ? 'text-clay-coral-shadow' : 'text-clay-text-heading'}">
                    {sig ? 'Significant' : 'Not significant'}
                  </p>
                  <p className="mt-1 text-xs text-clay-text-muted">
                    Mann–Kendall, {formatPValue(p)} at α = 0.05
                  </p>
                </div>
                <div>
                  <p className="text-xs font-clay font-semibold uppercase tracking-[0.12em] text-clay-text-muted">
                    Confidence interval
                  </p>
                  <p className="mt-0.5 text-lg font-clay font-bold text-clay-text-heading">
                    {ciLow != null && ciHigh != null ? `${ciLow.toFixed(3)} to ${ciHigh.toFixed(3)} °C/yr` : 'n/a'}
                  </p>
                  <p className="mt-1 text-xs text-clay-text-muted">
                    95% CI on the slope
                  </p>
                </div>
                <div>
                  <p className="text-xs font-clay font-semibold uppercase tracking-[0.12em] text-clay-text-muted">
                    Direction
                  </p>
                  <p className="mt-0.5 text-lg font-clay font-bold text-clay-text-heading">
                    {trend.direction.charAt(0).toUpperCase() + trend.direction.slice(1)}
                  </p>
                  <p className="mt-1 text-xs text-clay-text-muted">
                    {sig ? 'Statistically significant' : 'Not statistically significant'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-clay font-semibold uppercase tracking-[0.12em] text-clay-text-muted">
                    Sample
                  </p>
                  <p className="mt-0.5 text-lg font-clay font-bold text-clay-text-heading">
                    {sample.n_years} yrs · {sample.n_days?.toLocaleString() ?? 'n/a'} days
                  </p>
                  <p className="mt-1 text-xs text-clay-text-muted">
                    Daily POWER observations
                  </p>
                </div>
              </div>

              {sig && (
                <p className="mt-5 text-sm text-clay-text-muted">
                  This trend is statistically significant at α = 0.05 — unlikely to arise
                  by chance. Significance is a flag, not a filter: every municipality stays
                  visible on the map regardless of its p-value.
                </p>
              )}
            </div>
          </section>

          {/* §2 Plain-language narration (EN / Filipino). */}
          <section className="mb-8">
            <div className="clay-card--white rounded-[24px] border border-clay-text-muted/10 p-6 md:p-8 shadow-sm">
              <p className="clay-chip inline-flex mb-4 text-clay-text-muted">
                WHY IT'S HEATING
              </p>
              <h2 className="mt-0 text-2xl font-clay font-bold tracking-tight text-clay-text-heading sm:text-3xl">
                Plain-language explanation
              </h2>
              <div className="mt-4 text-lg leading-relaxed text-clay-text-body font-clay" style={{ lineHeight: 1.6 }}>
                {narrationText}
              </div>
              {!muni.narration?.[lang]?.trim() && (
                <p className="mt-4 text-xs font-clay text-clay-text-muted">
                  Template built from stored numbers — no narrative entry for this municipality.
                </p>
              )}
            </div>
          </section>

          {/* §3 Driver ranking — association, not causation. */}
          <section className="mb-8">
            <div className="clay-card--white rounded-[24px] border border-clay-text-muted/10 p-6 md:p-8 shadow-sm">
              <p className="clay-chip inline-flex mb-4 text-clay-text-muted">
                DRIVERS
              </p>
              <h2 className="mt-0 text-2xl font-clay font-bold tracking-tight text-clay-text-heading sm:text-3xl">
                What drives the trend
              </h2>
              <p className="mt-2 text-sm text-clay-text-muted">
                Random Forest / SHAP ranks which features move with the heat-index trend.
                Listed by importance — association, not proof of cause.
              </p>

              <div className="mt-6 space-y-3">
                {drivers.length > 0 ? (
                  drivers.slice(0, 5).map((d, i) => (
                    <div
                      key={d.feature}
                      className="flex items-center gap-4 p-3 rounded-[14px] border border-clay-text-muted/10 bg-clay-bg-white/30"
                    >
                      <span className="shrink-0 font-clay font-bold text-clay-text-heading">
                        #{i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-clay font-semibold text-clay-text-body">
                          {d.label}
                        </p>
                        <p className="mt-0.5 text-xs text-clay-text-muted">
                          {d.share != null ? `${(d.share * 100).toFixed(1)}% of driver importance` : 'n/a'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-clay-text-muted">
                    Driver ranking not available for this municipality.
                  </p>
                )}
              </div>

              <p className="mt-5 text-xs font-clay font-semibold uppercase tracking-[0.12em] text-clay-coral-shadow">
                Association, not causation
              </p>
              <p className="mt-1 text-sm text-clay-text-muted">
                These drivers are observational associations, not proven causes. Neighboring
                municipalities can share one driver yet trend in opposite directions — that is
                the pattern this tool exists to surface, not an error.
              </p>
            </div>
          </section>

          {/* §4 Latest conditions. */}
          {latest && (
            <section className="mb-8">
              <div className="clay-card--white rounded-[24px] border border-clay-text-muted/10 p-6 md:p-8 shadow-sm">
                <p className="clay-chip inline-flex mb-4 text-clay-text-muted">
                  LATEST CONDITIONS
                </p>
                <h2 className="mt-0 text-2xl font-clay font-bold tracking-tight text-clay-text-heading sm:text-3xl">
                  {latest.year}
                </h2>
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs font-clay font-semibold uppercase tracking-[0.12em] text-clay-text-muted">
                      Mean heat index
                    </p>
                    <p className="mt-0.5 text-lg font-clay font-bold text-clay-text-heading">
                      {latest.mean_heat_index_c != null ? `${latest.mean_heat_index_c.toFixed(1)} °C` : 'n/a'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-clay font-semibold uppercase tracking-[0.12em] text-clay-text-muted">
                      Danger band
                    </p>
                    <p className="mt-0.5 text-lg font-clay font-bold text-clay-text-heading">
                      {latest.danger_band ?? 'n/a'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-clay font-semibold uppercase tracking-[0.12em] text-clay-text-muted">
                      Danger days (year)
                    </p>
                    <p className="mt-0.5 text-lg font-clay font-bold text-clay-text-heading">
                      {latest.danger_days != null ? latest.danger_days.toLocaleString() : 'n/a'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-clay font-semibold uppercase tracking-[0.12em] text-clay-text-muted">
                      Total danger days (45y)
                    </p>
                    <p className="mt-0.5 text-lg font-clay font-bold text-clay-text-heading">
                      {muni.total_danger_days_45y != null ? muni.total_danger_days_45y.toLocaleString() : 'n/a'}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* §5 Limitations — honest error bar. */}
          <section>
            <div className="clay-card--white rounded-[24px] border border-clay-text-muted/10 p-6 md:p-8 shadow-sm">
              <p className="clay-chip inline-flex mb-4 text-clay-text-muted">
                LIMITATIONS
              </p>
              <h2 className="mt-0 text-2xl font-clay font-bold tracking-tight text-clay-text-heading sm:text-3xl">
                Read this before acting
              </h2>
              <ul className="mt-4 space-y-3 text-sm text-clay-text-body font-clay leading-relaxed">
                <li>
                  <strong className="text-clay-text-heading">LST ≠ heat index.</strong> Satellites measure surface
                  temperature — much hotter than air. Heat index comes from NASA POWER air
                  temperature + humidity; Landsat LST gives the spatial pattern only.
                </li>
                <li>
                  <strong className="text-clay-text-heading">Grid-cell overlap.</strong> POWER's 0.5° grid (~55 km)
                  means adjacent municipalities may share a grid cell. Trends are per
                  municipality but should be read at grid scale where cells overlap.
                </li>
                <li>
                  <strong className="text-clay-text-heading">Cloud contamination.</strong> Optical thermal retrievals
                  over Bicol's cloudy tropics give uneven per-municipality sample counts.
                  Every result carries its n.
                </li>
                <li>
                  <strong className="text-clay-text-heading">Association, not causation.</strong> RF/SHAP ranks drivers;
                  it cannot prove causation. The mitigation list is a prioritisation aid,
                  not a proof.
                </li>
                <li>
                  <strong className="text-clay-text-heading">Municipality is the smallest unit.</strong> POWER's ~55 km
                  grid cannot resolve barangay-level differences.
                </li>
              </ul>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
