// HP -> leaderboard score, for the gamified-dashboard slice.
// The Supabase client is passed in by the web shell (see AGENTS.md interface
// contract), so this module stays importable from a plain node test.
//
// Local HP is self-reported and lives in localStorage (progressStore.js); this
// module is the only thing that publishes it. The server is the real gate: it
// caps the value at 100 HP per day of account age (0004_set_my_score.sql), so
// the clamp below is only about not sending nonsense over the wire.

// Mirrors the hard floor inside set_my_score. Keep the two in step.
export const MAX_SCORE = 100000

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

// Publish `totalHP` as the signed-in user's score.
// Returns { cappedTo, error }:
//   cappedTo - the server's ceiling, set only when it stored less than we asked
//              for (null means "stored as asked" or "no profile row yet");
//   error    - the Supabase error object, never thrown.
// A missing client is a no-op so callers need no sign-in check of their own.
export async function syncScore(supabase, totalHP) {
  if (!supabase || !Number.isFinite(totalHP)) return { cappedTo: null, error: null }

  // Non-negative integer inside the server's floor; a hand-edited localStorage
  // value is clamped here rather than trusted.
  const p_score = Math.max(0, Math.min(MAX_SCORE, Math.round(totalHP)))

  const { data, error } = await supabase.rpc('set_my_score', { p_score })
  if (error) return { cappedTo: null, error }

  // `data` is the ceiling the function applied; null when there is no profile
  // row (signed in, handle not chosen yet).
  const cappedTo = Number.isFinite(data) && data < p_score ? data : null
  return { cappedTo, error: null }
}
