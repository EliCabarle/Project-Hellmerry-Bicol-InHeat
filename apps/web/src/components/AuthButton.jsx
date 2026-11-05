import { useEffect, useState } from 'react'
import { loadMyProfile, saveHandle, validateHandle } from '../lib/profile.js'

// In-flow header pill. position: fixed would float over the map overlay's
// zoom/layer panels (z-[700]) and the tab nav; normal flow needs no z-index.
const pill =
  'flex items-center gap-2 rounded-full border border-slate-700 bg-heat-bg/70 px-3 py-1.5 text-sm text-slate-200'

// Session state is owned by useSession() in app.jsx and passed down, so screens
// and the header agree on who is signed in.
export default function AuthButton({ user = null, supabase = null, configured = false }) {
  const [error, setError] = useState(null) // message string
  const [errorDetail, setErrorDetail] = useState(null) // raw error, shown in the tooltip
  // null + loadingProfile = "still asking", null + !loading = "no handle yet".
  const [profile, setProfile] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  // Set when the profile read itself failed: we cannot tell onboarded from not,
  // so the picker must not be offered — it would just fail on submit too.
  const [profileLoadFailed, setProfileLoadFailed] = useState(false)
  const [handleInput, setHandleInput] = useState('')
  const [saving, setSaving] = useState(false)

  const setFailure = (message, detail = null) => {
    setError(message)
    setErrorDetail(detail)
  }
  const clearFailure = () => {
    setError(null)
    setErrorDetail(null)
  }

  // Load the chosen handle whenever the signed-in user changes. A missing row is
  // the onboarding gate, not an error (see the 0003 migration comments).
  useEffect(() => {
    if (!supabase || !user) {
      setProfile(null)
      setLoadingProfile(false)
      setProfileLoadFailed(false)
      return
    }
    let cancelled = false
    setLoadingProfile(true)
    loadMyProfile(supabase, user.id).then(({ data, error: err }) => {
      if (cancelled) return
      setLoadingProfile(false)
      if (err) {
        setProfileLoadFailed(true)
        setFailure('Could not load your profile', err.message)
        return
      }
      setProfile(data ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [supabase, user])

  if (!configured || !supabase) {
    return (
      <div className={pill} title="VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing">
        Sign-in unavailable
      </div>
    )
  }

  const handleSignIn = async () => {
    clearFailure()
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    // On success the browser redirects to Google, so only failures reach here.
    if (err) setFailure('Sign-in failed — try again', err.message)
  }

  const handleSignOut = async () => {
    clearFailure()
    setProfileLoadFailed(false)
    const { error: err } = await supabase.auth.signOut()
    if (err) setFailure('Sign-out failed — try again', err.message)
  }

  // Onboarding: the first insert into user_profiles. CONCEPT §9 — the chosen
  // handle is the only identity any screen may show, never the Google name/email.
  const handleSubmit = async (e) => {
    e.preventDefault()
    const invalid = validateHandle(handleInput)
    if (invalid) {
      setFailure(invalid)
      return
    }
    setSaving(true)
    clearFailure()
    const { data, error: err } = await saveHandle(supabase, user.id, handleInput)
    setSaving(false)
    if (err) {
      setFailure(err.message)
      return
    }
    setProfile(data)
    setHandleInput('')
  }

  const showPicker = user && !loadingProfile && !profile && !profileLoadFailed

  return (
    <div className={pill}>
      {!user && (
        <button onClick={handleSignIn} className="hover:text-white">
          Sign in with Google
        </button>
      )}

      {user && loadingProfile && <span className="text-slate-400">Loading…</span>}

      {showPicker && (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <label htmlFor="handle-input" className="text-slate-400">
            Handle
          </label>
          <input
            id="handle-input"
            value={handleInput}
            onChange={(e) => setHandleInput(e.target.value)}
            maxLength={20}
            autoComplete="off"
            placeholder="e.g. bicol_watcher"
            aria-describedby="handle-hint"
            className="w-36 rounded border border-slate-600 bg-heat-dark px-2 py-0.5 text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          />
          <button
            type="submit"
            disabled={saving}
            className="cursor-pointer rounded bg-heat-hot px-2 py-0.5 text-xs font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <span id="handle-hint" className="sr-only">
            3 to 20 letters, numbers or underscores. This is the only name shown on the leaderboard.
          </span>
        </form>
      )}

      {user && !loadingProfile && profile && (
        <>
          <span className="max-w-[10rem] truncate" title="Your chosen handle">
            {profile.handle}
          </span>
          <button
            onClick={handleSignOut}
            className="rounded bg-heat-hot px-2 py-0.5 text-xs text-white hover:opacity-90"
          >
            Sign out
          </button>
        </>
      )}

      {/* Escape hatch: a failed profile read must not trap the user signed in. */}
      {user && !loadingProfile && !profile && profileLoadFailed && (
        <button onClick={handleSignOut} className="text-xs text-slate-400 hover:text-white">
          Sign out
        </button>
      )}

      {error && (
        <span role="alert" className="text-xs text-heat-hotline" title={errorDetail ?? undefined}>
          {error}
        </span>
      )}
    </div>
  )
}
