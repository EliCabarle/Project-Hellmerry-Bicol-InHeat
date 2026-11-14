import { HP_PER_LEVEL } from '../progressStore.js'

// Persistent level-bar header. The bar settles to width; the global
// prefers-reduced-motion rule in apps/web/src/index.css collapses that
// transition, so reduced-motion users get an instant final state.
export default function HeatBar({ level, title, inLevel, totalHP, announcement = '', compact = false, className = '' }) {
  const pct = Math.round((inLevel / HP_PER_LEVEL) * 100)
  const progressBar = (
    <div
      role="progressbar"
      aria-label={`Level ${level} progress`}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${inLevel} of ${HP_PER_LEVEL} heat points`}
      className="overflow-hidden rounded-full bg-black/50 ring-1 ring-white/10"
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-heat-orange to-heat-amber transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
  if (compact) {
    return (
      <header className="border-b border-white/10 bg-heat-deep/90 px-3 py-2 sm:px-4">
        <div className={`mx-auto flex ${className} flex-col gap-1 sm:flex-row sm:items-center sm:justify-between`}>
          <div className="min-w-0">
            <p className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-heat-amber">Heat Points</p>
            <p className="mt-0.5 truncate text-sm font-semibold tracking-tight text-clay-text-heading sm:text-base">
              Level {level} · <span className="text-slate-300">{title}</span>
            </p>
          </div>
          <div className="flex items-baseline gap-1 font-mono text-[10px] text-slate-400 sm:text-sm">
            <span>{inLevel} / {HP_PER_LEVEL}</span>
            <span className="ml-1">{totalHP} total</span>
          </div>
          <div className="shrink-0 h-1.5 min-w-[5rem] w-[7rem] sm:w-[9rem]">
            {progressBar}
          </div>
        </div>
        {announcement ? <div aria-live="polite" className="sr-only">{announcement}</div> : null}
      </header>
    )
  }
  return (
    <header className="shrink-0 border-b border-white/10 bg-heat-deep/90 px-3 py-3 sm:px-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-heat-amber">Heat Points</p>
          <p className="mt-0.5 truncate text-lg font-semibold tracking-tight text-clay-text-heading sm:text-xl">
            Level {level} · <span className="text-slate-300">{title}</span>
          </p>
        </div>
        <div className="w-full sm:max-w-xs">
          <div className="flex items-baseline justify-between font-mono text-xs text-slate-400">
            <span>
              {inLevel} / {HP_PER_LEVEL} HP
            </span>
            <span>{totalHP} total</span>
          </div>
          <div
            role="progressbar"
            aria-label={`Level ${level} progress`}
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${inLevel} of ${HP_PER_LEVEL} heat points`}
            className="mt-1 h-2.5 overflow-hidden rounded-full bg-black/50 ring-1 ring-white/10"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-heat-orange to-heat-amber transition-[width] duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </header>
  )
}
