import { useEffect, useState } from 'react'
import { supabase, supabaseConfigured } from './lib/supabase'

// Single owner of the auth session. The header pill used to hold `user` in its
// own state, so no screen could tell who was signed in — saved places and the
// leaderboard both need it, and two onAuthStateChange listeners would drift.
export default function useSession() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (!supabase) return

    // Pick up a session that already exists (e.g. after the OAuth redirect reload).
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))

    // Follow sign-in / sign-out while the app stays open.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  return { user, supabase, configured: supabaseConfigured }
}
