import { useEffect, useState } from 'react'
import { fetchWeekTotal } from '../weeklyStore.js'

// Soft weekly goal. Tunable; the bar fills to 100% at this community total.
export const WEEKLY_GOAL_HP = 5000

// Collective bar: every account's submitted quest HP for this ISO week, summed
// server-side. Public, so it renders for guests too. A new week has no rows yet,
// so it reads 0 without any reset job.
export default function WeeklyProgressBar({ supabase, week, reloadKey = 0 }) {
  const [state, setState] = useState({ total: 0, contributors: 0, error: null, loading: true })

  useEffect(() => {
    if (!supabase || !week) {
      setState({ total: 0, contributors: 0, error: null, loading: false })
      return
    }
    let cancelled = false
    setState((s) => ({ ...s, loading: true }))
    fetchWeekTotal(supabase, week).then(({ total, contributors, error }) => {
      if (cancelled) return
      setState({ total, contributors, error, loading: false })
    })
    return () => {
      cancelled = true
    }
  }, [supabase, week, reloadKey])

  const pct = Math.min(100, Math.round((state.total / WEEKLY_GOAL_HP) * 100))

  return (
    <section
      aria-label="Community weekly progress"
      className="rounded-xl border border-white/10 bg-heat-surface/70 px-3 py-3 shadow-hud"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-heat-amber">
          This week · Community
        </h2>
        <span className="font-mono text-xs text-slate-400">
          {state.loading || state.error
            ? '—'
            : `${state.total.toLocaleString()} / ${WEEKLY_GOAL_HP.toLocaleString()} HP`}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Community Heat Points this week"
        aria-valuenow={state.total}
        aria-valuemin={0}
        aria-valuemax={WEEKLY_GOAL_HP}
        aria-valuetext={`${state.total} of ${WEEKLY_GOAL_HP} community heat points this week`}
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-black/50 ring-1 ring-white/10"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-heat-orange to-heat-amber transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-2 font-mono text-xs text-slate-500">
        {state.error ? (
          <span className="text-rose-300">Community total unavailable — {state.error.message}</span>
        ) : state.loading ? (
          <span>Loading community total…</span>
        ) : state.total === 0 ? (
          <span>Goal: {WEEKLY_GOAL_HP.toLocaleString()} HP this week</span>
        ) : (
          <span>{state.total.toLocaleString()} HP earned this week</span>
        )}
        {!state.loading && !state.error && (
          <span>
            {state.contributors} {state.contributors === 1 ? 'contributor' : 'contributors'}
          </span>
        )}
      </div>
    </section>
  )
}