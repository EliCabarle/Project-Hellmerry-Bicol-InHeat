import { useEffect, useState } from 'react'
import { loadMyProfile, saveHandle, validateHandle } from '../lib/profile.js'
import { signInWithGoogle } from '../lib/auth.js'

// In-flow header control. position: fixed would float over the map overlay's
// zoom/layer panels (z-[700]) and the tab nav; normal flow needs no z-index.
const pill =
  'flex min-w-0 items-center gap-1.5 rounded-lg border border-white/10 bg-[rgba(13,20,30,var(--alpha-card))] px-2 py-1.5 text-xs text-slate-200 shadow-sm backdrop-blur'

const quietButton =
  'cursor-pointer min-h-11 rounded-md px-2 py-1 font-medium text-slate-300 bih-btn text-slate-300 hover:bg-white/10 hover:text-white'

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
        <span className="h-1.5 w-1.5 rounded-full bg-slate-500" aria-hidden="true" />
        <span className="hidden sm:inline">Sign-in unavailable</span>
        <span className="sm:hidden">Offline</span>
      </div>
    )
  }

  const handleSignIn = async () => {
    clearFailure()
    const { error: err } = await signInWithGoogle(supabase)
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
        <button type="button" onClick={handleSignIn} className={quietButton} aria-label="Sign in with Google">
          Sign in
        </button>
      )}

      {user && loadingProfile && <span className="px-1 text-slate-400">Loading…</span>}

      {showPicker && (
        <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
          <label htmlFor="handle-input" className="sr-only">
            Explorer handle
          </label>
          <input
            id="handle-input"
            value={handleInput}
            onChange={(e) => setHandleInput(e.target.value)}
            maxLength={20}
            autoComplete="off"
            placeholder="Your handle"
            aria-describedby="handle-hint"
            className="w-28 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
          />
          <button type="submit" disabled={saving} className={quietButton}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <span id="handle-hint" className="sr-only">
            3 to 20 letters, numbers or underscores. This is the only name shown on the leaderboard.
          </span>
        </form>
      )}

      {user && !loadingProfile && profile && (
        <>
          <span className="max-w-[7.5rem] truncate px-1 text-slate-300" title="Your chosen handle">
            {profile.handle}
          </span>
          <button type="button" onClick={handleSignOut} className={quietButton}>
            Sign out
          </button>
        </>
      )}

      {/* Escape hatch: a failed profile read must not trap the user signed in. */}
      {user && !loadingProfile && !profile && profileLoadFailed && (
        <button type="button" onClick={handleSignOut} className={quietButton}>
          Sign out
        </button>
      )}

      {error && (
        <span role="alert" className="max-w-[9rem] truncate text-xs text-rose-300" title={errorDetail ?? undefined}>
          {error}
        </span>
      )}
    </div>
  )
}
