// Daily quests sourced from eco_quests_tasks.csv. Pure: no React, no network,
// no storage. Difficulty comes from the CSV column — the 1-15 / 16-27 / 28-68
// bands are POINTS per tier, not task-number ranges.

// Points a task can be worth, by its difficulty tier.
export const TIER_POINTS = {
  easy: [1, 15],
  medium: [16, 27],
  hard: [28, 68],
}

export const QUESTS_PER_DAY = 5
export const MIN_EASY_PER_DAY = 2

// Quote-aware field split: descriptions contain commas, so a bare split(',')
// would break every row. Also unescapes "" inside a quoted field.
// shortcut: no support for newlines inside a quoted field, the CSV has none.
function splitCsvLine(line) {
  const out = []
  let field = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          quoted = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === ',') {
      out.push(field)
      field = ''
    } else {
      field += ch
    }
  }
  out.push(field)
  return out
}

function normalizeTier(raw) {
  const tier = String(raw ?? '').trim().toLowerCase()
  return tier === 'medium' || tier === 'hard' ? tier : 'easy'
}

// Parse "Task_Number,Difficulty,Task_Title,Description" rows into a catalog.
// Malformed rows are dropped rather than guessed at.
export function parseQuestCsv(text) {
  if (typeof text !== 'string' || !text.trim()) return []
  const lines = text.split(/\r?\n/).filter((line) => line.trim())
  const tasks = []
  for (let i = 1; i < lines.length; i += 1) {
    const [rawNumber, rawTier, rawTitle, ...rest] = splitCsvLine(lines[i])
    const n = Number.parseInt(rawNumber, 10)
    const title = String(rawTitle ?? '').trim()
    if (!Number.isInteger(n) || !title) continue
    tasks.push({
      n,
      title,
      // rest is a safety net for an unquoted comma in the description.
      description: rest.join(',').trim(),
      tier: normalizeTier(rawTier),
    })
  }
  return tasks
}

// FNV-1a over the seed string.
function hashString(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Small deterministic PRNG; same seed always yields the same sequence.
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffled(list, seed) {
  const rng = mulberry32(seed)
  const out = [...list]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}

// A task's HP is stable for a given day: same tier, task, and date -> same value.
export function pointsFor(tier, n, dateStr) {
  const [lo, hi] = TIER_POINTS[tier] ?? TIER_POINTS.easy
  const rng = mulberry32(hashString(`${dateStr}:${tier}:${n}`))
  return lo + Math.floor(rng() * (hi - lo + 1))
}

// Draw the day's quests: 5 total, at least 2 easy, skipping yesterday's ids when
// the pool is big enough. Deterministic for a given date, so a reload mid-day
// never reshuffles.
export function drawDaily(tasks, dateStr, previousIds = []) {
  if (!Array.isArray(tasks) || tasks.length === 0) return []
  const prev = new Set(previousIds)
  const seed = hashString(`draw:${dateStr}`)
  const easy = shuffled(tasks.filter((t) => t.tier === 'easy'), seed ^ 0x9e3779b9)
  const rest = shuffled(tasks.filter((t) => t.tier !== 'easy'), seed ^ 0x85ebca6b)

  // Prefer tasks that were not drawn yesterday; fall back to the whole pool only
  // when the fresh pool cannot fill the quota.
  const pick = (pool, count) => {
    const fresh = pool.filter((t) => !prev.has(`csv-${t.n}`))
    return (fresh.length >= count ? fresh : pool).slice(0, count)
  }

  const chosenEasy = pick(easy, MIN_EASY_PER_DAY)
  const used = new Set(chosenEasy.map((t) => t.n))
  const chosenRest = pick(rest.filter((t) => !used.has(t.n)), QUESTS_PER_DAY - chosenEasy.length)

  let picked = [...chosenEasy, ...chosenRest]
  if (picked.length < QUESTS_PER_DAY) {
    // Only reachable with a CSV smaller than the daily quota.
    const taken = new Set(picked.map((t) => t.n))
    const left = shuffled(tasks.filter((t) => !taken.has(t.n)), seed ^ 0x27d4eb2f)
    picked = [...picked, ...left.slice(0, QUESTS_PER_DAY - picked.length)]
  }

  return picked.map((t) => ({
    id: `csv-${t.n}`,
    title: t.title,
    description: t.description,
    hp: pointsFor(t.tier, t.n, dateStr),
    limit: 'daily',
  }))
}