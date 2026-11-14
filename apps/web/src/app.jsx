import { useCallback, useMemo, useRef, useState } from 'react'
import BicolMap from '@features/map-controls'
import DashboardScreen from '@features/gamified-dashboard'
import { createProgress, derive, manilaDate } from '@features/gamified-dashboard'
import ChatbotModal from '@features/chatbot-llm'
import NavBar from './components/NavBar.jsx'
import AppMenu from './components/AppMenu.jsx'
import QuestsPopover from './components/QuestsPopover.jsx'
import AccountScreen from './screens/AccountScreen.jsx'
import SettingsScreen from './screens/SettingsScreen.jsx'
import useBicolData from './useBicolData'
import useSession from './useSession'

const SCREENS = [
  { id: 'map', label: 'Map' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'account', label: 'Manage Account' },
  { id: 'settings', label: 'Settings' },
]

// Deep link: #muni=<encoded joinKey> opens the map with that municipality
// selected. The skip link targets #main, so only the #muni= prefix counts as a
// deep link; anything else leaves the hash untracked.
function parseMuniHash() {
  const raw = typeof window === 'undefined' ? '' : window.location.hash
  if (!raw.startsWith('#muni=')) return null
  try {
    return decodeURIComponent(raw.slice('#muni='.length)) || null
  } catch {
    return null
  }
}

export default function App() {
  const [screen, setScreen] = useState('map')
  // Focus = an LGU the dashboard (or a shared URL) wants the map to select.
  // Token rises on every request so re-clicking the same LGU still refires
  // after the user cleared the selection on the map.
  const [focus, setFocus] = useState(() => {
    const key = parseMuniHash()
    return key ? { key, token: 1 } : null
  })
  // External tab control for the Dashboard screen: { id, token }. The menu and
  // the quests/chatbot/LGU FABs drive the Dashboard through this contract.
  const [focusTab, setFocusTab] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const menuButtonRef = useRef(null)
  const navTokenRef = useRef(0)
  const data = useBicolData()
  // Auth lives here so screens can scope their own rows (saved places,
  // leaderboard) to the signed-in user.
  const { user, supabase, configured } = useSession()

  // Guest progress powers the navbar on every screen; the quests popover bumps
  // this tick so the bar updates live after toggling a quest.
  const progressStoreRef = useRef(null)
  if (!progressStoreRef.current)
    progressStoreRef.current = createProgress({ userId: null })
  const [progressTick, setProgressTick] = useState(0)
  const progress = useMemo(
    () => derive(progressStoreRef.current.read(), manilaDate(new Date())),
    [progressTick],
  )

  // Dashboard "Show on map" / shared deep link → select on the map and switch.
  const showOnMap = useCallback((key) => {
    if (!key) return
    setFocus((prev) => ({ key, token: (prev?.token ?? 0) + 1 }))
    setScreen('map')
    try {
      // replaceState (not a hash assignment): the link stays shareable and
      // bookmarkable without spamming history entries.
      window.history.replaceState(null, '', `#muni=${encodeURIComponent(key)}`)
    } catch {
      // Old browsers: the in-app selection still works, the URL just stays stale.
    }
  }, [])

  // Central navigation used by the menu, the quests/LGU/chatbot FABs and the
  // Dashboard's own tabs. Rising token lets re-clicking the same target refire.
  const navigate = useCallback((target) => {
    const token = ++navTokenRef.current
    if (target === 'map') {
      setScreen('map')
      setFocusTab(null)
      return
    }
    if (target === 'dashboard') {
      setScreen('dashboard')
      setFocusTab({ id: 'dashboard', token })
      return
    }
    if (target === 'quests') {
      setScreen('dashboard')
      setFocusTab({ id: 'quests', token })
      return
    }
    if (target === 'leaderboard') {
      setScreen('dashboard')
      setFocusTab({ id: 'leaderboard', token })
      return
    }
    if (target === 'account') {
      setScreen('account')
      setFocusTab(null)
      return
    }
    if (target === 'settings') {
      setScreen('settings')
      setFocusTab(null)
      return
    }
  }, [])

  const handleSignIn = useCallback(() => {
    if (!supabase || !configured) return
    supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
  }, [supabase, configured])

  const handleSignOut = useCallback(() => {
    if (!supabase) return
    supabase.auth.signOut()
  }, [supabase])

  // Height chain: html/body/#root = 100% (index.css) -> this h-full column ->
  // main.min-h-0.flex-1 -> MapContainer.h-full. Never insert a height:auto
  // wrapper between #root and the leaflet container (collapses the map to 0px).
  return (
    <div className="flex h-full flex-col bg-heat-bg text-heat-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[900] focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950"
      >
        Skip to content
      </a>

      {/* Floating translucent navbar on every screen; overlays clear it via
          safe-area-aware top offsets. */}
      <NavBar
        level={progress.level}
        title={progress.title}
        inLevel={progress.inLevel}
        totalHP={progress.totalHP}
        onOpenMenu={setMenuOpen}
        menuButtonRef={menuButtonRef}
        menuOpen={menuOpen}
      />

      {menuOpen && (
        <AppMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          user={user}
          supabase={supabase}
          configured={configured}
          navigate={navigate}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          returnFocusTo={menuButtonRef}
          buttonRef={menuButtonRef}
        />
      )}

      {screen === 'map' ? (
        <div id="main" className="relative min-h-0 flex-1">
          <BicolMap
            {...data}
            initialSelectedKey={focus?.key ?? null}
            focusToken={focus?.token ?? 0}
            onOpenChatbot={() => setChatOpen(true)}
          />
          <QuestsPopover onChanged={() => setProgressTick((t) => t + 1)} />
        </div>
      ) : (
        <>
          {/* Spacer clearing the fixed navbar; content scrolls under it. */}
          <div
            aria-hidden="true"
            className="h-[calc(4rem+env(safe-area-inset-top))] shrink-0"
          />
          {screen === 'dashboard' && (
            <DashboardScreen
              {...data}
              supabase={supabase}
              user={user}
              onShowOnMap={showOnMap}
              focusTab={focusTab}
            />
          )}
          {screen === 'account' && (
            <AccountScreen
              user={user}
              supabase={supabase}
              configured={configured}
              navigate={navigate}
            />
          )}
          {screen === 'settings' && <SettingsScreen navigate={navigate} />}
        </>
      )}

      {chatOpen && (
        <ChatbotModal open={chatOpen} onClose={() => setChatOpen(false)} />
      )}
    </div>
  )
}
