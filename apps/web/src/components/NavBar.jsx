// Floating translucent navigation bar, present on every screen: logo + HP text,
// wide level progress bar (level shown under it), menu button on the right.
// Replaces the old in-flow TopBar (map) / MainHeader (other screens).
// Map overlays clear this bar via safe-area-aware top offsets.
import { HP_PER_LEVEL } from '@features/gamified-dashboard'
import { IconMenu } from './Icons.jsx'

export default function NavBar({
  level,
  title,
  inLevel,
  totalHP,
  onOpenMenu,
  menuButtonRef,
  menuOpen = false,
}) {
  const pct = Math.round((inLevel / HP_PER_LEVEL) * 100)
  return (
    <header className="fixed inset-x-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-[800] rounded-2xl border border-white/10 bg-heat-surface/80 p-2 shadow-hud backdrop-blur-md sm:inset-x-auto sm:right-auto sm:left-1/2 sm:w-[min(50vw,45rem)] sm:-translate-x-1/2">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-amber-300 via-orange-500 to-red-700 text-[10px] font-black tracking-tighter text-slate-950 shadow-lg shadow-orange-950/40"
        >
          BIH
        </span>
        <div className="shrink-0 leading-tight">
          <p className="font-mono text-[11px] font-semibold text-slate-200">
            {inLevel} / {HP_PER_LEVEL} <span className="text-slate-400">HP</span>
          </p>
          <p className="text-[11px] text-slate-400">{totalHP} total</p>
        </div>
        {/* Wide level bar: stretches between the HP text and the menu button. */}
        <div className="min-w-0 flex-1">
          <div
            role="progressbar"
            aria-label={`Level ${level} progress`}
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${inLevel} of ${HP_PER_LEVEL} heat points`}
            className="h-3 overflow-hidden rounded-full bg-black/50 ring-1 ring-white/10"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-heat-orange to-heat-amber transition-[width] duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 truncate text-[11px] font-semibold tracking-tight text-slate-300">
            Level {level} · <span className="text-slate-400">{title}</span>
          </p>
        </div>
        <button
          ref={menuButtonRef}
          type="button"
          onClick={onOpenMenu}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Main menu"
          className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-slate-200 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
        >
          <IconMenu className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
