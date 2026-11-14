// In-flow account control for the Manage Account screen. position: fixed would
// float over the map overlay's zoom/layer panels (z-[700]) and the tab nav;
// normal flow needs no z-index.
// The handle picker and the privacy notice live in PrivacyDialog, owned by
// app.jsx so the first-sign-in gate can open on any screen, not only this one.
import { useState } from 'react'

const pill =
  'flex min-w-0 items-center gap-1.5 rounded-[20px] border border-white/30 bg-white shadow-card px-2 py-1.5 text-xs font-clay font-semibold text-clay-text-body'

const quietButton =
  'cursor-pointer min-h-11 rounded-[14px] px-2 py-1 font-clay font-semibold text-clay-text-body clay-btn--white text-clay-text-heading hover:bg-clay-bg-blue-white hover:text-clay-text-heading'

// Profile state is owned by app.jsx (it also drives the consent gate), so this
// control only renders what it is told and opens the dialog it is given.
export default function AuthButton({
  user = null,
  profile = null,
  loadingProfile = false,
  profileLoadFailed = false,
  supabase = null,
  configured = false,
  onOpenPrivacy,
  onOpenProfile,
}) {
  const [error, setError] = useState(null) // message string
  const [errorDetail, setErrorDetail] = useState(null) // raw error, shown in the tooltip

  const setFailure = (message, detail = null) => {
    setError(message)
    setErrorDetail(detail)
  }

  if (!configured || !supabase) {
    return (
      <div className={pill} title="VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing">
        <span className="h-1.5 w-1.5 rounded-full bg-clay-text-muted" aria-hidden="true" />
        <span className="hidden sm:inline">Sign-in unavailable</span>
        <span className="sm:hidden">Offline</span>
      </div>
    )
  }

  const handleSignIn = async () => {
    setFailure(null)
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      // select_account forces Google's chooser: signOut() only clears the local
      // Supabase session, so without this a shared device would silently reuse
      // the previous Google account.
      options: { redirectTo: window.location.origin, queryParams: { prompt: 'select_account' } },
    })
    // On success the browser redirects to Google, so only failures reach here.
    if (err) setFailure('Sign-in failed — try again', err.message)
  }

  const handleSignOut = async () => {
    setFailure(null)
    const { error: err } = await supabase.auth.signOut()
    if (err) setFailure('Sign-out failed — try again', err.message)
  }

  // A failed profile read means we cannot tell onboarded from not, so the picker
  // is not offered — signing out is the only safe move.
  const showPicker = user && !loadingProfile && !profile && !profileLoadFailed

  return (
    <div className={pill}>
      {!user && (
        <>
          <button type="button" onClick={onOpenPrivacy} className={quietButton}>
            Privacy
          </button>
          <button type="button" onClick={handleSignIn} className={quietButton} aria-label="Sign in with Google">
            Sign in
          </button>
        </>
      )}

      {user && loadingProfile && <span className="px-1 text-clay-text-muted">Loading…</span>}

      {showPicker && (
        <button type="button" onClick={onOpenProfile} className={quietButton}>
          Set up profile
        </button>
      )}

      {user && !loadingProfile && profile && (
        <>
          <span className="max-w-[7.5rem] truncate px-1 text-clay-text-body" title="Your chosen handle">
            {profile.handle}
          </span>
          <button type="button" onClick={onOpenPrivacy} className={quietButton}>
            Privacy
          </button>
          <button type="button" onClick={handleSignOut} className={quietButton}>
            Sign out
          </button>
        </>
      )}

      {/* Escape hatch: a failed profile read must not trap the user signed in. */}
      {user && !loadingProfile && !profile && profileLoadFailed && (
        <>
          <button type="button" onClick={onOpenPrivacy} className={quietButton}>
            Privacy
          </button>
          <button type="button" onClick={handleSignOut} className={quietButton}>
            Sign out
          </button>
        </>
      )}

      {error && (
        <span role="alert" className="max-w-[9rem] truncate text-xs text-clay-coral" title={errorDetail ?? undefined}>
          {error}
        </span>
      )}
    </div>
  )
}
