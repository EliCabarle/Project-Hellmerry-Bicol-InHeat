// Shared Google OAuth entry point (UI-CHECK FLAG-1 fix). Awaits the promise so
// callers can render the failure — app.jsx's old fire-and-forget call dropped
// errors as unhandled rejections. `select_account` forces Google's chooser:
// signOut() only clears the local Supabase session, so without it a shared
// device would silently reuse the previous Google account.
export async function signInWithGoogle(supabase) {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: { prompt: 'select_account' },
    },
  })
}
