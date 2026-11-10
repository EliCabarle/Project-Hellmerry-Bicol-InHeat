// Heat Points progress — append-only event log. Pure logic, no React, no network.
// HP is a game score, self-reported by design: nothing here measures anything.
// Every entry snapshots its HP at award time, so config changes never rewrite history.

export const HP_PER_LEVEL = 100
export const STREAK_CAP_DAY = 7
export const TZ = 'Asia/Manila'
export const STORAGE_KEY = 'bih.progress.v1'
export const HISTORY_DAYS = 30

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

function isEvent(e) {
  return Boolean(
    e &&
      typeof e === 'object' &&
      typeof e.id === 'string' &&
      e.id &&
      typeof e.date === 'string' &&
      DATE_RE.test(e.date) &&
      (e.kind === 'login' || e.kind === 'quest') &&
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

function readEvents(storage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (typeof raw !== 'string' || !raw) return []
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.events)) return []
    return parsed.events.filter(isEvent)
  } catch {
    return []
  }
}

function writeEvents(storage, events) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify({ v: 1, events }))
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

// Derive every displayed number from the log. Never stores counters.
// `today` is the current Manila day (pass manilaDate(now())); current streak
// stays alive through yesterday, zero after a missed day.
export function derive(list, today = null) {
  const events = Array.isArray(list) ? list.filter(isEvent) : []
  const totalHP = events.reduce((sum, e) => sum + e.hp, 0)
  const level = Math.max(1, Math.floor(totalHP / HP_PER_LEVEL) + 1)
  const inLevel = Math.min(HP_PER_LEVEL - 1, Math.max(0, totalHP % HP_PER_LEVEL))

  const dayTotals = {}
  for (const e of events) dayTotals[e.date] = (dayTotals[e.date] ?? 0) + e.hp

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
  const quests = options.quests ?? QUESTS

  const read = () => readEvents(storage)

  const append = (event) => {
    const prev = read()
    const next = [...prev, event]
    if (!writeEvents(storage, next)) {
      return { ok: false, events: prev, error: 'Could not save progress on this device.' }
    }
    return { ok: true, events: next }
  }

  const findQuest = (questId) => quests.find((q) => q.id === questId) ?? null

  return {
    // Never throws: missing, corrupt or inaccessible storage reads as empty.
    read,

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

    // Once-per-day checkbox: flips today's award on/off. Never exceeds one
    // effective award and never compensates below zero active.
    toggleDaily(questId) {
      const quest = findQuest(questId)
      const today = manilaDate(now())
      const events = read()
      if (!quest) return { ok: false, events, error: 'Unknown quest.' }
      const stack = activeStacks(events, today).get(questId) ?? []
      const at = now().getTime()
      if (stack.length > 0) {
        return append({
          id: makeId(at), date: today, kind: 'quest', questId, hp: -stack[stack.length - 1], at,
        })
      }
      // Stack empty = zero active awards today, so awarding can never exceed
      // one effective once-per-day award no matter how often it is toggled.
      return append({ id: makeId(at), date: today, kind: 'quest', questId, hp: quest.hp, at })
    },

    // Unlimited "+" — one more active entry today (daily quests route through
    // toggleDaily and are refused here so they can never double-award).
    addQuest(questId) {
      const quest = findQuest(questId)
      const today = manilaDate(now())
      const events = read()
      if (!quest) return { ok: false, events, error: 'Unknown quest.' }
      if (quest.limit === 'daily') return this.toggleDaily(questId)
      const at = now().getTime()
      return append({ id: makeId(at), date: today, kind: 'quest', questId, hp: quest.hp, at })
    },

    // "−" — append-only compensation for the latest active entry from today
    // only. Past days are never editable; active count never goes negative.
    undoQuest(questId) {
      const today = manilaDate(now())
      const events = read()
      const stack = activeStacks(events, today).get(questId) ?? []
      if (stack.length === 0) return { ok: true, events, noop: true }
      const at = now().getTime()
      return append({
        id: makeId(at), date: today, kind: 'quest', questId, hp: -stack[stack.length - 1], at,
      })
    },

    derive(today = manilaDate(now())) {
      return derive(read(), today)
    },
  }
}
