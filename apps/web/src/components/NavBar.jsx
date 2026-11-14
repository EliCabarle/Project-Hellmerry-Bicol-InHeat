// Floating translucent navigation bar, present on every screen: logo + HP text,
// wide level progress bar (level shown under it), menu button on the right.
// Replaces the old in-flow TopBar (map) / MainHeader (other screens).
// Publishes its measured bottom edge to :root as --bih-nav-clear so overlays
// and screen spacers clear the real bar instead of a hard-coded guess.
import { useEffect, useRef } from 'react'
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
  const barRef = useRef(null)
  const pct = Math.round((inLevel / HP_PER_LEVEL) * 100)

  // One clearance var for every consumer (screen spacers, map overlays). The
  // gap matches the CSS fallback in index.css (--bih-nav-clear): bottom + 12px.
  useEffect(() => {
    const el = barRef.current
    if (!el || typeof document === 'undefined') return undefined
    const publish = () => {
      document.documentElement.style.setProperty(
        '--bih-nav-clear',
        `${el.getBoundingClientRect().bottom + 12}px`,
      )
    }
    publish()
    let ro
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(publish)
      ro.observe(el)
    }
    window.addEventListener('resize', publish)
    return () => {
      if (ro) ro.disconnect()
      window.removeEventListener('resize', publish)
    }
  }, [])

  return (
    <header
      ref={barRef}
      className="fixed inset-x-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-[800] rounded-2xl border border-white/10 bg-[rgba(13,20,30,var(--alpha-header))] p-2 shadow-hud backdrop-blur-md sm:inset-x-auto sm:right-auto sm:left-1/2 sm:w-[min(50vw,45rem)] sm:-translate-x-1/2"
    >
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
          className="bih-btn inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/10"
        >
          <IconMenu className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
