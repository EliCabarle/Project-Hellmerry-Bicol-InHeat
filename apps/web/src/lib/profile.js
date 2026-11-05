// Profile (public handle + task score) access for the web shell.
// The Supabase client is passed in, like savedStore.js, so this module stays
// importable from a plain node test.

// Mirrors the user_profiles_handle_fmt check in 0003_user_profiles.sql. Keep the
// two in step: validating here gives a useful message, the DB is the real gate.
const HANDLE_RE = /^[A-Za-z0-9_]{3,20}$/

export function validateHandle(raw) {
  const handle = String(raw ?? '').trim()
  if (!handle) return 'Enter a handle.'
  if (handle.length < 3) return 'At least 3 characters.'
  if (!HANDLE_RE.test(handle)) return 'Use 3–20 letters, numbers or underscores.'
  return null
}

// A missing row is not an error: it means "signed in, has not picked a handle yet".
export async function loadMyProfile(supabase, userId) {
  return supabase.from('user_profiles').select('handle, score').eq('user_id', userId).maybeSingle()
}

// Onboarding is a one-time insert; a rename is a separate update(handle). Not an
// upsert, because the column grant allows handle writes only — an upsert would
// need update rights on the whole row.
export async function saveHandle(supabase, userId, rawHandle) {
  const handle = String(rawHandle ?? '').trim()
  const { data, error } = await supabase
    .from('user_profiles')
    .insert({ user_id: userId, handle })
    .select('handle, score')
    .single()
  if (!error) return { data, error: null }
  // 23505 = unique violation. Overwhelmingly the lower(handle) index; a duplicate
  // user_id only happens if two tabs onboard at once, and the message still
  // points the user at the thing they can change.
  if (error.code === '23505') {
    return { data: null, error: { code: error.code, message: 'That handle is taken — pick another.' } }
  }
  return { data: null, error }
}
