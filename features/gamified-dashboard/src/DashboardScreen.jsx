import { useEffect, useMemo, useRef, useState } from 'react'
import { rankMunicipalities } from './ranking.js'
import { addSaved, filterSaved, listSaved, removeSaved, savedKey, withRank } from './savedStore.js'
import { createProgress, derive, manilaDate, weekStart } from './progressStore.js'
import { parseQuestCsv } from './questTasks.js'
import { readScore } from './scoreStore.js'
import { pushEvents } from './eventStore.js'
import DashboardTable from './components/DashboardTable.jsx'
import WeeklyProgressBar from './components/WeeklyProgressBar.jsx'
import QuestsTab from './components/QuestsTab.jsx'
import HistoryTab from './components/HistoryTab.jsx'
import Leaderboard from './components/Leaderboard.jsx'
import TopHotspots from './components/TopHotspots.jsx'
import MunicipalityFinder from './components/MunicipalityFinder.jsx'
import CollapsibleSection from './components/CollapsibleSection.jsx'
import DualLabel from './components/DualLabel.jsx'
import StatCard from './components/StatCard.jsx'
import NarrationPanel from './components/NarrationPanel.jsx'
import { LABELS as BASE_LABELS, labelsFor } from './labels.js'
import {
  ChartCard,
  BinBarChart,
  DriverBarChart,
  YearlyTrendChart,
} from './components/DashboardCharts.jsx'
import ChartDataTable from './components/ChartDataTable.jsx'
import {
  yearsOf,
  provinceYearlyMean,
  yearOverYearDelta,
  heatIndexHistogram,
  trendHistogram,
  dangerBandCounts,
  topDriverShares,
  dominantChangePoint,
  personDaysDanger,
  populationExposure,
  maxPersonDays,
  regionalDriverShares,
  regionalMedian,
  yearlyMeanCi95,
} from './chartData.js'
import {
  DANGER_BAND_COLORS,
  HEAT_AMBER,
  HEAT_ORANGE,
  TREND_COLORS,
  YEAR_COLORS,
} from './chartColors.js'
import { joinKey } from '../../map-controls/src/gis/engine.js'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'quests', label: 'Quests' },
  { id: 'history', label: 'History' },
  { id: 'leaderboard', label: 'Leaderboard' },
]

export default function DashboardScreen({
  status = 'idle',
  error = null,
  reload,
  narratives = null,
  geojson = null,
  coverage = { withData: 0, total: 0 },
  supabase = null,
  user = null,
  onShowOnMap = null,
  focusTab = null,
}) {
  const [sort, setSort] = useState('slope-desc')
  const [province, setProvince] = useState('All')
  const [savedOnly, setSavedOnly] = useState(false)
  const [savedKeys, setSavedKeys] = useState(() => new Set())
  const [saveError, setSaveError] = useState(null)
  const [progressSaveError, setProgressSaveError] = useState(null)
  const [query, setQuery] = useState('')
  const [yearChoice, setYearChoice] = useState(null)
  const [catalog, setCatalog] = useState([])
  const [finderFocus, setFinderFocus] = useState(null)
  const [isAnalyst, setIsAnalyst] = useState(false)
  const [selectedMunicipality, setSelectedMunicipality] = useState(null)
  const finderRef = useRef(null)
  const narrationRef = useRef(null)
  const canSave = Boolean(supabase && user)

  const term = isAnalyst ? 'LGUs' : 'Municipalities'
  // Copy follows the view mode: "Municipalities" in public, "LGUs" for analysts.
  const LABELS = useMemo(() => labelsFor(term), [term])

  // A name clicked in the list or Top hotspots: reveal, expand and scroll to the
  // finder, which scans to that card (and drops any filter hiding it).
  const showInFinder = (name, provinceName) => {
    if (!name) return
    setFinderFocus((prev) => ({ name, province: provinceName ?? '', nonce: (prev?.nonce ?? 0) + 1 }))
    finderRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  // Picking a municipality in the exposure table must bring its explanation
  // into view — the panel sits above the table, so without this the reader
  // clicks a row and sees nothing happen.
  useEffect(() => {
    if (!selectedMunicipality) return
    narrationRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [selectedMunicipality])

  useEffect(() => {
    let cancelled = false
    fetch('/data/eco_quests_tasks.csv')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.text()
      })
      .then((text) => {
        if (!cancelled) setCatalog(parseQuestCsv(text))
      })
      .catch(() => {
        if (!cancelled) setCatalog([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const store = useMemo(
    () => createProgress({ userId: user?.id ?? null, catalog }),
    [user?.id, catalog],
  )
  const [events, setEvents] = useState(() => store.read())
  const [pending, setPending] = useState(() => store.getPending())
  const [announcement, setAnnouncement] = useState('')
  const [scoreNote, setScoreNote] = useState(null)
  const [syncTick, setSyncTick] = useState(0)
  const [active, setActive] = useState('dashboard')
  const tabRefs = useRef({})
  const levelRef = useRef(null)

  const today = manilaDate(new Date())
  const week = weekStart(today)
  const derived = useMemo(() => derive(events, today), [events, today])
  const quests = useMemo(
    () => (catalog.length > 0 ? store.getDailyQuests() : []),
    [store, today, catalog.length],
  )

  const pendingEvents = useMemo(
    () =>
      quests
        .filter((q) => pending.includes(q.id))
        .map((q) => ({
          id: `pending-${q.id}`,
          date: today,
          kind: 'quest',
          questId: q.id,
          hp: q.hp,
          at: 0,
          label: q.title,
        })),
    [quests, pending, today],
  )
  const displayDerived = useMemo(
    () => derive([...events, ...pendingEvents], today),
    [events, pendingEvents, today],
  )

  const municipalities = useMemo(() => narratives?.municipalities ?? [], [narratives])

  const ranked = useMemo(
    () => withRank(rankMunicipalities(municipalities, sort)),
    [municipalities, sort],
  )

  const years = useMemo(() => yearsOf(municipalities), [municipalities])
  const latestYear = useMemo(() => {
    if (years.length === 0) return null
    return years[years.length - 1]
  }, [years])
  const selectedYear =
    yearChoice != null && years.includes(yearChoice) ? yearChoice : latestYear

  useEffect(() => {
    if (!focusTab?.id || focusTab.id === active) return
    setActive(focusTab.id)
  }, [focusTab?.id, focusTab?.token])

  useEffect(() => {
    if (!canSave) setSavedOnly(false)
  }, [canSave])

  useEffect(() => {
    if (!canSave) {
      setSavedKeys(new Set())
      return
    }
    let cancelled = false
    listSaved(supabase).then(({ data, error: err }) => {
      if (cancelled) return
      if (err) {
        setSaveError(`Could not load saved places — ${err.message}`)
        return
      }
      setSavedKeys(new Set((data ?? []).map((r) => savedKey(r.municipality_name, r.province))))
    })
    return () => {
      cancelled = true
    }
  }, [canSave, supabase, user])

  useEffect(() => {
    const r = store.checkIn()
    setEvents(r.events)
    setPending(store.getPending())
    setProgressSaveError(r.ok ? null : r.error)
    if (!r.noop) window.dispatchEvent(new Event('bih-progress'))
  }, [store])

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key != null && e.key !== store.key) return
      setEvents(store.read())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [store])

  useEffect(() => {
    if (!user || !supabase) {
      setScoreNote(null)
      return
    }
    let cancelled = false
    const run = async () => {
      const { error: pushErr } = await pushEvents(supabase, store.read(), today)
      if (cancelled) return
      if (pushErr) {
        setScoreNote(`Leaderboard score not updated — ${pushErr.message}`)
        return
      }

      const { score, error: readErr } = await readScore(supabase, user.id)
      if (cancelled) return
      if (readErr) {
        setScoreNote(`Leaderboard score not synced — ${readErr.message}`)
        return
      }

      if (score != null) {
        const restored = store.restoreTo(score)
        if (cancelled) return
        if (!restored.noop) {
          setEvents(restored.events)
          window.dispatchEvent(new Event('bih-progress'))
        }
      }
      setScoreNote(null)
      setSyncTick((n) => n + 1)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [supabase, user, store, derived.totalHP, today])

  useEffect(() => {
    if (levelRef.current === null) {
      levelRef.current = derived.level
      return
    }
    if (derived.level > levelRef.current) {
      setAnnouncement(`Level up — level ${derived.level}, ${derived.title}`)
    }
    levelRef.current = derived.level
  }, [derived.level, derived.title])

  const act = (fn) => {
    const r = fn()
    setEvents(r.events)
    setPending(store.getPending())
    setProgressSaveError(r.ok ? null : r.error)
    window.dispatchEvent(new Event('bih-progress'))
    return r
  }

  const onTabKeyDown = (e) => {
    const i = TABS.findIndex((t) => t.id === active)
    let next = null
    if (e.key === 'ArrowRight') next = (i + 1) % TABS.length
    else if (e.key === 'ArrowLeft') next = (i - 1 + TABS.length) % TABS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = TABS.length - 1
    if (next === null) return
    e.preventDefault()
    const id = TABS[next].id
    setActive(id)
    tabRefs.current[id]?.focus()
  }

  const toggleSaved = async (m) => {
    if (!canSave) return
    const key = savedKey(m?.name, m?.province)
    const wasSaved = savedKeys.has(key)
    setSaveError(null)
    setSavedKeys((prev) => {
      const next = new Set(prev)
      if (wasSaved) next.delete(key)
      else next.add(key)
      return next
    })
    const { error: err } = wasSaved
      ? await removeSaved(supabase, m?.name, m?.province)
      : await addSaved(supabase, m?.name, m?.province)
    if (err) {
      setSavedKeys((prev) => {
        const next = new Set(prev)
        if (wasSaved) next.add(key)
        else next.delete(key)
        return next
      })
      setSaveError(`${wasSaved ? 'Unsave' : 'Save'} failed — ${err.message}`)
    }
  }

  // The series years are the authoritative period. `meta.period` is only used
  // when it actually holds a four-digit year — the pipeline's copy currently
  // carries non-year values ("-9.26"/"85.56"), which would print as garbage.
  const metaPeriod = narratives?.meta?.period
  const metaStart = /^(\d{4})/.exec(String(metaPeriod?.start ?? ''))?.[1] ?? null
  const metaEnd = /^(\d{4})/.exec(String(metaPeriod?.end ?? ''))?.[1] ?? null
  const start = years[0] ?? metaStart
  const end = years[years.length - 1] ?? metaEnd
  const periodLine = start && end ? `${start}–${end}` : '—'
  const threshold = Number.isFinite(narratives?.meta?.danger_threshold_c)
    ? `${narratives.meta.danger_threshold_c} °C`
    : '42 °C'

  const yearly = useMemo(() => provinceYearlyMean(municipalities), [municipalities])
  const yoy = useMemo(() => yearOverYearDelta(municipalities, selectedYear), [municipalities, selectedYear])
  const heatDist = useMemo(() => heatIndexHistogram(municipalities, selectedYear), [municipalities, selectedYear])
  const trendDist = useMemo(() => trendHistogram(municipalities), [municipalities])
  const dangerBands = useMemo(() => dangerBandCounts(municipalities), [municipalities])
  const drivers = useMemo(() => topDriverShares(municipalities), [municipalities])

  // The dominant break across the region — the year most LGUs change
  // regime at. Rendered as a shaded era plus a labelled marker, and backed by
  // the count in the caption below the chart.
  const changePoint = useMemo(() => dominantChangePoint(municipalities), [municipalities])

  // Human-impact figures: how many people are exposed, and the regional
  // driver story that explains it.
  const exposure = useMemo(() => populationExposure(municipalities), [municipalities])
  const maxPd = useMemo(() => maxPersonDays(municipalities), [municipalities])
  const regionalDrivers = useMemo(() => regionalDriverShares(municipalities), [municipalities])
  const ndviMedian = useMemo(() => regionalMedian(municipalities, 'ndvi_mean'), [municipalities])
  const lstMedian = useMemo(() => regionalMedian(municipalities, 'lst_mean_c'), [municipalities])
  // 95% CI of the province mean heat index, per year (analyst view only).
  const meanCi = useMemo(() => yearlyMeanCi95(municipalities), [municipalities])

  // Exposure ordering: who has the most people in extreme heat. A warming
  // rate is a climate statistic an LGU cannot act on; person-days is the
  // number a mayor can put in a memo.
  const byExposure = useMemo(
    () => withRank(rankMunicipalities(municipalities, 'person-days')),
    [municipalities],
  )

  const significantCount = useMemo(
    () => ranked.filter((m) => m?.trend?.is_significant).length,
    [ranked],
  )
  // Share of the region whose warming trend is statistically significant.
  const warmingPct = useMemo(() => {
    const total = coverage.total || municipalities.length || 0
    return total > 0 ? Math.round((significantCount / total) * 100) : 0
  }, [significantCount, coverage.total, municipalities.length])
  const yearRow = useMemo(
    () => yearly.find((r) => r?.year === selectedYear) ?? null,
    [yearly, selectedYear],
  )
  const meanValue = yoy ? yoy.current : yearRow?.meanHeatIndexC ?? null
  const deltaValue = yoy?.deltaPct ?? null
  const deltaTone = deltaValue == null ? 'neutral' : deltaValue > 0 ? 'worse' : 'better'
  const deltaShown =
    deltaValue == null
      ? '—'
      : `${deltaValue > 0 ? '↑ +' : '↓ '}${deltaValue.toFixed(1)}%`

  // Hero stat: population exposure to days above the danger threshold, summed
  // across every municipality. The pipeline computes it per municipality.
  const personDays = useMemo(() => personDaysDanger(municipalities), [municipalities])
  // Average warming slope across municipalities
  const avgSlope = useMemo(() => {
    const slopes = municipalities.map((m) => m?.trend?.slope_c_per_year).filter(Number.isFinite)
    return slopes.length > 0 ? (slopes.reduce((a, b) => a + b, 0) / slopes.length).toFixed(3) : null
  }, [municipalities])

  const readyData = status === 'ready' && ranked.length > 0
  const yearLabel = selectedYear != null ? String(selectedYear) : '—'

  const headerClasses = `shrink-0 cursor-pointer min-h-11 rounded-full px-3 py-1.5 text-xs font-semibold bih-btn sm:text-sm transition-colors`

  return (
    <div id="main" className="flex h-full min-h-0 flex-col bg-heat-bg">
      {/* ===== Secondary Navigation =====
          The global header (BIH logo + Heat Points progress + menu) is the
          fixed NavBar in apps/web. The dashboard owns only page-level nav:
          the section tabs on the left, the Public/Analyst toggle on the right.
          The duplicated HeatBar is gone — the NavBar already shows the same
          level/HP numbers. */}
      <div className="sticky top-2 z-[700] mb-6 rounded-[2rem] border border-white/10 bg-heat-surface/95 px-5 py-1.5 shadow-hud backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Dashboard sections"
            onKeyDown={onTabKeyDown}
            className="flex flex-wrap gap-1"
          >
            {TABS.map((t) => {
              const selected = active === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-selected={selected}
                  aria-controls={`panel-${t.id}`}
                  tabIndex={selected ? 0 : -1}
                  ref={(el) => {
                    tabRefs.current[t.id] = el
                  }}
                  onClick={() => setActive(t.id)}
                  className={`relative min-h-11 cursor-pointer px-4 text-sm transition-colors ${
                    selected
                      ? 'font-bold text-clay-text-heading after:absolute after:inset-x-2 after:-bottom-px after:h-[3px] after:rounded-full after:bg-heat-orange'
                      : 'font-semibold text-clay-text-muted hover:text-clay-text-heading'
                  }`}
                >
                  {t.label}
                </button>
              )
            })}
          </div>

          <div
            role="group"
            aria-label="Dashboard detail level"
            className="flex items-center overflow-hidden rounded-full border border-white/10 bg-heat-surface/70"
          >
            <button
              type="button"
              onClick={() => setIsAnalyst(false)}
              aria-pressed={!isAnalyst}
              className={`${headerClasses} ${!isAnalyst ? 'bg-heat-amber text-slate-950' : 'bg-heat-surface/70 text-clay-text-muted'}`}
            >
              Public View
            </button>
            <button
              type="button"
              onClick={() => setIsAnalyst(true)}
              aria-pressed={isAnalyst}
              className={`${headerClasses} ${isAnalyst ? 'bg-heat-amber text-slate-950' : 'bg-heat-surface/70 text-clay-text-muted'}`}
            >
              Analyst View
            </button>
          </div>
        </div>
        {/* Level-up announcement (was the HeatBar's live region). */}
        <div aria-live="polite" className="sr-only">
          {announcement}
        </div>
      </div>

      {/* ===== Tab Panels ===== */}
      <div
        role="tabpanel"
        id="panel-dashboard"
        aria-labelledby="tab-dashboard"
        hidden={active !== 'dashboard'}
        className="min-h-0 flex-1"
      >
        <div className="bih-scroll h-full overflow-y-auto">
          <div className="mx-auto max-w-7xl px-3 py-4 sm:px-5 sm:py-5 lg:px-8">
            {/* Page header */}
            <div className="flex flex-col gap-3 mb-6">
              <p className="text-xs font-bold text-clay-text-muted uppercase tracking-wider">
                {LABELS.eyebrow.plain}
              </p>
              <h1 className="mt-1 text-3xl font-black text-clay-text-heading tracking-tight">
                {LABELS.title.plain}
              </h1>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-clay-text-muted">
                <DualLabel label={LABELS.methodPlain.plain} tech={LABELS.methodPlain.tech} />
              </p>
              <p className="mt-0.5 font-mono text-xs text-slate-400">{periodLine}</p>
            </div>

            {narratives?.meta?.disclaimer && (
              <p className="mt-3 rounded-lg border border-white/10 bg-heat-surface/80 px-3 py-2 text-xs leading-5 text-clay-text-muted">
                {narratives.meta.disclaimer}
              </p>
            )}

            {/* ===== ROW 1 — the four stat cards, full width =====
                Person-Days of Danger is the hero: population exposure to days
                above the danger threshold, summed across every municipality.
                The pipeline computes it per municipality; this only sums it. */}
            <div className={`mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 ${isAnalyst ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
              <StatCard
                title="Person-Days of Danger"
                value={personDays > 0 ? `${(personDays / 1e6).toFixed(1)}M` : '—'}
                delta={`population exposure above ${threshold}`}
                deltaTone="warming"
                hero
              />
              <StatCard
                title="People Exposed"
                value={exposure.exposedPopulation > 0 ? `${(exposure.exposedPopulation / 1e6).toFixed(2)}M` : '—'}
                delta={
                  exposure.exposedSharePct != null
                    ? `${exposure.exposedSharePct}% of Bicol · ${exposure.exposedCount} municipalities`
                    : '—'
                }
                deltaTone="warming"
              />
              <StatCard
                title={`${warmingPct}% of Bicol is Warming`}
                value={`${significantCount}/${coverage.total || municipalities.length}`}
                delta={
                  isAnalyst && changePoint
                    ? `${changePoint.count} show a ${changePoint.year} regime shift`
                    : 'every municipality, 1981–2025'
                }
                deltaTone="neutral"
              />
              <StatCard
                title="Avg Peak Heat"
                value={readyData && meanValue != null ? meanValue.toFixed(1) : '—'}
                unit=" °C"
                delta={deltaShown}
                deltaTone={deltaTone === 'worse' ? 'warming' : deltaTone === 'better' ? 'cooling' : 'neutral'}
              />
              {/* A warming rate is a climate statistic, not an exposure measure —
                  it belongs with the p-values, not in the public impact row. */}
              {isAnalyst && (
                <StatCard
                  title="Warming Rate"
                  value={avgSlope ?? '—'}
                  unit=" °C/yr"
                  delta={deltaTone === 'worse' ? '↑ accelerating' : deltaTone === 'better' ? '↓ decelerating' : '—'}
                  deltaTone={deltaTone === 'worse' ? 'warming' : deltaTone === 'better' ? 'cooling' : 'neutral'}
                />
              )}
            </div>

            {/* ===== ROW 2 — trend chart full width ===== */}
            <div className="flex min-w-0 flex-col gap-6 w-full">
              <div className="rounded-[2rem] border-none bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <ChartCard
                  title={LABELS.chartYearly.plain}
                  tech={LABELS.chartYearly.tech}
                  yearNote={`${start ?? '—'}–${end ?? '—'}`}
                  ariaLabel="Yearly trend of province-wide mean heat index and count of municipalities with danger days"
                  table={
                    <ChartDataTable
                      caption="Yearly trend data: mean heat index and municipality danger counts per year"
                      columns={[
                        { key: 'year', label: 'Year', numeric: true },
                        { key: 'meanHeatIndexC', label: 'Mean heat index (°C)', format: (v) => (v == null ? '—' : v.toFixed(2)) },
                        { key: 'dangerDayLgus', label: `${term} with ≥1 danger day` },
                        { key: 'nCounted', label: `${term} counted` },
                      ]}
                      rows={yearly}
                    />
                  }
                >
                  <YearlyTrendChart
                    data={yearly}
                    changePoint={changePoint}
                    ci={meanCi}
                    isAnalyst={isAnalyst}
                  />
                </ChartCard>
              </div>

              {/* The claim behind the marker: how many municipalities break at
                  that year, and the exact statistical method. Analyst-only —
                  the public reader gets the marker, not the claim. */}
              {isAnalyst && changePoint && (
                <p className="-mt-2 rounded-[1.25rem] border-none bg-[#FFFDF9] px-4 py-3 text-xs leading-5 text-[#8C847A]">
                  <span className="font-bold text-[#7F2D08]">
                    Pettitt change-point test: {changePoint.count} of {coverage.withData || '—'} {term.toLowerCase()}
                  </span>{' '}
                  show a structural break in {changePoint.year}. Shaded band: 95% CI of the province mean. Method: {narratives?.meta?.method ?? 'Theil-Sen slope with Mann-Kendall significance'}
                  {narratives?.meta?.alpha != null ? `, α = ${narratives.meta.alpha}` : ''}.
                </p>
              )}

              {readyData && (
                <CollapsibleSection
                  ariaLabel="Toggle heat index distribution and warming rate charts"
                  bareLabel="Heat and warming charts"
                  className="mt-4"
                  bodyClassName="grid gap-3 p-3 lg:grid-cols-2"
                >
                  <ChartCard
                    collapsible={false}
                    title={LABELS.chartHeatDist.plain}
                    tech={LABELS.chartHeatDist.tech}
                    yearNote={yearLabel}
                    ariaLabel={`Distribution of mean heat index across municipalities in ${yearLabel}`}
                    footnote="Same bins as the map legend, so bar colours match the map."
                    table={
                      <ChartDataTable
                        caption="Mean heat index distribution data"
                        columns={[
                          { key: 'label', label: 'Heat index (°C)', numeric: false },
                          { key: 'count', label: term },
                        ]}
                        rows={heatDist}
                      />
                    }
                  >
                    <BinBarChart bins={heatDist} term={term} colorFn={(bin) => YEAR_COLORS[bin.binIndex] ?? HEAT_AMBER} />
                  </ChartCard>

                  <ChartCard
                    collapsible={false}
                    title={LABELS.chartWarming.plain}
                    tech={LABELS.chartWarming.tech}
                    yearNote={`${start ?? '—'}–${end ?? '—'}`}
                    ariaLabel="Distribution of warming rates across municipalities"
                    footnote="Same bins as the map's rate legend. Non-significant rates are still counted."
                    table={
                      <ChartDataTable
                        caption="Warming rate distribution data"
                        columns={[
                          { key: 'label', label: 'Warming rate (°C/yr)', numeric: false },
                          { key: 'count', label: term },
                        ]}
                        rows={trendDist}
                      />
                    }
                {/* The claim behind the marker: how many municipalities break at
                    that year, and the exact statistical method. Analyst-only —
                    the public reader gets the marker, not the claim. */}
                {isAnalyst && changePoint && (
                  <p className="-mt-2 rounded-[1.25rem] border border-white/10 bg-heat-surface/80 px-4 py-3 text-xs leading-5 text-clay-text-muted">
                    <span className="font-bold text-heat-ink">
                      Pettitt change-point test: {changePoint.count} of {coverage.withData || '—'} {term.toLowerCase()}
                    </span>{' '}
                    show a structural break in {changePoint.year}. Shaded band: 95% CI of the province mean. Method: {narratives?.meta?.method ?? 'Theil-Sen slope with Mann-Kendall significance'}
                    {narratives?.meta?.alpha != null ? `, α = ${narratives.meta.alpha}` : ''}.
                  </p>
                )}

                {readyData && (
                  <CollapsibleSection
                    ariaLabel="Toggle heat index distribution and warming rate charts"
                    bareLabel="Heat and warming charts"
                    className="mt-4"
                    bodyClassName="grid gap-3 p-3 lg:grid-cols-2"
                  >
                    <BinBarChart bins={trendDist} term={term} colorFn={(bin) => TREND_COLORS[bin.binIndex] ?? HEAT_AMBER} labelAngle={-24} />
                  </ChartCard>
                </CollapsibleSection>
              )}
            </div>

            {/* ===== ROW 2b — Narration panel full width, room to breathe ===== */}
            <div ref={narrationRef} className="flex min-w-0 flex-col gap-6 w-full">
              <NarrationPanel
                selectedMunicipality={selectedMunicipality}
                narratives={narratives}
                isAnalyst={isAnalyst}
                exposure={exposure}
                regionalDrivers={regionalDrivers}
                ndviMedian={ndviMedian}
                lstMedian={lstMedian}
              />
            </div>

            {/* ===== ROW 3 — Most people at risk, full width ===== */}
            {readyData && (
              <div className="mt-6 w-full">
                <TopHotspots
                  rows={byExposure.slice(0, 10)}
                  onShowOnMap={(m) => onShowOnMap?.(joinKey(m?.name, m?.province))}
                  onShowInFinder={showInFinder}
                  onSelect={setSelectedMunicipality}
                  isAnalyst={isAnalyst}
                  maxPersonDays={maxPd}
                />
              </div>
            )}

            {/* ===== Danger Days & Drivers (below grid, full width) ===== */}
            {readyData && (
              <CollapsibleSection
                ariaLabel="Toggle danger days and driver charts"
                bareLabel="Danger days and drivers"
                className="mt-8"
                bodyClassName="grid gap-3 p-3 lg:grid-cols-2"
              >
                <ChartCard
                  collapsible={false}
                  title={LABELS.chartDangerDays.plain}
                  tech={LABELS.chartDangerDays.tech}
                  yearNote="45-year total"
                  ariaLabel="Municipalities grouped by 45-year total danger days"
                  footnote={`Days above ${threshold} across the whole period. Forecasts stay local: these are the ${term.toLowerCase()} trapping extreme heat.`}
                  table={
                    <ChartDataTable
                      caption="Danger day band data"
                      columns={[
                        { key: 'label', label: 'Danger days (45y)', numeric: false },
                        { key: 'count', label: term },
                      ]}
                      rows={dangerBands}
                    />
                  }
                >
                  <BinBarChart bins={dangerBands} term={term} colorFn={(bin, i) => DANGER_BAND_COLORS[i] ?? HEAT_ORANGE} />
                </ChartCard>

                {/* SHAP driver ranking is analyst-only: in Public view the
                    driver story is told in plain English by the narration. */}
                {isAnalyst && drivers.length > 0 && (
                  <ChartCard
                    collapsible={false}
                    title={LABELS.chartDrivers.plain}
                    tech={LABELS.chartDrivers.tech}
                    ariaLabel="Most common drivers of heat across municipalities, by SHAP share"
                    footnote="Mean SHAP share across the LGUs where each driver ranks top. Association, not causation."
                    table={
                      <ChartDataTable
                        caption="Driver ranking data"
                        columns={[
                          { key: 'label', label: 'Driver', numeric: false },
                          { key: 'meanShare', label: 'Mean share', format: (v) => `${Math.round((Number(v) || 0) * 100)}%` },
                          { key: 'lgus', label: term },
                        ]}
                        rows={drivers}
                      />
                    }
                  >
                    <DriverBarChart drivers={drivers} />
                  </ChartCard>
                )}
              </CollapsibleSection>
            )}

            {/* ===== Municipality Finder ===== */}
            {readyData && geojson && (
              <div ref={finderRef}>
                <MunicipalityFinder
                  geojson={geojson}
                  narratives={narratives}
                  onShowOnMap={onShowOnMap}
                  province={province}
                  onProvinceChange={setProvince}
                  savedOnly={savedOnly}
                  savedKeys={savedKeys}
                  canSave={canSave}
                  onSavedOnlyChange={setSavedOnly}
                  focus={finderFocus}
                  isAnalyst={isAnalyst}
                  term={term}
                />
              </div>
            )}

            {/* ===== Municipality List — prominent, core product ===== */}
            <div className="mt-8">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#8C847A] uppercase tracking-wider">
                    {term} Ranking
                  </p>
                  <h2 className="mt-0 text-xl font-black text-[#2D2D2D] tracking-tight">
                    Sorted by {sort.replace('-', ' · ')}
                  </h2>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="min-w-0 shrink-0">
                    <label htmlFor="dashboard-sort" className="sr-only">
                      Sort {term}
                    </label>
                    <select
                      id="dashboard-sort"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="min-h-11 w-full cursor-pointer rounded-lg border-none bg-[#F3EFE9] px-3 py-2 text-xs font-bold text-[#2D2D2D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D96C4D] sm:w-auto"
                    >
                      <option value="slope-desc">Warming rate · highest → lowest</option>
                      <option value="slope-asc">Warming rate · lowest → highest</option>
                      <option value="danger-desc">Danger days · highest → lowest</option>
                      <option value="danger-asc">Danger days · lowest → highest</option>
                      <option value="name-asc">Name · A → Z</option>
                      <option value="name-desc">Name · Z → A</option>
                    </select>
                  </div>

                  <div className="min-w-0 flex-1">
                    <label htmlFor="dashboard-search" className="sr-only">
                      Search {term} or provinces
                    </label>
                    <input
                      id="dashboard-search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={`Search ${term} or province`}
                      className="min-h-11 w-full rounded-lg border-none bg-[#F3EFE9] px-3 py-2 text-xs text-[#2D2D2D] placeholder:text-[#8C847A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D96C4D] sm:max-w-xs"
                    />
                  </div>
                  <p className="text-xs text-[#8C847A] md:hidden">
                    Trend data for{' '}
                    <span className="font-mono font-bold text-[#2D2D2D]">{coverage.withData}</span> of{' '}
                    <span className="font-mono font-bold text-[#2D2D2D]">{coverage.total}</span>
                  </p>
                </div>
              </div>

              {saveError && (
                <div role="alert" className="mt-3 rounded-lg border border-heat-hot/30 bg-heat-surface/80 px-3 py-2 text-xs text-heat-hot">
                  {saveError}
                </div>
              )}

              {status === 'loading' && (
                <div aria-busy="true" className="mt-4 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-14 animate-pulse rounded-[1rem] bg-heat-surface/70" />
                  ))}
                </div>
              )}
              {status === 'error' && (
                <div role="alert" className="mt-4 rounded-[1rem] border border-heat-hot/30 bg-heat-surface/80 px-3 py-2.5 text-sm">
                  <div className="font-bold text-clay-text-heading">Could not load trend data</div>
                  <div className="mb-2 text-xs text-clay-text-muted">{error}</div>
                  <button
                    type="button"
                    onClick={() => reload?.()}
                    className="cursor-pointer rounded-[12px] bg-heat-orange px-2.5 py-1 text-xs font-bold text-slate-950 hover:bg-heat-hot bih-btn"
                  >
                    Try again
                  </button>
                </div>
              )}
              {status === 'ready' && ranked.length === 0 && (
                <div className="mt-4 rounded-[1rem] border border-white/10 bg-heat-surface/70 px-3 py-2.5 text-sm text-clay-text-muted">
                  No trend data yet — check back soon.
                </div>
              )}
              {readyData && (
                <DashboardTableRows
                  term={term}
                  ranked={ranked}
                  query={query}
                  province={province}
                  savedOnly={savedOnly}
                  savedKeys={savedKeys}
                  canSave={canSave}
                  onToggleSave={toggleSaved}
                  mode={sort}
                  onShowInFinder={showInFinder}
                  isAnalyst={isAnalyst}
                />
              )}
            </div>

            {/* ===== Data sources — the multi-mission proof strip ===== */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 border-none pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Data sources
              </span>
              {['NASA POWER', 'Landsat', 'MODIS', 'SEDAC', 'PAGASA', 'geoBoundaries'].map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center rounded-full border border-white/10 bg-heat-surface/70 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-clay-text-muted"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        role="tabpanel"
        id="panel-quests"
        aria-labelledby="tab-quests"
        hidden={active !== 'quests'}
        className="bih-scroll min-h-0 flex-1 overflow-y-auto"
      >
        {active === 'quests' && (
          <div className="mx-auto max-w-7xl px-3 pt-4 sm:px-5 lg:px-8">
            <WeeklyProgressBar supabase={supabase} week={week} reloadKey={syncTick} />
          </div>
        )}
        <QuestsTab
          derived={derived}
          displayTodayTotal={displayDerived.todayTotal}
          pending={pending}
          saveError={progressSaveError ?? scoreNote}
          quests={quests}
          onTogglePending={(id) => act(() => store.togglePending(id))}
          onSubmitQuest={(id) => act(() => store.submitQuest(id))}
        />
      </div>

      <div
        role="tabpanel"
        id="panel-history"
        aria-labelledby="tab-history"
        hidden={active !== 'history'}
        className="bih-scroll min-h-0 flex-1 overflow-y-auto"
      >
        <HistoryTab derived={derived} events={events} today={today} />
      </div>

      <div
        role="tabpanel"
        id="panel-leaderboard"
        aria-labelledby="tab-leaderboard"
        hidden={active !== 'leaderboard'}
        className="bih-scroll min-h-0 flex-1 overflow-y-auto"
      >
        <Leaderboard supabase={supabase} reloadKey={derived.totalHP} />
      </div>
    </div>
  )
}

const RANKING_PAGE_SIZE = 10

function RankingPaginator({ page, totalPages, onChangePage }) {
  const disabledPrev = page <= 1
  const disabledNext = page >= totalPages || totalPages === 0
  return (
    <div className="mt-4 flex items-center justify-between gap-2 px-2">
      <button
        type="button"
        disabled={disabledPrev}
        onClick={() => onChangePage((p) => Math.max(1, p - 1))}
        aria-label="Previous page of ranking"
        className={`cursor-pointer min-h-10 shrink-0 rounded-[12px] border border-white/10 px-3 py-1 text-xs font-bold bih-btn ${disabledPrev ? 'text-clay-text-muted disabled:opacity-40 disabled:cursor-not-allowed' : 'text-clay-text-heading hover:bg-white/5'}`}
      >
        ← Prev
      </button>
      <span className="text-xs font-bold text-clay-text-muted shrink-0">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        disabled={disabledNext}
        onClick={() => onChangePage((p) => Math.min(totalPages, p + 1))}
        aria-label="Next page of ranking"
        className={`cursor-pointer min-h-10 shrink-0 rounded-[12px] border border-white/10 px-3 py-1 text-xs font-bold bih-btn ${disabledNext ? 'text-clay-text-muted disabled:opacity-40 disabled:cursor-not-allowed' : 'text-clay-text-heading hover:bg-white/5'}`}
      >
        Next →
      </button>
    </div>
  )
}

function DashboardTableRows({
  term,
  ranked,
  query,
  province = 'All',
  savedOnly,
  savedKeys,
  canSave,
  onToggleSave,
  mode,
  onShowInFinder = null,
  isAnalyst = false,
}) {
  const [page, setPage] = useState(1)

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ranked
    return ranked.filter((m) => `${m?.name ?? ''} ${m?.province ?? ''}`.toLowerCase().includes(q))
  }, [query, ranked])

  const savedFiltered = savedOnly ? filterSaved(searched, savedKeys) : searched
  const shown =
    province === 'All'
      ? savedFiltered
      : savedFiltered.filter((m) => String(m?.province ?? '').trim() === province)

  useEffect(() => {
    setPage(1)
  }, [province, query, savedOnly, savedKeys, ranked])

  const totalPages = Math.max(1, Math.ceil(shown.length / RANKING_PAGE_SIZE))
  const paginated = shown.slice((page - 1) * RANKING_PAGE_SIZE, page * RANKING_PAGE_SIZE)

  if (shown.length === 0) {
    return (
      <div className="mt-4 rounded-[1rem] border border-white/10 bg-heat-surface/70 px-3 py-2.5 text-sm text-clay-text-muted">
        {query.trim()
          ? 'No municipality matches that search.'
          : province !== 'All'
            ? `No municipalities in ${province}${savedOnly ? ' saved' : ''}.`
            : 'No saved places yet — turn off “Saved only” and save a municipality.'}
      </div>
    )
  }

  const rangeStart = (page - 1) * RANKING_PAGE_SIZE + 1
  const rangeEnd = Math.min(page * RANKING_PAGE_SIZE, shown.length)

  return (
    <div className="mt-4">
      <p className="text-xs text-clay-text-muted">
        {province === 'All'
          ? `Showing ${rangeStart}–${rangeEnd} of ${shown.length} ${term === 'LGUs' ? 'LGUs' : 'municipalities'} (page ${page} of ${totalPages})`
          : `${shown.length} ${term === 'LGUs' ? 'LGUs' : 'municipalities'} in ${province} — showing ${rangeStart}–${rangeEnd} (page ${page} of ${totalPages})`}
      </p>
      <span className="block mt-1 text-xs text-clay-text-muted">Significance is a flag, never a filter</span>
      <DashboardTable
        rows={paginated}
        mode={mode}
        savedKeys={savedKeys}
        onToggleSave={onToggleSave}
        canSave={canSave}
        onShowInFinder={onShowInFinder}
        isAnalyst={isAnalyst}
      />
      <RankingPaginator page={page} totalPages={totalPages} onChangePage={setPage} />
    </div>
  )
}
