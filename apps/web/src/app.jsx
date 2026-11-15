import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BicolMap from '@features/map-controls'
import DashboardScreen from '@features/gamified-dashboard'
import { createProgress, derive, manilaDate } from '@features/gamified-dashboard'
import ChatbotModal from '@features/chatbot-llm'
import NavBar from './components/NavBar.jsx'
import AppMenu from './components/AppMenu.jsx'
import QuestsPopover from './components/QuestsPopover.jsx'
import PrivacyDialog from './components/PrivacyDialog.jsx'
import AccountScreen from './screens/AccountScreen.jsx'
import SettingsScreen from './screens/SettingsScreen.jsx'
import LandingScreen from './screens/LandingScreen.jsx'
import NarrationScreen from './screens/NarrationScreen.jsx'
import useBicolData from './useBicolData'
import silliSearchLogo from '../assets/Sillie Search.png'
import useSession from './useSession'
import { loadMyProfile } from './lib/profile.js'
import { hasConsent } from './lib/privacy.js'
import {
  clearPostAuthRedirect,
  consumePostAuthRedirect,
  markPostAuthRedirect,
  signInWithGoogle,
} from './lib/auth'
import { parseRoute, hashFor } from './lib/routes.js'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// UI theme lives on <html data-theme>, so every surface (shell, dashboard, map
// chrome) flips together. index.html sets it before first paint; this mirrors
// the same read so React and the pre-paint script never disagree.
const THEME_KEY = 'bih:theme'
function readTheme() {
  try {
    const v = localStorage.getItem(THEME_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    // private mode: fall through to the default
  }
  return 'dark'
}

export default function App() {
  // The URL hash is the source of truth for the screen a page load restores
  // (grammar: src/lib/routes.js). Supported tokens: #map, #dashboard, #quests,
  // #history, #leaderboard, #account, #settings, #narration, #landing, plus the legacy
  // #muni=<encoded joinKey> deep link (shared links resolve logged-out — h44).
  // An empty hash (first visit) and any unrecognized fragment (#main,
  // #access_token=..., arbitrary text) are not routes → Landing, for guests
  // and signed-in users alike (lead ruling 11-13-2026). Parsed once at load;
  // navigate() and showOnMap() write the token back, so the URL never
  // promises a screen a refresh would not restore.
  const route = parseRoute(typeof window === 'undefined' ? '' : window.location.hash)
  const [screen, setScreen] = useState(() => route?.screen ?? 'landing')
  // Focus = an LGU the dashboard (or a shared URL) wants the map to select.
  // Token rises on every request so re-clicking the same LGU still refires
  // after the user cleared the selection on the map.
  const [focus, setFocus] = useState(() =>
    route?.muniKey ? { key: route.muniKey, token: 1 } : null,
  )
  // External tab control for the Dashboard screen: { id, token }. The menu and
  // the quests/chatbot/LGU FABs drive the Dashboard through this contract. A
  // restored sub-tab arrives with token 1 — DashboardScreen's focusTab effect
  // consumes id+token on mount, so the token activates the restored tab.
  const [focusTab, setFocusTab] = useState(() =>
    route?.screen === 'dashboard' ? { id: route.tab, token: 1 } : null,
  )
  const [menuOpen, setMenuOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [theme, setTheme] = useState(readTheme)
  const menuButtonRef = useRef(null)
  const navTokenRef = useRef(0)
  const data = useBicolData()
  // Auth lives here so screens can scope their own rows (saved places,
  // leaderboard) to the signed-in user.
  const { user, supabase, configured } = useSession()

  // The handle row answers "has this account finished onboarding", and the app
  // owns that answer: the consent gate must open on whichever screen the OAuth
  // redirect lands on, not only on Manage Account.
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileLoadFailed, setProfileLoadFailed] = useState(false)
  // True once the profile read for this user settled (row or none). `user` arrives
  // a render before the read starts, so without this an unsettled read looks
  // exactly like "no handle" and opens the gate for users who already have one.
  const [profileChecked, setProfileChecked] = useState(false)
  // null | 'consent' | 'handle' | 'read'
  const [privacyMode, setPrivacyMode] = useState(null)

  useEffect(() => {
    if (!supabase || !user) {
      setProfile(null)
      setProfileLoading(false)
      setProfileLoadFailed(false)
      setProfileChecked(false)
      setPrivacyMode(null)
      return
    }
    let cancelled = false
    setProfileLoading(true)
    setProfileLoadFailed(false)
    setProfileChecked(false)
    loadMyProfile(supabase, user.id).then(({ data, error }) => {
      if (cancelled) return
      setProfileLoading(false)
      setProfileChecked(true)
      // A failed read leaves "onboarded?" unknown, so no gate is forced.
      if (error) {
        setProfileLoadFailed(true)
        return
      }
      setProfile(data ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [supabase, user])

  // First sign-in with no handle row opens the gate: the notice first, then the
  // handle. `current ?? step` keeps a dialog the user closed shut until something
  // changes, instead of springing back on the next render.
  const needsOnboarding = user && profileChecked && !profile && !profileLoadFailed
  useEffect(() => {
    if (!needsOnboarding) return
    const step = hasConsent(user.user_metadata) ? 'handle' : 'consent'
    setPrivacyMode((current) => current ?? step)
  }, [needsOnboarding, user])

  const openProfileDialog = useCallback(() => {
    setPrivacyMode(hasConsent(user?.user_metadata) ? 'handle' : 'consent')
  }, [user])
  const openPrivacyNotice = useCallback(() => setPrivacyMode('read'), [])

  // Progress powering the navbar on every screen. One store per account — the
  // key follows `user`, so it reads the SAME log the dashboard's HeatBar and
  // quests checklist write: the navbar and the dashboard can never disagree.
  // Guest progress is the same model under the guest key.
  const progressStore = useMemo(
    () => createProgress({ userId: user?.id ?? null }),
    [user?.id],
  )
  // Bumped by the quests popover's onChanged and by the dashboard's
  // 'bih-progress' broadcasts (streak check-in, quest submit, score reconcile):
  // every store write makes the navbar re-derive.
  const [progressTick, setProgressTick] = useState(0)
  const progress = useMemo(
    () => derive(progressStore.read(), manilaDate(new Date())),
    [progressStore, progressTick],
  )
  useEffect(() => {
    const bump = () => setProgressTick((t) => t + 1)
    window.addEventListener('bih-progress', bump)
    return () => window.removeEventListener('bih-progress', bump)
  }, [])

  // Apply + persist the theme. index.html already set data-theme pre-paint;
  // this keeps it correct after a toggle and syncs the mobile browser chrome.
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.style.colorScheme = theme
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b1220' : '#FDF3E7')
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // private mode: the choice just doesn't persist
    }
  }, [theme])

  const toggleTheme = useCallback(
    () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    [],
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
  // Landing ↔ app swaps move focus to #main (the NavBar unmounts or mounts, so
  // keyboard focus would otherwise fall to <body> mid-navigation — FLAG-3).
  const focusMain = useCallback(() => {
    requestAnimationFrame(() => document.getElementById('main')?.focus())
  }, [])
  const navigate = useCallback(
    (target) => {
      const token = ++navTokenRef.current
      if (target === 'landing') {
        try {
          clearPostAuthRedirect(window.sessionStorage)
        } catch (error) {
          console.error('Could not clear the pending sign-in redirect.', error)
        }
      }
      // Write side of D-01: publish the route token so a refresh or a Back
      // press agrees with the state set below. pushState rather than a hash
      // assignment because it is silent (no hashchange echo into the
      // traversal listener), it reuses the History API showOnMap already
      // uses, and it gives explicit push-versus-replace control — showOnMap
      // keeps replaceState for the selection (C-02). Computed before the
      // branches so a live selection renders as '#muni=<key>' — the URL then
      // equals what a refresh would restore. Written only when the token
      // differs from location.hash (a re-click must not stack duplicate
      // history entries while still bumping the in-memory token) and only
      // when the grammar accepts it (an unknown target falls through every
      // branch below and writes no hash). focus?.key rides the dependency
      // array so the map branch never sees a stale selection.
      const hash = target === 'map' ? hashFor('map', focus?.key) : hashFor(target)
      if (parseRoute(hash) && hash !== window.location.hash) {
        try {
          window.history.pushState(null, '', hash)
        } catch {
          // Old browsers: the in-app navigation still works, the URL just stays stale.
        }
      }
      if (target === 'landing') {
        setScreen('landing')
        setFocusTab(null)
        focusMain()
        return
      }
      if (target === 'map') {
        setScreen('map')
        setFocusTab(null)
        focusMain()
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
    if (target === 'history') {
      setScreen('dashboard')
      setFocusTab({ id: 'history', token })
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
    if (target === 'narration') {
      setScreen('narration')
      setFocusTab(null)
      return
    }
  }, [focusMain, focus?.key])

  // DashboardScreen owns its tab state and never receives navigate() (the
  // feature file is outside this plan's write boundary per C-01), so the
  // shell mirrors the feature's own output back into the route: watching
  // aria-selected on its tablist catches a click and an arrow-key move alike,
  // and every change runs through navigate(). All four dashboard tabs are
  // grammar tokens ('#dashboard'/'#quests'/'#history'/'#leaderboard'), so
  // each mirror pushes its token — a History-tab click or arrow move writes
  // '#history' exactly like the other tabs. pushState fires no events, so a
  // mirrored write cannot echo back into this effect.
  useEffect(() => {
    if (screen !== 'dashboard') return undefined
    const list = document.querySelector('[role="tablist"][aria-label="Dashboard sections"]')
    if (!list) return undefined
    const mirror = () => {
      if (!list.isConnected) return
      const id = list.querySelector('[role="tab"][aria-selected="true"]')?.id
      if (typeof id === 'string' && id.startsWith('tab-')) navigate(id.slice(4))
    }
    const observer = new MutationObserver(mirror)
    observer.observe(list, { subtree: true, attributes: true, attributeFilter: ['aria-selected'] })
    return () => observer.disconnect()
  }, [screen, navigate])

  // Traversal sync — the read half of D-01/D-03 (URL → state). Back/forward
  // and any native fragment navigation replay location.hash into app state
  // through the same grammar a page load uses. One handler on both events,
  // subscribed once: it reads the latest screen/focusTab/focus through a ref
  // instead of re-subscribing whenever state changes, and StrictMode's
  // double-invoked effect adds and removes the same reference symmetrically,
  // so no listener ever stacks. pushState from navigate() and replaceState
  // from showOnMap() fire no events, so this runs only on real traversal —
  // no echo loop back into the writes. Idempotence: one traversal fires
  // popstate and hashchange back to back, before React has re-rendered, so
  // after applying, the handler writes the applied state into the ref — the
  // paired event then matches and returns instead of bumping navTokenRef.
  const latestRef = useRef({ screen, focusTab, focus })
  latestRef.current = { screen, focusTab, focus }
  useEffect(() => {
    const applyTraversal = () => {
      const latest = latestRef.current
      const hash = window.location.hash
      // D-02: the empty entry is the true first visit. Back past the first
      // click restores Landing (screen + sub-tab + focus #main); focus is
      // never part of what an empty hash requests.
      if (hash === '') {
        if (latest.screen === 'landing' && latest.focusTab == null) return
        latestRef.current = { screen: 'landing', focusTab: null, focus: latest.focus }
        setScreen('landing')
        setFocusTab(null)
        focusMain()
        return
      }
      const route = parseRoute(hash)
      // Unrecognized fragment (#main, #access_token=..., crafted text): inert —
      // only the whitelist may write state (T-02-01), so a hostile history
      // entry cannot reach setScreen/setFocus.
      if (!route) return
      // Already there? The guard is what keeps the paired popstate+hashchange
      // fire from double-bumping navTokenRef (and from double-running focusMain).
      const sameTab =
        route.screen !== 'dashboard' || (latest.focusTab?.id ?? null) === route.tab
      const sameMuni =
        route.muniKey == null || (latest.focus?.key ?? null) === route.muniKey
      if (latest.screen === route.screen && sameTab && sameMuni) return
      // Apply exactly what navigate() would, with a fresh nav token so
      // DashboardScreen's focusTab effect refires (rising-token semantics,
      // C-05). A hash without a key never clears focus: BicolMap only ever
      // selects (features are out of write boundary per C-01), so clearing
      // would desync state from the visible map (C-02).
      const nextFocusTab =
        route.screen === 'dashboard' ? { id: route.tab, token: ++navTokenRef.current } : null
      const nextFocus =
        route.muniKey != null ? { key: route.muniKey, token: ++navTokenRef.current } : latest.focus
      latestRef.current = { screen: route.screen, focusTab: nextFocusTab, focus: nextFocus }
      setScreen(route.screen)
      setFocusTab(nextFocusTab)
      if (route.muniKey != null) setFocus(nextFocus)
      // Landing ↔ app swaps move focus to #main, mirroring navigate()'s
      // landing/map branches (FLAG-3, C-05).
      if (route.screen === 'landing' || route.screen === 'map') focusMain()
    }
    window.addEventListener('popstate', applyTraversal)
    window.addEventListener('hashchange', applyTraversal)
    return () => {
      window.removeEventListener('popstate', applyTraversal)
      window.removeEventListener('hashchange', applyTraversal)
    }
  }, [focusMain])

  // Shared OAuth helper (lib/auth.js) — awaited so the landing CTA can render
  // the failure (FLAG-1); the menu's onSignIn ignores the returned error by
  // design (AuthButton and the landing own the error UIs).
  const handleSignIn = useCallback(async () => {
    if (!supabase || !configured) return { error: null }
    try {
      markPostAuthRedirect(window.sessionStorage)
    } catch (error) {
      return { error }
    }

    try {
      const result = await signInWithGoogle(supabase)
      if (result.error) clearPostAuthRedirect(window.sessionStorage)
      return result
    } catch (error) {
      try {
        clearPostAuthRedirect(window.sessionStorage)
      } catch (clearError) {
        console.error('Could not clear the pending sign-in redirect.', clearError)
      }
      return { error }
    }
  }, [supabase, configured])

  // The intent survives Google's full-page OAuth redirect, then is consumed
  // once when the restored session confirms sign-in.
  useEffect(() => {
    if (!user) return
    try {
      if (consumePostAuthRedirect(window.sessionStorage)) navigate('map')
    } catch (error) {
      console.error('Could not read the pending sign-in redirect.', error)
    }
  }, [user, navigate])

  const handleSignOut = useCallback(() => {
    try {
      clearPostAuthRedirect(window.sessionStorage)
    } catch (error) {
      console.error('Could not clear the pending sign-in redirect.', error)
    }
    if (!supabase) return
    supabase.auth.signOut()
  }, [supabase])

  // Height chain: html/body/#root = 100% (index.css) -> this h-full column ->
  // main.min-h-0.flex-1 -> MapContainer.h-full. Never insert a height:auto
  // wrapper between #root and the leaflet container (collapses the map to 0px).
  return (
    <ErrorBoundary>
      <div className="flex h-full flex-col bg-heat-bg text-heat-ink">
      {/* This handler owns the hash: a native "#main" click would displace the
          route token, so a refresh after skipping would fall back to Landing.
          preventDefault() + focus() keeps the URL's token intact while moving
          focus to the same #main element focusMain() targets (FLAG-3 path
          itself is untouched); href="#main" stays for semantics. Dashboard,
          Account and Settings render #main as a plain element with no
          tabindex, where focus() would silently no-op — make the skip target
          programmatically focusable once, idempotently. */}
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault()
          const main = document.getElementById('main')
          if (main && !main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1')
          main?.focus()
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[900] focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950"
      >
        Skip to content
      </a>

      {/* Floating translucent navbar on every screen except landing — the dark
          HUD would clash with the cream clay surface and duplicate the hero
          brand row (UI-SPEC Entry #5). AppMenu is thus unreachable on landing
          (you are already Home). */}
      {screen !== 'landing' && (
        <NavBar
          level={progress.level}
          title={progress.title}
          inLevel={progress.inLevel}
          totalHP={progress.totalHP}
          onOpenMenu={setMenuOpen}
          menuButtonRef={menuButtonRef}
          menuOpen={menuOpen}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}

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
          onOpenPrivacy={openPrivacyNotice}
          returnFocusTo={menuButtonRef}
          buttonRef={menuButtonRef}
        />
      )}

      {screen === 'landing' ? (
        // Own scroll container: html/body are overflow:hidden, so the landing
        // root carries the page's single scrollbar. No NavBar spacer to clear.
        <LandingScreen
          user={user}
          supabase={supabase}
          configured={configured}
          navigate={navigate}
          onSignIn={handleSignIn}
          onOpenPrivacy={openPrivacyNotice}
        />
      ) : screen === 'map' ? (
        <div id="main" tabIndex={-1} className="relative min-h-0 flex-1">
          <BicolMap
            {...data}
            initialSelectedKey={focus?.key ?? null}
            focusToken={focus?.token ?? 0}
            onOpenChatbot={() => setChatOpen(true)}
            chatbotIcon={silliSearchLogo}
            chatOpen={chatOpen}
          />
          <QuestsPopover
            userId={user?.id ?? null}
            onChanged={() => setProgressTick((t) => t + 1)}
          />
        </div>
      ) : (
        <>
          {/* Spacer clearing the fixed navbar; content scrolls under it. The
              var is published by NavBar (bottom + 12px), fallback in index.css. */}
          <div
            aria-hidden="true"
            className="h-[var(--bih-nav-clear,calc(5.25rem+env(safe-area-inset-top)))] shrink-0"
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
              profile={profile}
              loadingProfile={profileLoading}
              profileLoadFailed={profileLoadFailed}
              supabase={supabase}
              configured={configured}
              navigate={navigate}
              onOpenPrivacy={openPrivacyNotice}
              onOpenProfile={openProfileDialog}
            />
          )}
          {screen === 'settings' && <SettingsScreen navigate={navigate} />}
          {screen === 'narration' && (
            <NarrationScreen
              {...data}
              initialKey={focus?.key ?? null}
              onBack={() => navigate('map')}
            />
          )}
        </>
      )}

      {chatOpen && (
        <ChatbotModal
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          chatbotIcon={silliSearchLogo}
        />
      )}

      {/* One dialog for the whole app: the first-sign-in gate and the permanent
          Privacy link both land here, so there is only ever one notice open. */}
      <PrivacyDialog
        open={privacyMode !== null}
        mode={privacyMode ?? 'read'}
        user={user}
        supabase={supabase}
        onConsent={() => setPrivacyMode('handle')}
        onHandleSaved={(saved) => {
          setProfile(saved)
          setPrivacyMode(null)
        }}
        onClose={() => setPrivacyMode(null)}
        onSignOut={handleSignOut}
      />
      </div>
    </ErrorBoundary>
  )
}
