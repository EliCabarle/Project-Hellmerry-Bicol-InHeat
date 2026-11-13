// Heat Points progress — append-only event log. Pure logic, no React, no network.
// HP is a game score, self-reported by design: nothing here measures anything.
// Every entry snapshots its HP at award time, so config changes never rewrite history.

import { drawDaily, pointsFor } from './questTasks.js'

export const HP_PER_LEVEL = 100
export const STREAK_CAP_DAY = 7
export const TZ = 'Asia/Manila'
export const STORAGE_KEY = 'bih.progress.v1'
export const HISTORY_DAYS = 30

// HP is per account, not per device: two accounts on one browser must not read
// each other's log. Guests keep the original key so nothing already on disk is
// lost or needs migrating — a guest's HP simply stops showing once signed in.
export const progressKey = (userId) => (userId ? `${STORAGE_KEY}.${userId}` : STORAGE_KEY)

// Level bands, verbatim from the brief. Level 65–66 corrects the brief's
// overlapping 64–66 range (33–64 already owns level 64).
export const TITLES = [
  { minLevel: 1, title: 'novice eXplorer' },
  { minLevel: 11, title: 'Intermediate eXplorer' },
  { minLevel: 21, title: 'Xperienced' },
  { minLevel: 33, title: "Rocky's Friend" },
  { minLevel: 65, title: 'Oragon!' },
  { minLevel: 67, title: 'Nice' },
  { minLevel: 68, title: "Mayon's confidant" },
  { minLevel: 69, title: 'Labuyo3000' },
  { minLevel: 70, title: 'Project HM-Certified!' },
]

export const QUESTS = [
  { id: 'bottle', label: 'Recycled one plastic bottle', hp: 5, limit: 'unlimited' },
  { id: 'vegan', label: 'Went Vegan', hp: 16, limit: 'daily' },
  { id: 'local', label: 'Bought Local', hp: 12, limit: 'daily' },
  { id: 'advocate', label: 'Advocated for Green Policies', hp: 3, limit: 'unlimited' },
]

export function streakHp(day) {
  return 2 ** (Math.min(day, STREAK_CAP_DAY) - 1)
}

export function titleForLevel(level) {
  let title = TITLES[0].title
  for (const t of TITLES) if (level >= t.minLevel) title = t.title
  return title
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const manilaFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const clockFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

// Calendar day of an instant in Manila, 'YYYY-MM-DD'.
export function manilaDate(instant) {
  return manilaFmt.format(instant)
}

// Manila wall-clock time of an event timestamp, 'HH:MM'.
export function manilaClock(ms) {
  return clockFmt.format(new Date(ms))
}

function addDays(date, n) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d) + n * 86400000).toISOString().slice(0, 10)
}

// Monday of the ISO week containing `date`, 'YYYY-MM-DD'. Matches the server's
// date_trunc('week', ...), so the client and the collective bar agree on which
// week a quest belongs to.
export function weekStart(date) {
  const [y, m, d] = date.split('-').map(Number)
  const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7 // Monday = 0
  return addDays(date, -dow)
}

// Event kinds this log accepts. 'restore' is HP adopted from the leaderboard on
// sign-in, so a browser can display a score earned elsewhere; it is not HP earned
// today, which is why derive() keeps it out of the per-day totals.
const KINDS = ['login', 'quest', 'restore']

function isEvent(e) {
  return Boolean(
    e &&
      typeof e === 'object' &&
      typeof e.id === 'string' &&
      e.id &&
      typeof e.date === 'string' &&
      DATE_RE.test(e.date) &&
      KINDS.includes(e.kind) &&
      (e.kind !== 'quest' || (typeof e.questId === 'string' && !!e.questId)) &&
      typeof e.hp === 'number' &&
      Number.isFinite(e.hp) &&
      typeof e.at === 'number' &&
      Number.isFinite(e.at),
  )
}

function safeLocalStorage() {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function readEvents(storage, key) {
  try {
    const raw = storage?.getItem(key)
    if (typeof raw !== 'string' || !raw) return []
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.events)) return []
    return parsed.events.filter(isEvent)
  } catch {
    return []
  }
}

function writeEvents(storage, key, events) {
  try {
    storage?.setItem(key, JSON.stringify({ v: 1, events }))
    return storage != null
  } catch {
    return false
  }
}

let seq = 0
function makeId(at) {
  seq += 1
  return `ev-${at}-${seq}-${Math.random().toString(36).slice(2, 8)}`
}

// The day's drawn quest ids, so a reload mid-day returns the same checklist and
// tomorrow can exclude it. Stored next to the event log, same storage mechanism.
function readSet(storage, key) {
  try {
    const raw = storage?.getItem(key)
    if (typeof raw !== 'string' || !raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.date !== 'string' || !Array.isArray(parsed.ids)) return null
    return parsed
  } catch {
    return null
  }
}

function writeSet(storage, key, date, ids) {
  try {
    storage?.setItem(key, JSON.stringify({ date, ids }))
    return storage != null
  } catch {
    // Same-day stability is the only thing lost; the quests still award.
    return false
  }
}

// Streak day counted back from `date` over a set of login dates.
function runEnding(dateSet, date) {
  let count = 0
  let cursor = date
  while (dateSet.has(cursor)) {
    count += 1
    cursor = addDays(cursor, -1)
  }
  return count
}

// Uncompensated awards per quest for events on `date` (or all events when date is null).
// A compensation matches the most recent still-active award (append-only undo).
function activeStacks(list, date) {
  const stacks = new Map()
  for (const e of list) {
    if (e.kind !== 'quest') continue
    if (date != null && e.date !== date) continue
    if (!stacks.has(e.questId)) stacks.set(e.questId, [])
    const stack = stacks.get(e.questId)
    if (e.hp >= 0) stack.push(e.hp)
    else stack.pop()
  }
  return stacks
}

// True when `questId` already has an active award on `date` — i.e. it was
// submitted. A recorded quest is locked and can never be unchecked.
function isRecorded(events, date, questId) {
  return (activeStacks(events, date).get(questId)?.length ?? 0) > 0
}

// Derive every displayed number from the log. Never stores counters.
// `today` is the current Manila day (pass manilaDate(now())); current streak
// stays alive through yesterday, zero after a missed day.
export function derive(list, today = null) {
  const events = Array.isArray(list) ? list.filter(isEvent) : []
  const totalHP = events.reduce((sum, e) => sum + e.hp, 0)
  const level = Math.max(1, Math.floor(totalHP / HP_PER_LEVEL) + 1)
  const inLevel = Math.min(HP_PER_LEVEL - 1, Math.max(0, totalHP % HP_PER_LEVEL))

  const dayTotals = {}
  for (const e of events) {
    // Restored HP counts toward the total and the level, but it was not earned
    // today — excluding it keeps "Today's HP" and the History bars honest.
    if (e.kind === 'restore') continue
    dayTotals[e.date] = (dayTotals[e.date] ?? 0) + e.hp
  }

  const loginDates = [...new Set(events.filter((e) => e.kind === 'login').map((e) => e.date))].sort()
  const dateSet = new Set(loginDates)
  let bestStreak = 0
  let run = 0
  let prev = null
  for (const d of loginDates) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1
    if (run > bestStreak) bestStreak = run
    prev = d
  }
  // Alive while the latest login is today or yesterday (a future latest login
  // means the clock moved back — keep the streak, checkIn treats it as a no-op).
  const ref = today ?? loginDates[loginDates.length - 1] ?? null
  const last = loginDates[loginDates.length - 1] ?? null
  const alive = ref != null && last != null && last >= addDays(ref, -1)
  const currentStreak = alive ? runEnding(dateSet, last) : 0

  const todayLogin = today != null ? events.find((e) => e.kind === 'login' && e.date === today) : null
  const loginToday = today == null
    ? null
    : todayLogin
      ? (() => {
          const day = runEnding(dateSet, today)
          return { day, hp: todayLogin.hp, tomorrowHp: streakHp(day + 1) }
        })()
      : { day: 0, hp: 0, tomorrowHp: null }

  const questStats = {}
  for (const e of events) {
    if (e.kind !== 'quest') continue
    if (!questStats[e.questId]) questStats[e.questId] = { awarded: 0, undone: 0, net: 0 }
    const s = questStats[e.questId]
    if (e.hp >= 0) s.awarded += 1
    else s.undone += 1
    s.net = s.awarded - s.undone
  }

  const todayCounts = {}
  for (const [questId, stack] of activeStacks(events, today)) todayCounts[questId] = stack.length

  return {
    totalHP,
    level,
    title: titleForLevel(level),
    inLevel,
    bar: inLevel / HP_PER_LEVEL,
    currentStreak,
    bestStreak,
    activeDays: Object.keys(dayTotals).length,
    dayTotals,
    questStats,
    todayCounts,
    todayTotal: today != null ? dayTotals[today] ?? 0 : 0,
    loginToday,
  }
}

// Last `n` Manila days ending at `today`, oldest first. Zero days included.
export function recentDays(today, n = HISTORY_DAYS) {
  const out = []
  for (let i = n - 1; i >= 0; i -= 1) out.push(addDays(today, -i))
  return out
}

export function createProgress(options = {}) {
  const storage = 'storage' in options ? options.storage : safeLocalStorage()
  const now = options.now ?? (() => new Date())
  // Fallback catalog: used until the CSV loads, or if the fetch fails.
  const fallbackQuests = options.quests ?? QUESTS
  const catalog = Array.isArray(options.catalog) ? options.catalog : []
  // One key per account (options.userId); guests share the original key.
  const key = progressKey(options.userId)
  // The day's drawn quest ids live beside the event log, same storage.
  const setKey = `${key}.set`
  // Checked-but-not-submitted quest ids for today. Visual only: kept out of the
  // event log, so a pending check is never published as score.
  const pendingKey = `${key}.pending`

  const read = () => readEvents(storage, key)

  const append = (event) => {
    const prev = read()
    const next = [...prev, event]
    if (!writeEvents(storage, key, next)) {
      return { ok: false, events: prev, error: 'Could not save progress on this device.' }
    }
    return { ok: true, events: next }
  }

  // Today's checklist. Memoized per Manila day: a reload mid-day returns the
  // same tasks, and tomorrow's draw excludes today's ids.
  let drawn = { date: null, list: null }

  const ensureDrawn = () => {
    const today = manilaDate(now())
    if (drawn.date === today && drawn.list) return drawn.list
    if (catalog.length === 0) {
      drawn = { date: today, list: fallbackQuests }
      return drawn.list
    }

    const blob = readSet(storage, setKey)
    let list
    if (blob && blob.date === today) {
      // Rebuild HP from the same seed instead of trusting a stored number, so a
      // stale blob can never freeze a different value than the row showed.
      list = blob.ids
        .map((id) => catalog.find((t) => `csv-${t.n}` === id))
        .filter(Boolean)
        .map((t) => ({
          id: `csv-${t.n}`,
          title: t.title,
          description: t.description,
          hp: pointsFor(t.tier, t.n, today),
          limit: 'daily',
        }))
    } else {
      list = drawDaily(catalog, today, blob?.ids ?? [])
      writeSet(storage, setKey, today, list.map((q) => q.id))
    }
    drawn = { date: today, list: list.length > 0 ? list : fallbackQuests }
    return drawn.list
  }

  // CSV ids resolve from today's draw; legacy ids still resolve from the static
  // fallback so an older History entry keeps its name.
  const findQuest = (questId) =>
    ensureDrawn().find((q) => q.id === questId) ??
    fallbackQuests.find((q) => q.id === questId) ??
    null

  // History reads `label` off the event, so snapshot it at award time.
  const snapshot = (quest) => quest.title ?? quest.label

  // Ids checked but not submitted today. A stale blob for another day reads empty.
  const getPending = () => {
    const today = manilaDate(now())
    const blob = readSet(storage, pendingKey)
    return blob && blob.date === today ? blob.ids : []
  }

  return {
    // The storage key this store reads and writes. The shell compares it against
    // `storage` event keys, so a write from another tab on a different account
    // is ignored instead of re-read under the wrong key.
    key,

    // Never throws: missing, corrupt or inaccessible storage reads as empty.
    read,

    // Today's quests for the checklist. Callers render this, not QUESTS.
    getDailyQuests: () => ensureDrawn(),

    // First dashboard open of a Manila calendar day. Same day or a clock that
    // moved backwards is a no-op; a missed day restarts the streak at day 1.
    checkIn() {
      const today = manilaDate(now())
      const events = read()
      let lastLogin = ''
      for (const e of events) if (e.kind === 'login' && e.date > lastLogin) lastLogin = e.date
      if (lastLogin >= today) return { ok: true, events, noop: true }
      const dates = new Set(events.filter((e) => e.kind === 'login').map((e) => e.date))
      const day = runEnding(dates, addDays(today, -1)) + 1
      const at = now().getTime()
      return append({ id: makeId(at), date: today, kind: 'login', hp: streakHp(day), at })
    },

    // Today's checked-but-not-submitted quest ids. Rendered by the checklist;
    // never published, so unchecking one cannot move the saved score.
    getPending,

    // Check / uncheck before Submit. Refused once the quest is recorded, so a
    // submitted quest is locked for the day. That is what keeps the saved score
    // from ever going down — and from fighting itself on every sync.
    togglePending(questId) {
      const quest = findQuest(questId)
      const today = manilaDate(now())
      const events = read()
      if (!quest) return { ok: false, events, error: 'Unknown quest.' }
      if (isRecorded(events, today, questId)) {
        return { ok: false, events, error: 'Already recorded today.' }
      }
      const pending = getPending()
      const next = pending.includes(questId)
        ? pending.filter((id) => id !== questId)
        : [...pending, questId]
      if (!writeSet(storage, pendingKey, today, next)) {
        return { ok: false, events, error: 'Could not save progress on this device.' }
      }
      return { ok: true, events, pending: next }
    },

    // Record a pending quest: append its award (the only thing that publishes)
    // and drop it from pending. Repeats are a no-op, so a locked row stays locked.
    submitQuest(questId) {
      const quest = findQuest(questId)
      const today = manilaDate(now())
      const events = read()
      if (!quest) return { ok: false, events, error: 'Unknown quest.' }
      if (isRecorded(events, today, questId)) return { ok: true, events, noop: true }
      const at = now().getTime()
      const r = append({
        id: makeId(at), date: today, kind: 'quest', questId, hp: quest.hp, at, label: snapshot(quest),
      })
      if (!r.ok) return r
      writeSet(storage, pendingKey, today, getPending().filter((id) => id !== questId))
      return r
    },

    // Make the local total equal the stored score, in both directions. A `restore`
    // event is local-only (never pushed), so a negative one is safe. Lowering is
    // what removes HP this device holds but the server refused: 0009 dropped the
    // pre-event table without a backfill, and duplicate awards can never pass the
    // server's primary key.
    restoreTo(targetHP) {
      const events = read()
      const target = Math.floor(Number(targetHP))
      if (!Number.isFinite(target) || target < 0) return { ok: true, events, noop: true }
      const delta = target - derive(events).totalHP
      if (delta === 0) return { ok: true, events, noop: true }
      const at = now().getTime()
      return append({ id: makeId(at), date: manilaDate(now()), kind: 'restore', hp: delta, at })
    },

    derive(today = manilaDate(now())) {
      return derive(read(), today)
    },
  }
}
