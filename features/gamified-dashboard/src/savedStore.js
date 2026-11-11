// Saved-history data access for the gamified-dashboard slice.
// The Supabase client is passed in by the web shell (see AGENTS.md interface
// contract) so this module stays importable from a plain node test.

// Exact-match key, not normalised: rows are written from narratives.json entries
// and read back against those same entries, so "City of Naga" never appears on
// one side only. Normalising here would duplicate joinKey() in map-controls.
export const savedKey = (name, province) => `${name ?? ''}|${province ?? ''}`

// Rank before filtering, never after: DashboardTable prints this number, and
// re-indexing a filtered array would silently turn 37th into 1st.
export const withRank = (rows = []) => rows.map((m, i) => ({ ...m, rank: i + 1 }))

// An empty key set means "nothing saved", not "no filter": the caller decides
// whether to filter by not calling this at all.
export const filterSaved = (rows = [], keys = new Set()) =>
  rows.filter((m) => keys.has(savedKey(m?.name, m?.province)))

export async function listSaved(supabase) {
  return supabase
    .from('user_saved_municipalities')
    .select('municipality_name, province, saved_at')
    .order('saved_at', { ascending: false })
}

// save is idempotent: the PK (user_id, municipality_name, province) turns a
// double-click into a no-op instead of a duplicate row.
export async function addSaved(supabase, name, province) {
  return supabase.from('user_saved_municipalities').upsert(
    { municipality_name: name, province },
    { onConflict: 'user_id,municipality_name,province', ignoreDuplicates: true },
  )
}

// RLS narrows this delete to the caller's own rows, so no user_id filter is needed.
export async function removeSaved(supabase, name, province) {
  return supabase
    .from('user_saved_municipalities')
    .delete()
    .eq('municipality_name', name)
    .eq('province', province)
}
