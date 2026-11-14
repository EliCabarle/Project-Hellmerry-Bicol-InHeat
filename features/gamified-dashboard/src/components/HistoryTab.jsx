import { QUESTS, HISTORY_DAYS, manilaClock, recentDays } from '../progressStore.js'

function questLabel(e) {
  // Events snapshot their title at award time, so a past quest still has a name
  // after the daily catalog changes. Old entries fall back to the static list.
  return e.label ?? QUESTS.find((q) => q.id === e.questId)?.label ?? 'Quest'
}

function eventLabel(e) {
  if (e.kind === 'login') return 'Daily login'
  return questLabel(e)
}

function signedHp(e) {
  const sign = e.hp > 0 ? '+' : ''
  return `${sign}${e.hp} HP${e.hp < 0 ? ' (undo)' : ''}`
}

// Summary + 30-day bars + day-grouped log, all derived from the event log.
// Zero-HP days are shown as zero; the sr-only table mirrors the chart.
export default function HistoryTab({ derived, events, today }) {
  const empty = events.length === 0
  const days = recentDays(today, HISTORY_DAYS)
  const maxHp = Math.max(1, ...days.map((d) => Math.max(0, derived.dayTotals[d] ?? 0)))

  const byDay = new Map()
  for (const e of events) {
    if (!byDay.has(e.date)) byDay.set(e.date, [])
    byDay.get(e.date).push(e)
  }
  const loggedDays = [...byDay.keys()].sort().reverse()
  const yesterday = recentDays(today, 2)[0]
  const dayTitle = (date) => (date === today ? 'Today' : date === yesterday ? 'Yesterday' : date)

  const stats = Object.entries(derived.questStats)

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-5 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-heat-amber">Heat Points</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">History</h1>
      <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">
        A game score kept on this device. Self-reported, honor system.
      </p>

      {/* Summary */}
      <dl className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-heat-surface/70 px-3 py-2.5 shadow-hud">
          <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total HP</dt>
          <dd className="mt-0.5 font-mono text-lg font-semibold text-slate-100">{derived.totalHP}</dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-heat-surface/70 px-3 py-2.5 shadow-hud">
          <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Level</dt>
          <dd className="mt-0.5 font-mono text-lg font-semibold text-slate-100">
            {derived.level} · <span className="text-sm text-heat-amber">{derived.title}</span>
          </dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-heat-surface/70 px-3 py-2.5 shadow-hud">
          <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Streak (current / best)</dt>
          <dd className="mt-0.5 font-mono text-lg font-semibold text-slate-100">
            {derived.currentStreak} / {derived.bestStreak}
          </dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-heat-surface/70 px-3 py-2.5 shadow-hud">
          <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active days</dt>
          <dd className="mt-0.5 font-mono text-lg font-semibold text-slate-100">{derived.activeDays}</dd>
        </div>
      </dl>

      {stats.length > 0 && (
        <div className="mt-2 rounded-xl border border-white/10 bg-heat-surface/70 px-3 py-2.5 shadow-hud">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Net quests logged per type
          </div>
          <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
            {stats.map(([questId, s]) => (
              <li key={questId}>
                {questLabel(questId)}: <span className="font-mono text-slate-100">{s.net > 0 ? `+${s.net}` : s.net}</span>
                <span className="text-slate-500"> ({s.awarded} logged{s.undone ? `, ${s.undone} undone` : ''})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {empty ? (
        <div className="mt-4 rounded-xl border border-dashed border-white/15 bg-heat-surface/50 px-3 py-6 text-center">
          <p className="text-sm font-semibold text-slate-200">Nothing logged yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Check in on the Quests tab and your Heat Points will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* 30-day chart: every Manila day included, zero days shown as zero */}
          <section className="mt-4 rounded-xl border border-white/10 bg-heat-surface/70 px-3 py-3 shadow-hud">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              HP per day · last {HISTORY_DAYS} days
            </h2>
            <div aria-hidden="true" className="mt-2 flex h-28 items-end gap-[2px]">
              {days.map((d) => {
                const hp = Math.max(0, derived.dayTotals[d] ?? 0)
                const zero = hp === 0
                return (
                  <div key={d} className="relative h-full flex-1" title={`${d}: ${hp} HP`}>
                    <div
                      className={`absolute bottom-0 w-full ${zero ? 'bg-white/15' : 'bg-heat-amber/80'}`}
                      style={{ height: zero ? '2px' : `${Math.max(4, (hp / maxHp) * 100)}%` }}
                    />
                  </div>
                )
              })}
            </div>
            <div aria-hidden="true" className="mt-1 flex justify-between font-mono text-xs text-slate-500">
              <span>{days[0]}</span>
              <span>{days[days.length - 1]}</span>
            </div>
            <table className="sr-only">
              <caption>Heat Points per day, last {HISTORY_DAYS} days</caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">HP</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d}>
                    <th scope="row">{d}</th>
                    <td>{derived.dayTotals[d] ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Log, newest first */}
          <section className="mt-4">
            <h2 className="text-sm font-semibold text-white">Log</h2>
            <div className="mt-2 space-y-3">
              {loggedDays.map((date) => (
                <section key={date}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {dayTitle(date)} · {date}
                  </h3>
                  <ul className="mt-1 divide-y divide-white/5 rounded-xl border border-white/10 bg-heat-surface/70 shadow-hud">
                    {[...byDay.get(date)]
                      .sort((a, b) => b.at - a.at)
                      .map((e) => (
                        <li key={e.id} className="flex items-center gap-3 px-3 py-2 text-xs">
                          <span className="w-10 shrink-0 font-mono text-slate-500">{manilaClock(e.at)}</span>
                          <span className="min-w-0 flex-1 text-slate-200">{eventLabel(e)}</span>
                          <span className={`shrink-0 font-mono font-semibold ${e.hp < 0 ? 'text-rose-300' : 'text-heat-amber'}`}>
                            {signedHp(e)}
                          </span>
                        </li>
                      ))}
                  </ul>
                </section>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
