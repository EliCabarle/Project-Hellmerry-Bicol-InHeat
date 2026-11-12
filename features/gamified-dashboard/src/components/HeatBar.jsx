import { HP_PER_LEVEL } from '../progressStore.js'

// Persistent level-bar header. The bar settles to width; the global
// prefers-reduced-motion rule in apps/web/src/index.css collapses that
// transition, so reduced-motion users get an instant final state.
export default function HeatBar({ level, title, inLevel, totalHP, announcement = '' }) {
  const pct = Math.round((inLevel / HP_PER_LEVEL) * 100)
  return (
    <header className="shrink-0 border-b border-white/10 bg-heat-deep/90 px-3 py-3 sm:px-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-heat-amber">Heat Points</p>
          <p className="mt-0.5 truncate text-lg font-semibold tracking-tight text-white sm:text-xl">
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
