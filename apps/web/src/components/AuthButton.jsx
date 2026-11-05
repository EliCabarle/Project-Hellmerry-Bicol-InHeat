import { useState } from 'react'

// In-flow header pill. position: fixed would float over the map overlay's
// zoom/layer panels (z-[700]) and the tab nav; normal flow needs no z-index.
const pill =
  'flex items-center gap-2 rounded-full border border-slate-700 bg-heat-bg/70 px-3 py-1.5 text-sm text-slate-200'

// Session state is owned by useSession() in app.jsx and passed down, so screens
// and the header agree on who is signed in.
export default function AuthButton({ user = null, supabase = null, configured = false }) {
  const [error, setError] = useState(null)

  if (!configured || !supabase) {
    return (
      <div className={pill} title="VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing">
        Sign-in unavailable
      </div>
    )
  }

  const handleSignIn = async () => {
    setError(null)
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    // On success the browser redirects to Google, so only failures reach here.
    if (err) setError(err.message)
  }

  const handleSignOut = async () => {
    setError(null)
    const { error: err } = await supabase.auth.signOut()
    if (err) setError(err.message)
  }

  // shortcut: email prefix shown as the handle for now; swap to profiles.username
  // before any leaderboard is built, since CONCEPT §9 forbids real names there.
  const handle = user?.email?.split('@')[0]

  return (
    <div className={pill}>
      {user ? (
        <>
          <span className="max-w-[10rem] truncate">{handle}</span>
          <button
            onClick={handleSignOut}
            className="rounded bg-heat-hot px-2 py-0.5 text-xs text-white hover:opacity-90"
          >
            Sign out
          </button>
        </>
      ) : (
        <button onClick={handleSignIn} className="hover:text-white">
          Sign in with Google
        </button>
      )}
      {error && (
        <span role="alert" className="text-xs text-heat-hotline" title={error}>
          Sign-in failed — try again
        </span>
      )}
    </div>
  )
}
