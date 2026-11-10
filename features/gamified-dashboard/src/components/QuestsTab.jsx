import { QUESTS, streakHp } from '../progressStore.js'

const LADDER = Array.from({ length: 7 }, (_, i) => streakHp(i + 1)) // 1,2,4,8,16,32,64

// Today's login card, streak ladder and the self-reported quest checklist.
// HP is a game score: nothing here is verified and nothing here is measured.
export default function QuestsTab({ derived, saveError, onToggleDaily, onAdd, onUndo }) {
  const login = derived.loginToday
  const cappedDay = login && login.day > 0 ? Math.min(login.day, 7) : 0

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-5 lg:px-8">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-heat-amber">Heat Points</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Quests</h1>
      <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">
        Quests earn Heat Points — a game score, not a measurement of anything.
      </p>

      {saveError && (
        <div role="alert" className="mt-3 rounded-lg border border-heat-hot/50 bg-heat-surface/80 px-3 py-2 text-xs text-rose-200">
          {saveError}
        </div>
      )}

      {/* Today's login */}
      <section className="mt-4 rounded-xl border border-white/10 bg-heat-surface/70 px-3 py-3 shadow-hud">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Daily login streak</h2>
          <span className="font-mono text-xs font-semibold text-heat-amber">{login?.hp ?? 0} HP earned today</span>
        </div>
        {login && login.day > 0 ? (
          <p className="mt-1 text-sm text-slate-200">
            Streak day <span className="font-mono font-semibold text-white">{login.day}</span> — checked in for today.
            {login.tomorrowHp != null && (
              <span className="text-slate-400"> Tomorrow: +{login.tomorrowHp} HP.</span>
            )}
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-400">
            Not checked in yet today — the last save did not go through. Try again next open.
          </p>
        )}

        <ol aria-label="Streak ladder" className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-7">
          {LADDER.map((hp, i) => {
            const day = i + 1
            const current = cappedDay === day
            return (
              <li
                key={day}
                aria-current={current ? 'step' : undefined}
                className={`rounded-md border px-1 py-1.5 text-center ${
                  current
                    ? 'border-heat-amber bg-heat-amber/15 text-heat-amber'
                    : 'border-white/10 bg-black/20 text-slate-400'
                }`}
              >
                <div className="text-[9px] uppercase tracking-wider">Day {day}</div>
                <div className="font-mono text-xs font-semibold">{hp} HP</div>
                {current && <div className="text-[9px] font-semibold">Today</div>}
              </li>
            )
          })}
        </ol>
      </section>

      {/* Checklist */}
      <section className="mt-4">
        <h2 className="text-sm font-semibold text-white">Today&apos;s quests</h2>
        <p className="mt-0.5 text-xs text-slate-500">Self-reported, honor system.</p>
        <ul className="mt-2 space-y-2">
          {QUESTS.map((q) => {
            const active = derived.todayCounts[q.id] ?? 0
            const daily = q.limit === 'daily'
            return (
              <li
                key={q.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-white/10 bg-heat-surface/70 px-3 py-2.5 shadow-hud"
              >
                {daily ? (
                  <>
                    <input
                      type="checkbox"
                      id={`quest-${q.id}`}
                      checked={active > 0}
                      onChange={() => onToggleDaily(q.id)}
                      className="h-4 w-4 shrink-0 cursor-pointer accent-heat-amber focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
                    />
                    <label htmlFor={`quest-${q.id}`} className="min-w-0 flex-1 cursor-pointer text-sm text-slate-200">
                      {q.label}
                    </label>
                    <span className="font-mono text-xs text-slate-400">+{q.hp} HP</span>
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Once a day</span>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 text-sm text-slate-200">{q.label}</span>
                    <span className="font-mono text-xs text-slate-400">
                      {active} × +{q.hp} HP
                    </span>
                    <button
                      type="button"
                      aria-label={`${q.label}: undo latest entry`}
                      disabled={active === 0}
                      onClick={() => onUndo(q.id)}
                      className="h-7 w-7 shrink-0 cursor-pointer rounded-md border border-white/10 bg-black/20 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      aria-label={`${q.label}: add one`}
                      onClick={() => onAdd(q.id)}
                      className="h-7 w-7 shrink-0 cursor-pointer rounded-md border border-heat-amber/50 bg-heat-amber/20 text-sm font-semibold text-heat-amber hover:bg-heat-amber/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
                    >
                      +
                    </button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <div className="mt-4 flex items-baseline justify-between rounded-xl border border-white/10 bg-heat-surface/70 px-3 py-2.5 shadow-hud">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Today&apos;s HP</span>
        <span className="font-mono text-lg font-semibold text-slate-100">{derived.todayTotal} HP</span>
      </div>
    </div>
  )
}
