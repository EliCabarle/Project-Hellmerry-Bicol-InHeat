// Floating translucent navigation bar, present on every screen: logo + HP text,
// wide level progress bar (level shown under it), menu button on the right.
// Replaces the old in-flow TopBar (map) / MainHeader (other screens).
// Publishes its measured bottom edge to :root as --bih-nav-clear so overlays
// and screen spacers clear the real bar instead of a hard-coded guess.
import { useEffect, useRef } from 'react'
import { HP_PER_LEVEL } from '@features/gamified-dashboard'
import { IconMenu } from './Icons.jsx'

// Clay shell bar: opaque white surface, clay contact shadow, Nunito type.

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
      className="fixed inset-x-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-[800] rounded-[24px] border border-white/20 bg-white shadow-card p-3 sm:inset-x-auto sm:right-auto sm:left-1/2 sm:w-[min(50vw,44rem)] sm:-translate-x-1/2"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-[16px] bg-gradient-to-br from-clay-blue via-clay-green to-clay-coral text-[11px] font-extrabold tracking-tighter text-white shadow-lg shadow-blue-shadow/40 font-clay"
        >
          <img
            src="/mascot_icon.png"
            alt=""
            aria-hidden="true"
            width="32"
            height="32"
            className="h-8 w-8 object-contain"
          />
        </span>
        <div className="shrink-0 leading-tight">
          <p className="font-mono text-[11px] font-semibold text-clay-text-heading">
            {inLevel} / {HP_PER_LEVEL} <span className="text-clay-text-muted">HP</span>
          </p>
          <p className="text-[11px] text-clay-text-muted">{totalHP} total</p>
        </div>
        <div className="min-w-0 flex-1">
          <div
            role="progressbar"
            aria-label={`Level ${level} progress`}
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${inLevel} of ${HP_PER_LEVEL} heat points`}
            className="h-3 overflow-hidden rounded-full bg-black/5 border border-white/30"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-clay-green to-clay-blue transition-[width] duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 truncate text-[11px] font-semibold tracking-tight text-clay-text-heading">
            Level {level} · <span className="text-clay-text-muted">{title}</span>
          </p>
        </div>
        <button
          ref={menuButtonRef}
          type="button"
          onClick={onOpenMenu}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Main menu"
          className="bih-btn inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[14px] border border-white/20 bg-white text-clay-text-heading font-clay font-bold hover:bg-clay-bg-blue-white hover:text-clay-text-heading"
        >
          <IconMenu className="h-5 w-5 text-clay-text-heading" />
        </button>
      </div>
    </header>
  )
}
