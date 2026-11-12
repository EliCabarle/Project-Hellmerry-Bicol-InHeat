// Bicol In-Heat — map-controls calendar date model.
// Pure UTC calendar math: Date.UTC only, never local-time parsing/formatting.
// Range comes from the data period (narratives meta), never from constants.

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const AMBIGUOUS_HINT = 'Use ISO (2019-04-23) or a month name (23 Apr 2019).'
const SHAPE_HINT = 'Try 2019, 2019-04, 2019-04-23, "Apr 2019", "April 23, 2019" or "23 Apr 2019".'

export function isLeapYear(year) {
  const y = Number(year)
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}

export function daysInMonth(year, month) {
  if (!Number.isFinite(Number(year)) || !Number.isFinite(Number(month))) return null
  const m = Number(month)
  if (m < 1 || m > 12) return null
  if (m === 2) return isLeapYear(year) ? 29 : 28
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]
}

export function daysInYear(year) {
  if (!Number.isFinite(Number(year))) return null
  return isLeapYear(year) ? 366 : 365
}

const pad2 = (n) => String(n).padStart(2, '0')

export function formatDate(year, month, day) {
  if (!Number.isFinite(Number(year)) || !Number.isFinite(Number(month)) || !Number.isFinite(Number(day))) return null
  return `${String(Number(year)).padStart(4, '0')}-${pad2(Number(month))}-${pad2(Number(day))}`
}

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/

// Full calendar validation: impossible dates return null, never clamped.
export function parseISO(value) {
  if (typeof value !== 'string') return null
  const m = ISO_RE.exec(value.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (mo < 1 || mo > 12) return null
  const dim = daysInMonth(y, mo)
  if (dim == null || d < 1 || d > dim) return null
  return { y, m: mo, d }
}

export function isValidISO(value) {
  return parseISO(value) !== null
}

const utcMs = (y, m, d) => Date.UTC(y, m - 1, d)

export function compareDates(a, b) {
  const pa = parseISO(a)
  const pb = parseISO(b)
  if (!pa || !pb) return null
  const ma = utcMs(pa.y, pa.m, pa.d)
  const mb = utcMs(pb.y, pb.m, pb.d)
  return ma < mb ? -1 : ma > mb ? 1 : 0
}

export function clampDate(value, min, max) {
  if (!isValidISO(value)) return null
  if (min && compareDates(value, min) < 0) return min
  if (max && compareDates(value, max) > 0) return max
  return value
}

export function addDays(value, days) {
  const p = parseISO(value)
  if (!p || !Number.isFinite(Number(days))) return null
  const dt = new Date(utcMs(p.y, p.m, p.d) + Math.trunc(Number(days)) * 86400000)
  return formatDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
}

export function dayOfYear(value) {
  const p = parseISO(value)
  if (!p) return null
  return Math.floor((utcMs(p.y, p.m, p.d) - Date.UTC(p.y, 0, 1)) / 86400000) + 1
}

export function dateFromDayOfYear(year, doy) {
  if (!Number.isFinite(Number(year)) || !Number.isFinite(Number(doy))) return null
  const y = Number(year)
  const n = Math.trunc(Number(doy))
  const max = daysInYear(y)
  if (n < 1 || n > max) return null
  const dt = new Date(Date.UTC(y, 0, n))
  return formatDate(y, dt.getUTCMonth() + 1, dt.getUTCDate())
}

// Keep month/day; Feb 29 -> Feb 28 in a non-leap target year (slider semantics
// only — search paths never clamp).
export function setDateYear(value, year) {
  const p = parseISO(value)
  if (!p || !Number.isFinite(Number(year))) return null
  const y = Math.trunc(Number(year))
  return formatDate(y, p.m, Math.min(p.d, daysInMonth(y, p.m)))
}

export function spelledDate(value) {
  const p = parseISO(value)
  if (!p) return '—'
  return `${MONTHS[p.m - 1]} ${p.d}, ${p.y}`
}

function monthFromName(token) {
  const t = String(token ?? '').toLowerCase().replace(/\.$/, '')
  const abbrIndex = MONTH_ABBR.findIndex((name) => name.toLowerCase() === t || (name.toLowerCase().slice(0, 3) === t && t.length >= 3))
  if (abbrIndex >= 0) return abbrIndex + 1
  return MONTHS.findIndex((name) => name.toLowerCase() === t) + 1 || null
}

function rangeError(iso, min, max) {
  return {
    error: `${iso} is outside the data range.`,
    hint: `Valid range: ${min} to ${max}.`,
  }
}

function dayError(y, m, d) {
  if (m === 2 && d === 29) {
    return {
      error: `February 29, ${y} doesn't exist — ${y} is not a leap year.`,
      hint: 'Leap years are divisible by 4 (2020-02-29 is valid).',
    }
  }
  return {
    error: `${d} is not a day of ${MONTHS[m - 1]} ${y}.`,
    hint: `${MONTHS[m - 1]} ${y} has ${daysInMonth(y, m)} days.`,
  }
}

// parseDateQuery('text', {min, max}) -> {kind:'year'|'month'|'date', y, m, d}
// or {error, hint}. Month/year carry no d; resolveQuery() turns any result
// into a full date + a notice that says what was resolved.
export function parseDateQuery(text, { min, max } = {}) {
  const raw = String(text ?? '').trim().replace(/\s+/g, ' ').replace(/[.,;:]+$/, '')
  if (!raw) return { error: 'Enter a year, month or date.', hint: SHAPE_HINT }
  const hasRange = isValidISO(min) && isValidISO(max)
  const lo = hasRange ? parseISO(min) : null
  const hi = hasRange ? parseISO(max) : null

  const checkYearBounds = (y) => {
    if (!hasRange) return null
    if (y < lo.y) return rangeError(`${y}`, min, max)
    if (y > hi.y) return rangeError(`${y}`, min, max)
    return null
  }

  // 4-digit year alone: 2019
  if (/^\d{4}$/.test(raw)) {
    const y = Number(raw)
    const bad = checkYearBounds(y)
    if (bad) return bad
    return { kind: 'year', y }
  }

  // ISO month: 2019-04
  const monthMatch = /^(\d{4})-(\d{1,2})$/.exec(raw)
  if (monthMatch) {
    const y = Number(monthMatch[1])
    const m = Number(monthMatch[2])
    if (m < 1 || m > 12) {
      return { error: `${m} is not a month.`, hint: 'Months run 1–12; use 2019-04 for April 2019.' }
    }
    const bad = checkYearBounds(y)
    if (bad) return bad
    return { kind: 'month', y, m }
  }

  // ISO date: 2019-04-23
  const dateMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(raw)
  if (dateMatch) {
    const y = Number(dateMatch[1])
    const m = Number(dateMatch[2])
    const d = Number(dateMatch[3])
    if (m < 1 || m > 12) return { error: `${m} is not a month.`, hint: 'Months run 1–12.' }
    const dim = daysInMonth(y, m)
    if (d < 1 || d > dim) return dayError(y, m, d)
    const iso = formatDate(y, m, d)
    if (hasRange && (compareDates(iso, min) < 0 || compareDates(iso, max) > 0)) {
      return rangeError(iso, min, max)
    }
    return { kind: 'date', y, m, d }
  }

  // Slash/dot all-numeric: d/m/y vs m/d/y is unknowable — never guess.
  if (/[/]/.test(raw) || (/\./.test(raw) && /^\d/.test(raw))) {
    if (/^\d{1,4}\s*[/.]\s*\d{1,2}\s*[/.]\s*\d{1,4}$/.test(raw)) {
      return { error: 'That numeric date is ambiguous — day/month order is unclear.', hint: AMBIGUOUS_HINT }
    }
  }

  const tokens = raw.replace(/,/g, ' ').split(' ').filter(Boolean)
  const numericOnly = tokens.every((t) => /^\d+$/.test(t))

  if (tokens.length === 2) {
    const month = monthFromName(tokens[0])
    const y = /^\d{4}$/.test(tokens[1]) ? Number(tokens[1]) : null
    if (month && y != null) {
      const bad = checkYearBounds(y)
      if (bad) return bad
      return { kind: 'month', y, m: month }
    }
    if (numericOnly) return { error: 'That numeric date is ambiguous — day/month order is unclear.', hint: AMBIGUOUS_HINT }
    return { error: `Couldn't read "${raw}".`, hint: SHAPE_HINT }
  }

  if (tokens.length === 3) {
    if (numericOnly) {
      return { error: 'That numeric date is ambiguous — day/month order is unclear.', hint: AMBIGUOUS_HINT }
    }
    const positions = tokens.map((t, i) => ({ i, month: monthFromName(t) })).filter((x) => x.month)
    if (positions.length === 1) {
      const { i, month } = positions[0]
      const others = [tokens[(i + 1) % 3], tokens[(i + 2) % 3]]
      const yToken = others.find((t) => /^\d{4}$/.test(t))
      const dToken = others.find((t) => /^\d{1,2}$/.test(t) && t !== yToken)
      const y = yToken ? Number(yToken) : null
      const d = dToken ? Number(dToken) : null
      if (y != null && d != null) {
        const dim = daysInMonth(y, month)
        if (d < 1 || d > dim) return dayError(y, month, d)
        const bad = checkYearBounds(y)
        if (bad) return bad
        const iso = formatDate(y, month, d)
        if (hasRange && (compareDates(iso, min) < 0 || compareDates(iso, max) > 0)) {
          return rangeError(iso, min, max)
        }
        return { kind: 'date', y, m: month, d }
      }
    }
    return { error: `Couldn't read "${raw}".`, hint: SHAPE_HINT }
  }

  return { error: `Couldn't read "${raw}".`, hint: SHAPE_HINT }
}

// Resolves a parse result to a full date + the notice the search status shows.
// Year and month both resolve to their first day and say so.
export function resolveQuery(parsed) {
  if (!parsed || parsed.error) return null
  if (parsed.kind === 'date') {
    const iso = formatDate(parsed.y, parsed.m, parsed.d)
    return { iso, notice: `Showing ${spelledDate(iso)}.` }
  }
  if (parsed.kind === 'month') {
    const iso = formatDate(parsed.y, parsed.m, 1)
    return { iso, notice: `Showing ${spelledDate(iso)} — first day of ${MONTHS[parsed.m - 1]} ${parsed.y}.` }
  }
  const iso = formatDate(parsed.y, 1, 1)
  return { iso, notice: `Showing ${spelledDate(iso)} — first day of ${parsed.y}.` }
}
