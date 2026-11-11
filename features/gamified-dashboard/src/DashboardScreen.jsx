import { useEffect, useMemo, useRef, useState } from 'react'
import { createProgress, derive, manilaDate, STORAGE_KEY } from './progressStore.js'
import HeatBar from './components/HeatBar.jsx'
import QuestsTab from './components/QuestsTab.jsx'
import HistoryTab from './components/HistoryTab.jsx'
import Leaderboard from './components/Leaderboard.jsx'
import RankingScreen from './RankingScreen.jsx'

const TABS = [
  { id: 'ranking', label: 'Ranking' },
  { id: 'quests', label: 'Quests' },
  { id: 'history', label: 'History' },
  { id: 'leaderboard', label: 'Leaderboard' },
]

// Default export of the slice: persistent HeatBar header + four ARIA tabs.
// One scroll container per panel; only the active panel is displayed, so the
// screen never shows nested scrollbars.
export default function DashboardScreen({
  status = 'idle',
  error = null,
  reload,
  narratives = null,
  coverage = { withData: 0, total: 0 },
  supabase = null,
  user = null,
}) {
  const [store] = useState(() => createProgress())
  const [events, setEvents] = useState(() => store.read())
  const [saveError, setSaveError] = useState(null)
  const [announcement, setAnnouncement] = useState('')
  const [active, setActive] = useState('ranking')
  const tabRefs = useRef({})
  const levelRef = useRef(null)

  const today = manilaDate(new Date())
  const derived = useMemo(() => derive(events, today), [events, today])

  // First open of a Manila calendar day awards the login streak entry.
  useEffect(() => {
    const r = store.checkIn()
    setEvents(r.events)
    setSaveError(r.ok ? null : r.error)
  }, [store])

  // Another tab wrote progress: re-read this slice's one key.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key != null && e.key !== STORAGE_KEY) return
      setEvents(store.read())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [store])

  // Announce level-ups politely; never announce the initial level.
  useEffect(() => {
    if (levelRef.current === null) {
      levelRef.current = derived.level
      return
    }
    if (derived.level > levelRef.current) {
      setAnnouncement(`Level up — level ${derived.level}, ${derived.title}`)
    }
    levelRef.current = derived.level
  }, [derived.level, derived.title])

  const act = (fn) => {
    const r = fn()
    setEvents(r.events)
    setSaveError(r.ok ? null : r.error)
    return r
  }

  const onTabKeyDown = (e) => {
    const i = TABS.findIndex((t) => t.id === active)
    let next = null
    if (e.key === 'ArrowRight') next = (i + 1) % TABS.length
    else if (e.key === 'ArrowLeft') next = (i - 1 + TABS.length) % TABS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = TABS.length - 1
    if (next === null) return
    e.preventDefault()
    const id = TABS[next].id
    setActive(id)
    tabRefs.current[id]?.focus()
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-heat-bg">
      <HeatBar
        level={derived.level}
        title={derived.title}
        inLevel={derived.inLevel}
        totalHP={derived.totalHP}
        announcement={announcement}
      />

      <div
        role="tablist"
        aria-label="Dashboard sections"
        onKeyDown={onTabKeyDown}
        className="shrink-0 border-b border-white/10 bg-heat-deep/60 px-3 sm:px-5"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap gap-1 py-1.5">
          {TABS.map((t) => {
            const selected = active === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={selected}
                aria-controls={`panel-${t.id}`}
                tabIndex={selected ? 0 : -1}
                ref={(el) => {
                  tabRefs.current[t.id] = el
                }}
                onClick={() => setActive(t.id)}
                className={`shrink-0 cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber focus-visible:ring-offset-2 focus-visible:ring-offset-heat-deep sm:text-sm ${
                  selected ? 'bg-heat-amber text-slate-950' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                }`}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id="panel-ranking"
        aria-labelledby="tab-ranking"
        hidden={active !== 'ranking'}
        className="min-h-0 flex-1"
      >
        <RankingScreen
          status={status}
          error={error}
          reload={reload}
          narratives={narratives}
          coverage={coverage}
          supabase={supabase}
          user={user}
        />
      </div>

      <div
        role="tabpanel"
        id="panel-quests"
        aria-labelledby="tab-quests"
        hidden={active !== 'quests'}
        className="bih-scroll min-h-0 flex-1 overflow-y-auto"
      >
        <QuestsTab
          derived={derived}
          saveError={saveError}
          onToggleDaily={(id) => act(() => store.toggleDaily(id))}
          onAdd={(id) => act(() => store.addQuest(id))}
          onUndo={(id) => act(() => store.undoQuest(id))}
        />
      </div>

      <div
        role="tabpanel"
        id="panel-history"
        aria-labelledby="tab-history"
        hidden={active !== 'history'}
        className="bih-scroll min-h-0 flex-1 overflow-y-auto"
      >
        <HistoryTab derived={derived} events={events} today={today} />
      </div>

      <div
        role="tabpanel"
        id="panel-leaderboard"
        aria-labelledby="tab-leaderboard"
        hidden={active !== 'leaderboard'}
        className="bih-scroll min-h-0 flex-1 overflow-y-auto"
      >
        <Leaderboard supabase={supabase} />
      </div>
    </div>
  )
}
