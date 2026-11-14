import { useEffect, useMemo, useRef, useState } from 'react'
import { rankMunicipalities } from './ranking.js'
import { addSaved, filterSaved, listSaved, removeSaved, savedKey, withRank } from './savedStore.js'
import { createProgress, derive, manilaDate, weekStart } from './progressStore.js'
import { parseQuestCsv } from './questTasks.js'
import { readScore } from './scoreStore.js'
import { pushEvents } from './eventStore.js'
import DashboardTable from './components/DashboardTable.jsx'
import HeatBar from './components/HeatBar.jsx'
import WeeklyProgressBar from './components/WeeklyProgressBar.jsx'
import QuestsTab from './components/QuestsTab.jsx'
import HistoryTab from './components/HistoryTab.jsx'
import Leaderboard from './components/Leaderboard.jsx'
import TopHotspots from './components/TopHotspots.jsx'
import MunicipalityFinder from './components/MunicipalityFinder.jsx'
import CollapsibleSection from './components/CollapsibleSection.jsx'
import DualLabel from './components/DualLabel.jsx'
import { LABELS } from './labels.js'
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

function Stat({ label, tech, value, hint, tone = 'neutral' }) {
  const toneClass =
    tone === 'worse' ? 'text-heat-hot' : tone === 'better' ? 'text-heat-cool' : 'text-slate-100'
  return (
    <div className="rounded-xl border border-white/10 bg-heat-surface/70 px-3 py-2.5 shadow-hud">
      <DualLabel label={label} tech={tech} />
      <div className={`mt-0.5 font-mono text-lg font-semibold tracking-tight sm:text-2xl ${toneClass}`}>{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-slate-500">{hint}</div> : null}
    </div>
  )
}

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
  const [yearChoice, setYearChoice] = useState(null) // null = follow the latest data year
  const [catalog, setCatalog] = useState([])
  const [finderFocus, setFinderFocus] = useState(null) // { name, province, nonce }
  const finderRef = useRef(null)
  const canSave = Boolean(supabase && user)

  // A name clicked in the list or Top hotspots: reveal, expand and scroll to the
  // finder, which scans to that card (and drops any filter hiding it).
  const showInFinder = (name, provinceName) => {
    if (!name) return
    setFinderFocus((prev) => ({ name, province: provinceName ?? '', nonce: (prev?.nonce ?? 0) + 1 }))
    finderRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  // Load the quest CSV once. On failure the store falls back to the static
  // QUESTS list, so the checklist is never empty.
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

  // One progress store per account: the key follows `user`, so signing out drops
  // back to the guest log and a second account never sees the first one's HP.
  // It also rebuilds when the CSV lands, so the day's draw comes from real tasks.
  const store = useMemo(
    () => createProgress({ userId: user?.id ?? null, catalog }),
    [user?.id, catalog],
  )
  const [events, setEvents] = useState(() => store.read())
  const [pending, setPending] = useState(() => store.getPending())
  const [announcement, setAnnouncement] = useState('')
  // Sync result, kept separate from progressSaveError so one alert cannot clear
  // the other.
  const [scoreNote, setScoreNote] = useState(null)
  // Bumped after a successful event push so the collective bar refetches *after*
  // the server has the new rows, not in parallel with them.
  const [syncTick, setSyncTick] = useState(0)
  const [active, setActive] = useState('dashboard')
  const tabRefs = useRef({})
  const levelRef = useRef(null)

  const today = manilaDate(new Date())
  // Monday of the current ISO week; the collective view buckets by the same day.
  const week = weekStart(today)
  const derived = useMemo(() => derive(events, today), [events, today])
  // Today's five quests. Memoized per store/day so a reload mid-day is identical.
  // While the CSV is still loading, render nothing rather than the static
  // fallback: only drawn quests may be ticked, so the client can never emit more
  // than the server's 5-awards-a-day quota and fail the whole sync batch.
  const quests = useMemo(
    () => (catalog.length > 0 ? store.getDailyQuests() : []),
    [store, today, catalog.length],
  )

  // Pending checks are visual only. Merged into the derived log so the HeatBar
  // and Today's HP move when a box is ticked, but never written as events and
  // never published — the leaderboard only sees submitted quests.
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

  // Rank reflects the visible order: `withRank` runs after the sort, so the
  // number matches the row's position under the selected mode.
  const ranked = useMemo(
    () => withRank(rankMunicipalities(municipalities, sort)),
    [municipalities, sort],
  )

  // Top hotspots keep their own extreme-first order (|slope| desc) and never
  // follow the list's sort — the panel is "what is hottest", not "the list".
  const extreme = useMemo(
    () => withRank(rankMunicipalities(municipalities, 'slope')),
    [municipalities],
  )

  const years = useMemo(() => yearsOf(municipalities), [municipalities])
  const latestYear = useMemo(() => {
    if (years.length === 0) return null
    return years[years.length - 1]
  }, [years])
  const selectedYear =
    yearChoice != null && years.includes(yearChoice) ? yearChoice : latestYear

  // External tab control (used by the map page's menu): switching `focusTab.id`
  // applies that dashboard tab; the token rises on every request so re-clicking
  // an already-open tab still refires. Mirrors the shell's focusToken pattern.
  useEffect(() => {
    if (!focusTab?.id || focusTab.id === active) return
    setActive(focusTab.id)
  }, [focusTab?.id, focusTab?.token])

  // A hidden filter that can no longer be switched off would strand the list
  // after sign-out, so clear "saved only" whenever saving is unavailable.
  useEffect(() => {
    if (!canSave) setSavedOnly(false)
  }, [canSave])

  // Load the user's saved places once per session; signing out clears them so a
  // second account on the same tab cannot inherit the first account's stars.
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

  // First open of a Manila calendar day awards the login streak entry.
  useEffect(() => {
    const r = store.checkIn()
    setEvents(r.events)
    setPending(store.getPending())
    setProgressSaveError(r.ok ? null : r.error)
    if (!r.noop) window.dispatchEvent(new Event('bih-progress'))
  }, [store])

  // Another tab wrote progress: re-read this slice's one key. `store.key` moves
  // with the account, so a write belonging to the other account is ignored.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key != null && e.key !== store.key) return
      setEvents(store.read())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [store])

  // Publish this account's HP as events, then make the local total match what the
  // server actually stored. Order is push -> read -> reconcile:
  //   - pushing first means the server sees everything it will accept;
  //   - a failed push (offline) returns early, so a legitimate local log is never
  //     lowered to a stale score;
  //   - only a *successful* push can reveal drift, and reconciling after it lowers
  //     exactly the HP the server refused (pre-0009 history, duplicate awards).
  // Pushing is idempotent — the server dedupes on its primary key — so re-sending
  // the log is safe. The log is read from the store, not from `events`: on an
  // account switch the state is one commit behind the new key, and pushing that
  // lag would send the previous account's HP.
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

      // Adopt — or shed — HP so the HeatBar shows the account's real score.
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

  // Announce level-ups politely; never announce the initial level.
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
    // The shell's fixed navbar derives from the same store — tell it to re-read.
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

  // Optimistic toggle, reverted on failure: the star responds instantly, but a
  // failed write never leaves the UI claiming a row was saved.
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

  const period = narratives?.meta?.period
  const start = period?.start?.slice(0, 4)
  const end = period?.end?.slice(0, 4)
  const periodLine = start && end ? `${start}–${end}` : '—'
  const threshold = Number.isFinite(narratives?.meta?.danger_threshold_c)
    ? `${narratives.meta.danger_threshold_c} °C`
    : '42 °C'

  // ---- chart data (all computed, none invented) ----
  const yearly = useMemo(() => provinceYearlyMean(municipalities), [municipalities])
  const yoy = useMemo(() => yearOverYearDelta(municipalities, selectedYear), [municipalities, selectedYear])
  const heatDist = useMemo(() => heatIndexHistogram(municipalities, selectedYear), [municipalities, selectedYear])
  const trendDist = useMemo(() => trendHistogram(municipalities), [municipalities])
  const dangerBands = useMemo(() => dangerBandCounts(municipalities), [municipalities])
  const drivers = useMemo(() => topDriverShares(municipalities), [municipalities])

  const significantCount = useMemo(
    () => ranked.filter((m) => m?.trend?.is_significant).length,
    [ranked],
  )
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

  const readyData = status === 'ready' && ranked.length > 0
  const yearLabel = selectedYear != null ? String(selectedYear) : '—'

  return (
    <div id="main" className="flex h-full min-h-0 flex-col bg-heat-bg">
      <HeatBar
        level={displayDerived.level}
        title={displayDerived.title}
        inLevel={displayDerived.inLevel}
        totalHP={displayDerived.totalHP}
        announcement={announcement}
      />

      <div
        role="tablist"
        aria-label="Dashboard sections"
        onKeyDown={onTabKeyDown}
        className="shrink-0 border-b border-white/10 bg-heat-deep/60 px-3 sm:px-5"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap gap-2 py-1.5">
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
                className={`shrink-0 cursor-pointer min-h-11 rounded-md px-3 py-1.5 text-xs font-semibold bih-btn sm:text-sm ${selected ? 'bg-heat-amber text-slate-950' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'}`}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id="panel-dashboard"
        aria-labelledby="tab-dashboard"
        hidden={active !== 'dashboard'}
        className="min-h-0 flex-1"
      >
        <div className="bih-scroll h-full overflow-y-auto">
          <div className="mx-auto max-w-7xl px-3 py-4 sm:px-5 sm:py-5 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-heat-amber">
              {LABELS.eyebrow.plain}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {LABELS.title.plain}
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">
              <DualLabel label={LABELS.methodPlain.plain} tech={LABELS.methodPlain.tech} />{' · '}{periodLine}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <label htmlFor="dashboard-year" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Year
            </label>
            <select
              id="dashboard-year"
              value={yearLabel}
              onChange={(e) => setYearChoice(Number(e.target.value))}
              disabled={!readyData}
              className="cursor-pointer rounded-lg border border-white/10 bg-heat-deep/90 px-2 py-1.5 font-mono text-xs text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <p className="hidden text-xs text-slate-500 md:block">
              Trend data for{' '}
              <span className="font-mono font-semibold text-slate-200">{coverage.withData}</span> of{' '}
              <span className="font-mono font-semibold text-slate-200">{coverage.total}</span> municipalities
            </p>
          </div>
        </div>

        {narratives?.meta?.disclaimer && (
          <p className="mt-3 rounded-lg border border-heat-amber/30 bg-heat-surface/60 px-3 py-2 text-xs leading-5 text-slate-400">
            {narratives.meta.disclaimer}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Stat
            label={LABELS.kpiWarming.plain}
            tech={LABELS.kpiWarming.tech}
            value={readyData ? significantCount : '—'}
          />
          <Stat
            label={LABELS.kpiMeanHi.plain}
            tech={LABELS.kpiMeanHi.tech}
            value={
              readyData && meanValue != null ? `${meanValue.toFixed(2)} °C · ${yearLabel}` : '—'
            }
            hint={`province-wide mean over ${coverage.withData || '—'} LGUs`}
          />
          <Stat
            label={LABELS.kpiChange.plain}
            tech={LABELS.kpiChange.tech}
            value={readyData ? deltaShown : '—'}
            hint={Number.isFinite(selectedYear) ? `vs ${selectedYear - 1} mean` : undefined}
            tone={deltaTone}
          />
          <Stat
            label={LABELS.kpiDanger.plain}
            tech={LABELS.kpiDanger.tech}
            value={readyData && yearRow ? yearRow.dangerDayLgus : '—'}
            hint={`≥ 1 day above ${threshold} · ${yearLabel}`}
          />
        </div>

        {readyData && (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <ChartCard
                title={LABELS.chartYearly.plain}
                tech={LABELS.chartYearly.tech}
                yearNote={`${start ?? '—'}–${end ?? '—'}`}
                ariaLabel="Yearly trend of province-wide mean heat index and count of municipalities with danger days"
                table={
                  <ChartDataTable
                    caption="Yearly trend data: mean heat index and LGU danger counts per year"
                    columns={[
                      { key: 'year', label: 'Year', numeric: true },
                      { key: 'meanHeatIndexC', label: 'Mean heat index (°C)', format: (v) => (v == null ? '—' : v.toFixed(2)) },
                      { key: 'dangerDayLgus', label: 'LGUs with ≥1 danger day' },
                      { key: 'nCounted', label: 'LGUs counted' },
                    ]}
                    rows={yearly}
                  />
                }
              >
                <YearlyTrendChart data={yearly} />
              </ChartCard>
            </div>

            <CollapsibleSection
              ariaLabel="Toggle heat index distribution and warming rate charts"
              bareLabel="Heat and warming charts"
              className="lg:col-span-2"
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
                    { key: 'count', label: 'LGUs' },
                  ]}
                  rows={heatDist}
                />
              }
            >
              <BinBarChart bins={heatDist} colorFn={(bin) => YEAR_COLORS[bin.binIndex] ?? HEAT_AMBER} />
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
                    { key: 'count', label: 'LGUs' },
                  ]}
                  rows={trendDist}
                />
              }
            >
              <BinBarChart bins={trendDist} colorFn={(bin) => TREND_COLORS[bin.binIndex] ?? HEAT_AMBER} labelAngle={-24} />
            </ChartCard>
            </CollapsibleSection>

            <CollapsibleSection
              ariaLabel="Toggle danger days and driver charts"
              bareLabel="Danger days and drivers"
              className="lg:col-span-2"
              bodyClassName="grid gap-3 p-3 lg:grid-cols-2"
            >
            <ChartCard
              collapsible={false}
              title={LABELS.chartDangerDays.plain}
              tech={LABELS.chartDangerDays.tech}
              yearNote="45-year total"
              ariaLabel="Municipalities grouped by 45-year total danger days"
              footnote={`Days above ${threshold} across the whole period. Forecasts stay local: these are the LGUs trapping extreme heat.`}
              table={
                <ChartDataTable
                  caption="Danger day band data"
                  columns={[
                    { key: 'label', label: 'Danger days (45y)', numeric: false },
                    { key: 'count', label: 'LGUs' },
                  ]}
                  rows={dangerBands}
                />
              }
            >
              <BinBarChart
                bins={dangerBands}
                colorFn={(bin, i) => DANGER_BAND_COLORS[i] ?? HEAT_ORANGE}
              />
            </ChartCard>

            {drivers.length > 0 && (
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
                      { key: 'lgus', label: 'LGUs' },
                    ]}
                    rows={drivers}
                  />
                }
              >
                <DriverBarChart drivers={drivers} />
              </ChartCard>
            )}
            </CollapsibleSection>
          </div>
        )}

        {readyData && (
          <div className="mt-4">
            <TopHotspots
              rows={extreme.slice(0, 10)}
              onShowOnMap={(m) => onShowOnMap?.(joinKey(m?.name, m?.province))}
              onShowInFinder={showInFinder}
            />
          </div>
        )}

        {/* Finder card carousel: shell already passes geojson ({...data}), so no
            cross-boundary edit is involved. Bounded stage adds no scroll.
            Province is shared with the list below — the dropdown filters both. */}
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
            />
          </div>
        )}

        <CollapsibleSection title="Municipality list" ariaLabel="Municipality list">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0 shrink-0">
            <label htmlFor="dashboard-sort" className="sr-only">
              Sort municipalities
            </label>
            <select
              id="dashboard-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="min-h-11 w-full cursor-pointer rounded-lg border border-white/10 bg-heat-surface/70 px-3 py-2 text-xs font-semibold text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber sm:w-auto"
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
              Search municipalities or provinces
            </label>
            <input
              id="dashboard-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search municipality or province"
              className="min-h-11 w-full rounded-lg border border-white/10 bg-heat-surface/70 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber sm:max-w-xs"
            />
          </div>
          <p className="text-xs text-slate-500 md:hidden">
            Trend data for{' '}
            <span className="font-mono font-semibold text-slate-200">{coverage.withData}</span> of{' '}
            <span className="font-mono font-semibold text-slate-200">{coverage.total}</span>
          </p>

        </div>

        {saveError && (
          <div role="alert" className="mt-3 rounded-lg border border-heat-hot/50 bg-heat-surface/80 px-3 py-2 text-xs text-rose-200">
            {saveError}
          </div>
        )}

        {status === 'loading' && (
          <div aria-busy="true" className="mt-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-heat-surface/60" />
            ))}
          </div>
        )}
        {status === 'error' && (
          <div role="alert" className="mt-4 rounded-xl border border-heat-hot/50 bg-heat-surface/80 px-3 py-2.5 text-sm">
            <div className="font-semibold">Could not load trend data</div>
            <div className="mb-2 text-xs text-slate-400">{error}</div>
            <button
              type="button"
              onClick={() => reload?.()}
              className="cursor-pointer rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20 bih-btn"
            >
              Try again
            </button>
          </div>
        )}
        {status === 'ready' && ranked.length === 0 && (
          <div className="mt-4 rounded-xl border border-white/10 bg-heat-surface/70 px-3 py-2.5 text-sm text-slate-300">
            No trend data yet — check back soon.
          </div>
        )}

        {readyData && (
          <DashboardTableRows
            ranked={ranked}
            query={query}
            province={province}
            savedOnly={savedOnly}
            savedKeys={savedKeys}
            canSave={canSave}
            onToggleSave={toggleSaved}
            mode={sort}
            onShowInFinder={showInFinder}
          />
        )}
        </CollapsibleSection>
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
        className={`cursor-pointer min-h-10 shrink-0 rounded-md border px-3 py-1 text-xs font-semibold bih-btn ${
          disabledPrev
            ? 'border-white/5 text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed'
            : 'border-white/10 text-slate-200 hover:bg-white/5 hover:text-white'
        }`}
      >
        ← Prev
      </button>
      <span className="text-xs text-slate-500 shrink-0">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        disabled={disabledNext}
        onClick={() => onChangePage((p) => Math.min(totalPages, p + 1))}
        aria-label="Next page of ranking"
        className={`cursor-pointer min-h-10 shrink-0 rounded-md border px-3 py-1 text-xs font-semibold bih-btn ${
          disabledNext
            ? 'border-white/5 text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed'
            : 'border-white/10 text-slate-200 hover:bg-white/5 hover:text-white'
        }`}
      >
        Next →
      </button>
    </div>
  )
}

function DashboardTableRows({ ranked, query, province = 'All', savedOnly, savedKeys, canSave, onToggleSave, mode, onShowInFinder = null }) {
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

  // Reset to page 1 whenever the filtered list actually changes
  // (shared province, search, saved-only, or sort mode). Depends on the root
  // inputs, not the derived `shown` array, which is a new reference every render.
  useEffect(() => {
    setPage(1)
  }, [province, query, savedOnly, savedKeys, ranked])

  const totalPages = Math.max(1, Math.ceil(shown.length / RANKING_PAGE_SIZE))
  const paginated = shown.slice((page - 1) * RANKING_PAGE_SIZE, page * RANKING_PAGE_SIZE)

  if (shown.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-white/10 bg-heat-surface/70 px-3 py-2.5 text-sm text-slate-300">
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
      <p className="text-xs text-slate-500">
        {province === 'All'
          ? `Showing ${rangeStart}–${rangeEnd} of ${shown.length} LGUs (page ${page} of ${totalPages})`
          : `${shown.length} LGUs in ${province} — showing ${rangeStart}–${rangeEnd} (page ${page} of ${totalPages})`}
      </p>
      <span className="block mt-1 text-xs text-slate-500">Significance is a flag, never a filter</span>
      <DashboardTable
        rows={paginated}
        mode={mode}
        savedKeys={savedKeys}
        onToggleSave={onToggleSave}
        canSave={canSave}
        onShowInFinder={onShowInFinder}
      />
      <RankingPaginator page={page} totalPages={totalPages} onChangePage={setPage} />
    </div>
  )
}
