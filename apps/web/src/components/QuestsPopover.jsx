// Map-screen quests: a compact snapshot of the SAME quest model the dashboard
// uses — one store per account (guest key when signed out), the day's 5 quests
// drawn from eco_quests_tasks.csv, pending checks and an explicit Submit before
// anything is recorded. Toggling bumps the navbar HP live via onChanged.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  HP_PER_LEVEL,
  createProgress,
  parseQuestCsv,
} from '@features/gamified-dashboard'
import { IconCheck } from './Icons.jsx'

const ROW =
  'flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber'
const SUBMIT_BTN =
  'bih-btn shrink-0 cursor-pointer rounded-md bg-heat-amber px-2.5 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-amber-300'
const RECORDED =
  'shrink-0 rounded border border-heat-cool/40 bg-heat-cool/10 px-1.5 py-0.5 text-[11px] font-semibold text-heat-cool'

// Module-level cache: the dashboard and this popover both need the CSV, so
// fetch it once per session and share the parsed catalog.
let catalogPromise = null
function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = fetch('/data/eco_quests_tasks.csv')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.text()
      })
      .then((text) => parseQuestCsv(text))
      .catch(() => [])
  }
  return catalogPromise
}

export default function QuestsPopover({ userId = null, onChanged = null }) {
  const [open, setOpen] = useState(false)
  const [catalog, setCatalog] = useState([])
  // Re-read on every change: the store reads localStorage, so a tick is all
  // the reactivity this needs (same storage key the navbar derives from).
  const [, setTick] = useState(0)
  const buttonRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    loadCatalog().then((tasks) => {
      if (!cancelled) setCatalog(tasks)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Same construction as the dashboard's store: keyed by account, fed by the
  // same CSV — both share the storage key and the day's drawn quest blob, so
  // the popover always shows the dashboard's exact checklist.
  const store = useMemo(
    () => createProgress({ userId, catalog }),
    [userId, catalog],
  )

  const derived = store.derive()
  const pending = store.getPending()
  // Only drawn CSV quests are tickable (the dashboard's rule): while the CSV
  // loads, render nothing rather than the static fallback, so a pending check
  // can never reference a quest the dashboard does not know about.
  const quests = catalog.length > 0 ? store.getDailyQuests() : []

  const bump = () => {
    setTick((t) => t + 1)
    onChanged?.()
  }
  const togglePending = (id) => {
    const r = store.togglePending(id)
    if (r.ok) bump()
  }
  const submitQuest = (id) => {
    const r = store.submitQuest(id)
    if (r.ok) bump()
  }

  useEffect(() => {
    if (!open) return
    panelRef.current?.querySelector('button:not([disabled])')?.focus()
    const onKeydown = (event) => {
      if (event.key === 'Escape') {
        // stopPropagation: the map's window Escape handler must not also fire.
        event.stopPropagation()
        setOpen(false)
      }
    }
    const onPointerDown = (event) => {
      const panel = panelRef.current
      if (
        panel &&
        !panel.contains(event.target) &&
        !buttonRef.current?.contains(event.target)
      )
        setOpen(false)
    }
    document.addEventListener('keydown', onKeydown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeydown)
      document.removeEventListener('pointerdown', onPointerDown)
      buttonRef.current?.focus()
    }
  }, [open])

  const doneCount = quests.filter(
    (q) => (derived.todayCounts[q.id] ?? 0) > 0,
  ).length

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="pointer-events-auto absolute left-3 top-[calc(8.5rem+env(safe-area-inset-top))] lg:top-[calc(4.5rem+env(safe-area-inset-top))] z-[590] inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-heat-surface/90 px-3 py-1.5 text-[11px] font-semibold text-slate-200 shadow-hud backdrop-blur-md transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
      >
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-heat-amber/20 text-heat-amber">
          <IconCheck className="h-3 w-3" />
        </span>
        Quests
        <span className="font-mono text-[11px] text-slate-400">
          {doneCount}/{quests.length}
        </span>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Today's quests"
          className="absolute left-3 top-[calc(11.5rem+env(safe-area-inset-top))] lg:top-[calc(7.5rem+env(safe-area-inset-top))] z-[590] w-[15rem] max-w-[calc(100vw-1.5rem)] rounded-xl border border-white/10 bg-heat-surface/95 p-2.5 text-slate-100 shadow-hud backdrop-blur-md"
        >
          <div className="flex items-baseline justify-between gap-2 px-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Today&apos;s quests
            </p>
            <p className="font-mono text-[11px] text-slate-400">
              {derived.todayTotal} HP today
            </p>
          </div>

          <div className="mt-1.5 space-y-0.5">
            {quests.length === 0 ? (
              <p className="px-2 py-1.5 text-[11px] text-slate-400">
                Quests are loading — check back in a moment.
              </p>
            ) : (
              quests.map((quest) => {
                const recorded = (derived.todayCounts[quest.id] ?? 0) > 0
                const isPending = pending.includes(quest.id)
                return (
                  <div
                    key={quest.id}
                    className="flex min-h-11 items-center gap-2 rounded-lg px-2 py-1.5"
                  >
                    <button
                      type="button"
                      onClick={() => togglePending(quest.id)}
                      disabled={recorded}
                      aria-pressed={recorded || isPending}
                      aria-label={
                        recorded
                          ? `${quest.title} — recorded today`
                          : `Mark "${quest.title}" as done`
                      }
                      className={`grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber ${
                        recorded
                          ? 'border-heat-cool bg-heat-cool/20 text-heat-cool'
                          : isPending
                            ? 'border-heat-amber bg-heat-amber/20 text-heat-amber'
                            : 'border-white/20 text-transparent hover:border-white/40'
                      } ${recorded ? 'cursor-default' : ''}`}
                    >
                      <IconCheck className="h-3 w-3" />
                    </button>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs text-slate-200">
                        {quest.title}
                      </span>
                      <span className="block text-[11px] text-slate-400">
                        {quest.hp} HP
                      </span>
                    </span>
                    {recorded ? (
                      <span className={RECORDED}>✓ Done</span>
                    ) : isPending ? (
                      <button
                        type="button"
                        onClick={() => submitQuest(quest.id)}
                        className={SUBMIT_BTN}
                      >
                        Submit
                      </button>
                    ) : null}
                  </div>
                )
              })
            )}
          </div>

          <p className="mt-1.5 border-t border-white/10 px-1 pt-1.5 text-[11px] text-slate-400">
            Level {derived.level} · {derived.inLevel}/{HP_PER_LEVEL} HP ·{' '}
            {derived.totalHP} total
          </p>
        </div>
      )}
    </>
  )
}
