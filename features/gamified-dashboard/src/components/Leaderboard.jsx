import { useEffect, useState } from 'react'
import { fetchTop10 } from '../leaderboardStore.js'

// h30 fallback path: while false the tab makes no network call at all and
// renders only a coming-soon placeholder with an aria-hidden skeleton.
// Live since public.leaderboard returns rows to the anon key; flip back to false
// only if the view or its grant breaks.
export const LEADERBOARD_ENABLED = true

// Existing Top-10 UI, markup unchanged, now owned by this component.
function Top10({ supabase, reloadKey = null }) {
  const [board, setBoard] = useState(null) // null = still loading
  const [boardError, setBoardError] = useState(null)

  // The leaderboard view is public, so this loads without a session — a judge can
  // see it logged out. It does not depend on the trend data either.
  // `reloadKey` is the signed-in user's HP total: it changes the moment a score
  // is published, so the board shows that row instead of a stale fetch.
  useEffect(() => {
    if (!LEADERBOARD_ENABLED || !supabase) return
    let cancelled = false
    fetchTop10(supabase).then(({ data, error: err }) => {
      if (cancelled) return
      if (err) {
        setBoardError(err.message)
        return
      }
      // A successful retry clears an earlier failure instead of leaving the alert.
      setBoardError(null)
      setBoard(data ?? [])
    })
    return () => {
      cancelled = true
    }
  }, [supabase, reloadKey])

  // Until a task awards points every score is 0; a column of zeros reads as broken,
  // so it appears the first time any row has one. No code change needed later.
  const showScore = Boolean(board?.some((r) => (r?.score ?? 0) > 0))

  return (
    <section className="mt-4 rounded-xl border border-white/10 bg-heat-surface/60 px-3 py-3 text-sm">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Top 10 explorers
      </h2>
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
    </section>
  )
}

export default function Leaderboard({ supabase = null, reloadKey = null }) {
  if (!LEADERBOARD_ENABLED) {
    return (
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-5 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Leaderboard</h1>
        <p className="mt-2 text-sm text-slate-300">Leaderboard, coming soon</p>
        <div aria-hidden="true" className="mt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-heat-surface/60" />
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-5 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Leaderboard</h1>
      <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">
        Ranked by Heat Points, then saved places.
      </p>
      <Top10 supabase={supabase} reloadKey={reloadKey} />
      <p className="mt-3 text-[11px] text-slate-500">
        Public view · handles only, never names or emails.
      </p>
    </div>
  )
}
