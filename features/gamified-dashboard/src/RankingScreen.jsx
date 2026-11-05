import { useEffect, useMemo, useState } from 'react'
import { rankMunicipalities } from './ranking.js'
import { addSaved, filterSaved, listSaved, removeSaved, savedKey, withRank } from './savedStore.js'
import { fetchTop10 } from './leaderboardStore.js'
import RankingTable from './components/RankingTable.jsx'

// Period and danger threshold come from the data itself (below); this is only the
// method line, so it must not repeat them.
const META_FALLBACK = 'Annual mean peak heat index · Theil-Sen + Mann-Kendall · α = 0.05'

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
  const canSave = Boolean(supabase && user)

  // Rank first, filter second: RankingTable prints `rank`, so filtering a ranked
  // list must not renumber the survivor (37th stays 37th in the saved view).
  const ranked = useMemo(
    () => withRank(rankMunicipalities(narratives?.municipalities ?? [], mode)),
    [narratives, mode],
  )
  const shown = savedOnly ? filterSaved(ranked, savedKeys) : ranked

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
  const periodLine = period?.start?.slice(0, 4) && period?.end?.slice(0, 4)
    ? ` · ${period.start.slice(0, 4)}–${period.end.slice(0, 4)}`
    : ''
  const threshold = Number.isFinite(narratives?.meta?.danger_threshold_c)
    ? ` · Danger > ${narratives.meta.danger_threshold_c} °C`
    : ' · Danger > 42 °C'
  // Until a task awards points every score is 0; a column of zeros reads as broken,
  // so it appears the first time any row has one. No code change needed later.
  const showScore = Boolean(board?.some((r) => (r?.score ?? 0) > 0))

  return (
    <div className="h-full overflow-y-auto bg-heat-bg px-4 py-4 text-slate-100">
      <h1 className="text-lg font-semibold">Municipality ranking</h1>
      <p className="mt-0.5 text-xs text-slate-400">
        {META_FALLBACK}{periodLine}{threshold}
      </p>
      <p className="mt-2 text-xs text-slate-400">
        Trend data available for <span className="font-semibold text-slate-200">{coverage.withData}</span> of{' '}
        <span className="font-semibold text-slate-200">{coverage.total}</span> municipalities.
        {coverage.total > coverage.withData && ' The remaining ones appear as soon as data arrives.'}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Order ranking by" className="flex gap-2">
          <button
            type="button"
            aria-pressed={mode === 'slope'}
            onClick={() => setMode('slope')}
            className={`cursor-pointer rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${
              mode === 'slope' ? 'bg-heat-hot font-semibold text-white' : 'bg-heat-dark text-slate-300 hover:bg-slate-700'
            }`}
          >
            Warming rate
          </button>
          <button
            type="button"
            aria-pressed={mode === 'danger'}
            onClick={() => setMode('danger')}
            className={`cursor-pointer rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${
              mode === 'danger' ? 'bg-heat-hot font-semibold text-white' : 'bg-heat-dark text-slate-300 hover:bg-slate-700'
            }`}
          >
            Danger days (45y)
          </button>
        </div>
        {/* Only shown when signed in: a filter that can only ever be empty is a dead control. */}
        {canSave && (
          <button
            type="button"
            aria-pressed={savedOnly}
            onClick={() => setSavedOnly((v) => !v)}
            className={`ml-auto cursor-pointer rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${
              savedOnly ? 'bg-heat-hot font-semibold text-white' : 'bg-heat-dark text-slate-300 hover:bg-slate-700'
            }`}
          >
            {savedOnly ? '★' : '☆'} Saved only ({savedKeys.size})
          </button>
        )}
      </div>

      {saveError && (
        <div role="alert" className="mt-3 rounded border border-heat-hot bg-heat-dark px-3 py-2 text-sm">
          {saveError}
        </div>
      )}

      {/* Public view: renders logged out, so a judge can see it without signing in.
          Collapsed by default — native <details>, no state to manage. */}
      <details className="mt-3 rounded border border-slate-700 bg-heat-dark/50 px-3 py-2 text-sm">
        <summary className="cursor-pointer select-none font-medium text-slate-200">Top 10 explorers</summary>
        {boardError ? (
          <p role="alert" className="mt-2 text-slate-300">
            Could not load the leaderboard — {boardError}
          </p>
        ) : board === null ? (
          <p aria-busy="true" className="mt-2 text-slate-400">
            Loading…
          </p>
        ) : board.length === 0 ? (
          <p className="mt-2 text-slate-400">No explorers yet — save a municipality to appear here.</p>
        ) : (
          <table className="mt-2 w-full border-collapse text-sm tabular-nums">
            <thead>
              <tr className="border-b border-slate-700 text-left text-xs uppercase tracking-wide text-slate-400">
                <th scope="col" className="px-2 py-1.5">#</th>
                <th scope="col" className="px-2 py-1.5">Explorer</th>
                <th scope="col" className="px-2 py-1.5">Saved</th>
                {showScore && <th scope="col" className="px-2 py-1.5">Score</th>}
              </tr>
            </thead>
            <tbody>
              {board.map((r, i) => (
                <tr key={r?.handle ?? i} className="border-b border-slate-800">
                  <td className="px-2 py-1.5 font-semibold text-slate-300">{i + 1}</td>
                  <td className="px-2 py-1.5 text-slate-100">{r?.handle}</td>
                  <td className="px-2 py-1.5 text-slate-100">{r?.saved_count ?? 0}</td>
                  {showScore && <td className="px-2 py-1.5 text-slate-100">{r?.score ?? 0}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </details>

      {status === 'loading' && (
        <div aria-busy="true" className="mt-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-heat-dark/70" />
          ))}
        </div>
      )}
      {status === 'error' && (
        <div role="alert" className="mt-4 rounded border border-heat-hot bg-heat-dark px-3 py-2 text-sm">
          <div className="font-semibold">Could not load trend data</div>
          <div className="mb-2 text-slate-400">{error}</div>
          <button
            type="button"
            onClick={() => reload?.()}
            className="cursor-pointer rounded bg-heat-hot px-2 py-1 text-xs font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            Try again
          </button>
        </div>
      )}
      {status === 'ready' && ranked.length === 0 && (
        <div className="mt-4 rounded border border-slate-700 bg-heat-dark px-3 py-2 text-sm text-slate-300">
          No trend data yet — check back soon.
        </div>
      )}
      {status === 'ready' && ranked.length > 0 && shown.length === 0 && (
        <div className="mt-4 rounded border border-slate-700 bg-heat-dark px-3 py-2 text-sm text-slate-300">
          No saved places yet — turn off “Saved only” and tap ☆ next to a municipality.
        </div>
      )}
      {status === 'ready' && shown.length > 0 && (
        <div className="mt-4">
          <RankingTable
            rows={shown}
            mode={mode}
            savedKeys={savedKeys}
            onToggleSave={toggleSaved}
            canSave={canSave}
          />
          {narratives?.meta?.disclaimer && (
            <p className="mt-3 text-[11px] leading-4 text-slate-500">{narratives.meta.disclaimer}</p>
          )}
        </div>
      )}
    </div>
  )
}
