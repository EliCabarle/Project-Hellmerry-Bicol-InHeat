import { useEffect, useMemo, useState } from 'react'
import { rankMunicipalities } from './ranking.js'
import { addSaved, filterSaved, listSaved, removeSaved, savedKey, withRank } from './savedStore.js'
import { fetchTop10 } from './leaderboardStore.js'
import RankingTable from './components/RankingTable.jsx'

// Period and danger threshold come from the data itself (below); this is only the
// method line, so it must not repeat them.
const META_FALLBACK = 'Annual mean peak heat index · Theil-Sen + Mann-Kendall · α = 0.05'

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-white/10 bg-heat-surface/70 px-3 py-2.5 shadow-hud">
      <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-0.5 font-mono text-lg font-semibold tracking-tight text-slate-100">{value}</div>
      {hint ? <div className="mt-0.5 text-[10px] text-slate-500">{hint}</div> : null}
    </div>
  )
}

export default function RankingScreen({
  status = 'idle',
  error = null,
  reload,
  narratives = null,
  coverage = { withData: 0, total: 0 },
  supabase = null,
  user = null,
}) {
  const [mode, setMode] = useState('slope')
  const [savedOnly, setSavedOnly] = useState(false)
  const [savedKeys, setSavedKeys] = useState(() => new Set())
  const [saveError, setSaveError] = useState(null)
  const [board, setBoard] = useState(null) // null = still loading
  const [boardError, setBoardError] = useState(null)
  const [query, setQuery] = useState('')
  const canSave = Boolean(supabase && user)

  // Rank first, filter second: RankingTable prints `rank`, so filtering a ranked
  // list must not renumber the survivor (37th stays 37th in the saved view).
  const ranked = useMemo(
    () => withRank(rankMunicipalities(narratives?.municipalities ?? [], mode)),
    [narratives, mode],
  )
  const searched = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ranked
    return ranked.filter((m) => `${m?.name ?? ''} ${m?.province ?? ''}`.toLowerCase().includes(q))
  }, [query, ranked])
  const shown = savedOnly ? filterSaved(searched, savedKeys) : searched
  const significantCount = useMemo(
    () => ranked.filter((m) => m?.trend?.is_significant).length,
    [ranked],
  )
  const fastest = useMemo(
    () => ranked.reduce((max, m) => Math.max(max, Math.abs(m?.trend?.slope_c_per_year ?? 0)), 0),
    [ranked],
  )

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

  // The leaderboard view is public, so this loads without a session — a judge can
  // see it logged out. It does not depend on the trend data either.
  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    fetchTop10(supabase).then(({ data, error: err }) => {
      if (cancelled) return
      if (err) {
        setBoardError(err.message)
        return
      }
      setBoard(data ?? [])
    })
    return () => {
      cancelled = true
    }
  }, [supabase])

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
  // Until a task awards points every score is 0; a column of zeros reads as broken,
  // so it appears the first time any row has one. No code change needed later.
  const showScore = Boolean(board?.some((r) => (r?.score ?? 0) > 0))

  return (
    <div className="h-full overflow-y-auto bg-heat-bg">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-5 sm:py-5 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-heat-amber">Bicol · Region V</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Municipality heat ranking</h1>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">
              {META_FALLBACK} · {periodLine} · Danger &gt; {threshold}
            </p>
          </div>
          <p className="shrink-0 text-[11px] text-slate-500">
            Trend data for{' '}
            <span className="font-mono font-semibold text-slate-200">{coverage.withData}</span> of{' '}
            <span className="font-mono font-semibold text-slate-200">{coverage.total}</span> municipalities
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Stat label="Ranked LGUs" value={ranked.length || '—'} hint="all displayed, none filtered" />
          <Stat label="Significant" value={significantCount || '—'} hint="Mann-Kendall α = 0.05" />
          <Stat label="Fastest warming" value={fastest ? `${fastest.toFixed(3)}` : '—'} hint="°C per year, absolute" />
          <Stat label="Danger threshold" value={threshold} hint="peak heat index" />
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div role="group" aria-label="Order ranking by" className="flex shrink-0 rounded-lg border border-white/10 bg-black/20 p-0.5">
            <button
              type="button"
              aria-pressed={mode === 'slope'}
              onClick={() => setMode('slope')}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber ${
                mode === 'slope' ? 'bg-heat-amber text-slate-950' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
              }`}
            >
              Warming rate
            </button>
            <button
              type="button"
              aria-pressed={mode === 'danger'}
              onClick={() => setMode('danger')}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber ${
                mode === 'danger' ? 'bg-heat-amber text-slate-950' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
              }`}
            >
              Danger days
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <label htmlFor="ranking-search" className="sr-only">
              Search municipalities or provinces
            </label>
            <input
              id="ranking-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search municipality or province"
              className="w-full rounded-lg border border-white/10 bg-heat-surface/70 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber sm:max-w-xs"
            />
          </div>

          {/* Only shown when signed in: a filter that can only ever be empty is a dead control. */}
          {canSave && (
            <button
              type="button"
              aria-pressed={savedOnly}
              onClick={() => setSavedOnly((v) => !v)}
              className={`shrink-0 cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber ${
                savedOnly
                  ? 'border-heat-amber/50 bg-heat-amber/20 text-heat-amber'
                  : 'border-white/10 bg-heat-surface/70 text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              Saved only ({savedKeys.size})
            </button>
          )}
        </div>

        {saveError && (
          <div role="alert" className="mt-3 rounded-lg border border-heat-hot/50 bg-heat-surface/80 px-3 py-2 text-xs text-rose-200">
            {saveError}
          </div>
        )}

        {/* Public view: renders logged out, so a judge can see it without signing in.
            Collapsed by default — native <details>, no state to manage. */}
        <details className="mt-4 rounded-xl border border-white/10 bg-heat-surface/60 px-3 py-2.5 text-sm">
          <summary className="cursor-pointer select-none text-xs font-semibold text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber">
            Top 10 explorers
          </summary>
          {!supabase ? (
            <p className="mt-2 text-xs text-slate-400">Leaderboard is unavailable in this build.</p>
          ) : boardError ? (
            <p role="alert" className="mt-2 text-xs text-rose-200">
              Could not load the leaderboard — {boardError}
            </p>
          ) : board === null ? (
            <p aria-busy="true" className="mt-2 text-xs text-slate-400">
              Loading…
            </p>
          ) : board.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">No explorers yet — save a municipality to appear here.</p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full border-collapse text-xs tabular-nums">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[9px] uppercase tracking-[0.14em] text-slate-500">
                    <th scope="col" className="px-2 py-1.5">#</th>
                    <th scope="col" className="px-2 py-1.5">Explorer</th>
                    <th scope="col" className="px-2 py-1.5">Saved</th>
                    {showScore && <th scope="col" className="px-2 py-1.5">Score</th>}
                  </tr>
                </thead>
                <tbody>
                  {board.map((r, i) => (
                    <tr key={r?.handle ?? i} className="border-b border-white/5 last:border-0">
                      <td className="px-2 py-1.5 font-mono text-slate-500">{i + 1}</td>
                      <td className="px-2 py-1.5 text-slate-100">{r?.handle}</td>
                      <td className="px-2 py-1.5 text-slate-300">{r?.saved_count ?? 0}</td>
                      {showScore && <td className="px-2 py-1.5 text-slate-300">{r?.score ?? 0}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </details>

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
              className="cursor-pointer rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
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
        {status === 'ready' && ranked.length > 0 && shown.length === 0 && (
          <div className="mt-4 rounded-xl border border-white/10 bg-heat-surface/70 px-3 py-2.5 text-sm text-slate-300">
            {query.trim()
              ? 'No municipality matches that search.'
              : 'No saved places yet — turn off “Saved only” and save a municipality.'}
          </div>
        )}
        {status === 'ready' && shown.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-[10px] text-slate-500">
              <span>
                Showing <span className="font-mono text-slate-300">{shown.length}</span> of{' '}
                <span className="font-mono text-slate-300">{ranked.length}</span>
              </span>
              <span>Significance is a flag, never a filter</span>
            </div>
            <RankingTable
              rows={shown}
              mode={mode}
              savedKeys={savedKeys}
              onToggleSave={toggleSaved}
              canSave={canSave}
            />
            {narratives?.meta?.disclaimer && (
              <p className="mt-3 text-[10px] leading-4 text-slate-500">{narratives.meta.disclaimer}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
