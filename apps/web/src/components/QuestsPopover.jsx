// Map-screen quests: a separate button below the legend (the expanded legend
// panel covers it) plus a floating popover listing today's quests. Nothing
// navigates — this is a snapshot + quick toggle of the same progressStore the
// dashboard uses; the navbar progress updates live via onChanged.
import { useEffect, useRef, useState } from 'react'
import {
  HP_PER_LEVEL,
  QUESTS,
  createProgress,
  derive,
  manilaDate,
} from '@features/gamified-dashboard'
import { IconCheck, IconMinus, IconPlus } from './Icons.jsx'

const ROW =
  'flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber'
const SMALL =
  'inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-slate-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber'

export default function QuestsPopover({ onChanged = null }) {
  const [open, setOpen] = useState(false)
  // Re-read on every change: the store reads localStorage, so a tick is all
  // the reactivity this needs (same storage key the navbar derives from).
  const [, setTick] = useState(0)
  const storeRef = useRef(null)
  if (!storeRef.current) storeRef.current = createProgress({ userId: null })
  const store = storeRef.current
  const buttonRef = useRef(null)
  const panelRef = useRef(null)

  const today = manilaDate(new Date())
  const derived = derive(store.read(), today)
  const dailies = QUESTS.filter((q) => q.limit === 'daily')
  const doneDailies = dailies.filter(
    (q) => (derived.todayCounts[q.id] ?? 0) > 0,
  ).length

  const bump = () => {
    setTick((t) => t + 1)
    onChanged?.()
  }
  const toggleDaily = (id) => {
    const result = store.toggleDaily(id)
    if (result.ok) bump()
  }
  const addOne = (id) => {
    const result = store.addQuest(id)
    if (result.ok) bump()
  }
  const undoOne = (id) => {
    const result = store.undoQuest(id)
    if (result.ok) bump()
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

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="pointer-events-auto absolute left-3 top-[calc(8.5rem+env(safe-area-inset-top))] lg:top-[calc(4.5rem+env(safe-area-inset-top))] z-[590] inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-heat-surface/90 px-3 py-1.5 text-[11px] font-semibold text-slate-200 shadow-hud backdrop-blur-md transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
      >
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-heat-amber/20 text-heat-amber">
          <IconCheck className="h-3 w-3" />
        </span>
        Quests
        <span className="font-mono text-[10px] text-slate-400">
          {doneDailies}/{dailies.length}
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
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Today&apos;s quests
            </p>
            <p className="font-mono text-[10px] text-slate-500">{today}</p>
          </div>

          <div className="mt-1.5 space-y-0.5">
            {QUESTS.map((quest) => {
              const count = derived.todayCounts[quest.id] ?? 0
              if (quest.limit === 'daily') {
                const done = count > 0
                return (
                  <button
                    key={quest.id}
                    type="button"
                    onClick={() => toggleDaily(quest.id)}
                    aria-pressed={done}
                    className={ROW}
                  >
                    <span
                      aria-hidden="true"
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                        done
                          ? 'border-heat-eco bg-heat-eco text-slate-950'
                          : 'border-white/20 text-transparent'
                      }`}
                    >
                      <IconCheck className="h-3 w-3" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs text-slate-200">
                        {quest.label}
                      </span>
                      <span className="block text-[9px] text-slate-500">
                        {quest.hp} HP · once a day
                      </span>
                    </span>
                    <span
                      className={`shrink-0 font-mono text-[10px] ${
                        done ? 'text-heat-eco' : 'text-slate-500'
                      }`}
                    >
                      {done ? 'done' : 'todo'}
                    </span>
                  </button>
                )
              }
              return (
                <div
                  key={quest.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                >
                  <span
                    aria-hidden="true"
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/[0.06] font-mono text-[9px] text-slate-300"
                  >
                    {count}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs text-slate-200">
                      {quest.label}
                    </span>
                    <span className="block text-[9px] text-slate-500">
                      {quest.hp} HP · unlimited
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Undo one "${quest.label}" from today`}
                    disabled={count === 0}
                    onClick={() => undoOne(quest.id)}
                    className={SMALL}
                  >
                    <IconMinus className="h-3.5 w-3.5" />
                    <span className="sr-only">Undo</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Add one "${quest.label}" for today`}
                    onClick={() => addOne(quest.id)}
                    className={SMALL}
                  >
                    <IconPlus className="h-3.5 w-3.5" />
                    <span className="sr-only">Add</span>
                  </button>
                </div>
              )
            })}
          </div>

          <p className="mt-1.5 border-t border-white/10 px-1 pt-1.5 text-[10px] text-slate-500">
            Level {derived.level} · {derived.inLevel}/{HP_PER_LEVEL} HP ·{' '}
            {derived.totalHP} total
          </p>
        </div>
      )}
    </>
  )
}
