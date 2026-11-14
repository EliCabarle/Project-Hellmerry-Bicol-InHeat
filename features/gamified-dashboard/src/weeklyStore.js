// Collective weekly HP read for the gamified-dashboard slice.
// The public view is `public.collective_weekly_hp` (see 0009_hp_events.sql): it
// exposes a week, the summed quest HP and a contributor count -- no user rows.
// A new week has no rows, so the caller naturally sees 0 without any reset job.
export async function fetchWeekTotal(supabase, week) {
  if (!supabase || !week) return { total: 0, contributors: 0, error: null }

  const { data, error } = await supabase
    .from('collective_weekly_hp')
    .select('week, hp, contributors')
    .eq('week', week)
    .maybeSingle()
  if (error) return { total: 0, contributors: 0, error }

  return {
    total: Number.isFinite(data?.hp) ? data.hp : 0,
    contributors: Number.isFinite(data?.contributors) ? data.contributors : 0,
    error: null,
  }
}