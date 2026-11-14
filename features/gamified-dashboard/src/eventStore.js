// Publish Heat Points as events. The server stores each row and derives the
// leaderboard score by summing them; no client-sent total exists any more.
//
// `restore` is local bookkeeping (HP adopted from the server on sign-in) and is
// never sent, or it would be counted twice.
//
// Only the last WINDOW_DAYS are sent. Submit pushes immediately while online, so
// the window is a safety net for a short offline spell, not the normal path.

const WINDOW_DAYS = 30
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// Whole days since the epoch, so the window is timezone-free (both dates are
// already Manila calendar days).
function dayNumber(date) {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / 86400000
}

// The rows to send: quest + login only, inside the window, shaped for the RPC.
// Malformed or negative rows are dropped here rather than aborting the batch.
export function eventsToPush(events, today) {
  if (!Array.isArray(events) || typeof today !== 'string' || !DATE_RE.test(today)) return []
  const cutoff = dayNumber(today) - WINDOW_DAYS
  return events
    .filter(
      (e) =>
        e &&
        (e.kind === 'login' || e.kind === 'quest') &&
        typeof e.date === 'string' &&
        DATE_RE.test(e.date) &&
        Number.isFinite(e.hp) &&
        e.hp > 0,
    )
    .filter((e) => dayNumber(e.date) >= cutoff)
    .map((e) => ({
      kind: e.kind,
      quest_id: e.questId ?? '',
      date: e.date,
      hp: e.hp,
    }))
}

// Push a batch; the server drops duplicates, so calling it repeatedly is safe.
// Returns { inserted, error }. A missing client is a silent no-op.
export async function pushEvents(supabase, events, today) {
  if (!supabase) return { inserted: 0, error: null }
  const p_events = eventsToPush(events, today)
  if (p_events.length === 0) return { inserted: 0, error: null }

  const { data, error } = await supabase.rpc('record_events', { p_events })
  if (error) return { inserted: 0, error }
  return { inserted: Number.isFinite(data) ? data : 0, error: null }
}