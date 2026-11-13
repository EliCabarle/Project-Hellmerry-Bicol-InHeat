// HP -> leaderboard score, for the gamified-dashboard slice.
// The Supabase client is passed in by the web shell (see AGENTS.md interface
// contract), so this module stays importable from a plain node test.
//
// Since 0009_hp_events.sql the stored score is DERIVED by the server: the client
// publishes events (src/eventStore.js) and a trigger sums them. This module only
// reads that derived number, so a browser with no local HP can adopt it instead
// of wiping it.

// Read the score already stored for this account. Called before publishing so a
// browser with no local HP adopts that number instead of overwriting it with 0.
// Returns { score, error }: score is null when there is no profile row yet.
export async function readScore(supabase, userId) {
  if (!supabase || !userId) return { score: null, error: null }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('score')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return { score: null, error }

  return { score: Number.isFinite(data?.score) ? data.score : null, error: null }
}