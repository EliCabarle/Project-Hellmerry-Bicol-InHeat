// Leaderboard read for the gamified-dashboard slice.
// The public view is `public.leaderboard` (see 0003_user_profiles.sql): it exposes
// a handle, a task score and a computed saved_count — never an email or a name.
// The explicit order() means the client does not depend on the view's own ORDER BY.
export async function fetchTop10(supabase) {
  return supabase
    .from('leaderboard')
    .select('handle, score, saved_count')
    .order('score', { ascending: false })
    .order('saved_count', { ascending: false })
    .limit(10)
}
