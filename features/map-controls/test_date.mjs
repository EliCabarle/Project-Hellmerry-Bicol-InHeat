// Run: node test_date.mjs — calendar model + date search + day-mode store; fails on any assertion.
import test from 'node:test'
import { strict as strictAssert } from 'node:assert/strict'
import {
  AMBIGUOUS_HINT,
  addDays,
  clampDate,
  compareDates,
  dateFromDayOfYear,
  dayOfYear,
  daysInYear,
  formatDate,
  isValidISO,
  parseDateQuery,
  parseISO,
  resolveQuery,
  setDateYear,
  spelledDate,
} from './src/state/dateModel.js'
import { createTimelineStore, timelineStore } from './src/state/timelineStore.js'

const RANGE = { min: '1981-01-01', max: '2025-12-31' }

// --- date math -------------------------------------------------------------

test('parseISO rejects impossible dates instead of clamping', () => {
  strictAssert.equal(parseISO('2019-02-30'), null)
  strictAssert.equal(parseISO('2019-13-01'), null)
  strictAssert.equal(parseISO('2019-4-1'), null, 'zero padding required')
  strictAssert.deepEqual(parseISO('2020-02-29'), { y: 2020, m: 2, d: 29 })
  strictAssert.equal(parseISO('2019-02-29'), null, '2019 is not a leap year')
  strictAssert.equal(isValidISO('1981-01-01'), true)
})

test('formatDate zero-pads and compareDates orders ISO strings', () => {
  strictAssert.equal(formatDate(2019, 4, 3), '2019-04-03')
  strictAssert.equal(compareDates('1981-01-01', '2025-12-31'), -1)
  strictAssert.equal(compareDates('2020-01-01', '2020-01-01'), 0)
  strictAssert.equal(clampDate('1979-06-01', RANGE.min, RANGE.max), RANGE.min)
  strictAssert.equal(clampDate('2030-06-01', RANGE.min, RANGE.max), RANGE.max)
  strictAssert.equal(clampDate('2000-06-01', RANGE.min, RANGE.max), '2000-06-01')
})

test('addDays crosses year boundaries in both directions', () => {
  strictAssert.equal(addDays('2019-12-31', 1), '2020-01-01')
  strictAssert.equal(addDays('1981-01-01', -1), '1980-12-31')
  strictAssert.equal(addDays('2019-06-15', 0), '2019-06-15')
})

test('addDays honours the leap rule in both directions', () => {
  strictAssert.equal(addDays('2020-02-28', 1), '2020-02-29', 'leap forward')
  strictAssert.equal(addDays('2020-02-29', 1), '2020-03-01')
  strictAssert.equal(addDays('2019-02-28', 1), '2019-03-01', 'non-leap skips Feb 29')
  strictAssert.equal(addDays('2020-03-01', -1), '2020-02-29', 'leap backward')
  strictAssert.equal(addDays('2019-03-01', -1), '2019-02-28', 'non-leap backward')
})

test('day-of-year round trip covers leap and non-leap years', () => {
  strictAssert.equal(daysInYear(2020), 366)
  strictAssert.equal(daysInYear(2019), 365)
  strictAssert.equal(dayOfYear('2020-12-31'), 366)
  strictAssert.equal(dayOfYear('2019-12-31'), 365)
  strictAssert.equal(dateFromDayOfYear(2020, 60), '2020-02-29')
  strictAssert.equal(dateFromDayOfYear(2019, 60), '2019-03-01')
  strictAssert.equal(dateFromDayOfYear(2019, 0), null)
  strictAssert.equal(dateFromDayOfYear(2019, 366), null)
})

test('setDateYear keeps month/day and clamps Feb 29 to Feb 28', () => {
  strictAssert.equal(setDateYear('2020-02-29', 2019), '2019-02-28')
  strictAssert.equal(setDateYear('2019-04-23', 2020), '2020-04-23')
})

test('spelledDate renders the UI English form', () => {
  strictAssert.equal(spelledDate('2019-04-23'), 'April 23, 2019')
  strictAssert.equal(spelledDate('2020-02-29'), 'February 29, 2020')
  strictAssert.equal(spelledDate('nonsense'), '—')
})

// --- search ----------------------------------------------------------------

test('search accepts every documented shape', () => {
  const cases = [
    ['2019', { kind: 'year', y: 2019 }],
    ['2019-04', { kind: 'month', y: 2019, m: 4 }],
    ['2019-04-23', { kind: 'date', y: 2019, m: 4, d: 23 }],
    ['Apr 2019', { kind: 'month', y: 2019, m: 4 }],
    ['April 23, 2019', { kind: 'date', y: 2019, m: 4, d: 23 }],
    ['23 Apr 2019', { kind: 'date', y: 2019, m: 4, d: 23 }],
    ['23 april 2019', { kind: 'date', y: 2019, m: 4, d: 23 }],
  ]
  for (const [text, expected] of cases) {
    const parsed = parseDateQuery(text, RANGE)
    strictAssert.deepEqual(parsed, expected, `parse ${JSON.stringify(text)}`)
    const resolved = resolveQuery(parsed)
    strictAssert.ok(isValidISO(resolved.iso), `${text} resolves to a real date`)
    strictAssert.ok(resolved.notice.length > 0, `${text} carries a notice`)
  }
})

test('search resolves partial queries to their first day and says so', () => {
  const year = resolveQuery(parseDateQuery('2019', RANGE))
  strictAssert.equal(year.iso, '2019-01-01')
  strictAssert.match(year.notice, /first day of 2019/)
  const month = resolveQuery(parseDateQuery('2019-04', RANGE))
  strictAssert.equal(month.iso, '2019-04-01')
  strictAssert.match(month.notice, /first day of April 2019/)
  const full = resolveQuery(parseDateQuery('2019-04-23', RANGE))
  strictAssert.equal(full.iso, '2019-04-23')
  strictAssert.match(full.notice, /April 23, 2019/)
})

test('search rejects ambiguity, bad leap days and out-of-range dates', () => {
  const ambiguous = parseDateQuery('23/04/2019', RANGE)
  strictAssert.ok(ambiguous.error, 'slash dates are rejected, never guessed')
  strictAssert.equal(ambiguous.hint, AMBIGUOUS_HINT)

  const leap = parseDateQuery('2019-02-29', RANGE)
  strictAssert.match(leap.error, /not a leap year/)

  const early = parseDateQuery('1979-06-01', RANGE)
  strictAssert.match(early.error, /outside the data range/)
  strictAssert.match(early.hint, /1981-01-01 to 2025-12-31/)

  const late = parseDateQuery('2026', RANGE)
  strictAssert.match(late.error, /outside the data range/)

  const nonsense = parseDateQuery('banana', RANGE)
  strictAssert.ok(nonsense.error)

  const empty = parseDateQuery('   ', RANGE)
  strictAssert.ok(empty.error)

  strictAssert.equal(resolveQuery(leap), null, 'errors never resolve')
})

// --- store: one write path --------------------------------------------------

test('setDate clamps to the data range (one write path)', () => {
  const store = createTimelineStore()
  store.actions.setRange(RANGE.min, RANGE.max)
  store.actions.setDate('2000-06-15')
  strictAssert.equal(store.getState().date, '2000-06-15')
  store.actions.setDate('1979-01-01')
  strictAssert.equal(store.getState().date, RANGE.min, 'clamped low')
  store.actions.setDate('not-a-date')
  strictAssert.equal(store.getState().date, RANGE.min, 'invalid input ignored')
})

test('setRange seeds the default day date from the data, not a constant', () => {
  const store = createTimelineStore()
  store.actions.setRange('2001-01-01', '2003-12-31')
  strictAssert.equal(store.getState().date, '2003-04-15', 'default day is in the latest year')
  strictAssert.equal(store.getState().range.min, '2001-01-01')
})

test('setYear rewrites the date year and seeks the year slider together', () => {
  const store = createTimelineStore({ timestamps: [1981, 2019, 2025] })
  store.actions.setRange(RANGE.min, RANGE.max)
  store.actions.setDate('2019-04-23')
  store.actions.setYear(2025)
  const s = store.getState()
  strictAssert.equal(s.date, '2025-04-23', 'month/day preserved')
  strictAssert.equal(s.index, 2, 'year slider follows')
  store.actions.setYear(1979)
  strictAssert.equal(store.getState().date, '2025-04-23', 'out-of-range year ignored')
  store.actions.setYear(1981)
  strictAssert.equal(store.getState().index, 0)
})

test('stepDay clamps at both ends of the range', () => {
  const store = createTimelineStore()
  store.actions.setRange(RANGE.min, RANGE.max)
  store.actions.setDate(RANGE.max)
  store.actions.stepDay(1)
  strictAssert.equal(store.getState().date, RANGE.max, 'stops at Dec 31 of the range')
  store.actions.setDate(RANGE.min)
  store.actions.stepDay(-1)
  strictAssert.equal(store.getState().date, RANGE.min, 'stops at the range start')
  store.actions.setDate('2025-06-15')
  store.actions.stepDay(7)
  strictAssert.equal(store.getState().date, '2025-06-22')
})

test('dayTick stops at Dec 31 of the selected year and pauses playback', () => {
  const store = createTimelineStore()
  store.actions.setRange(RANGE.min, RANGE.max)
  store.actions.setViewMode('day')
  store.actions.setDate('2025-12-30')
  store.actions.play()
  strictAssert.equal(store.getState().playing, true)
  store.actions.dayTick()
  strictAssert.equal(store.getState().date, '2025-12-31')
  strictAssert.equal(store.getState().playing, true, 'still playing on the last day')
  store.actions.dayTick()
  strictAssert.equal(store.getState().date, '2025-12-31', 'no wrap into the next year')
  strictAssert.equal(store.getState().playing, false, 'playback stopped')
})

test('dayTick stops at Dec 31 even when the range extends past the year', () => {
  const store = createTimelineStore()
  store.actions.setRange('1981-01-01', '2030-12-31')
  store.actions.setViewMode('day')
  store.actions.setDate('2025-12-31')
  store.actions.play()
  store.actions.dayTick()
  strictAssert.equal(store.getState().date, '2025-12-31', 'year-end snap, not 11-13-2026')
  strictAssert.equal(store.getState().playing, false)
})

test('setViewMode pauses playback so the other mode clock cannot run', () => {
  const store = createTimelineStore({ timestamps: [1981, 2025] })
  store.actions.play()
  strictAssert.equal(store.getState().playing, true)
  store.actions.setViewMode('day')
  const s = store.getState()
  strictAssert.equal(s.viewMode, 'day')
  strictAssert.equal(s.playing, false, 'paused on switch')
  store.actions.setViewMode('day')
  strictAssert.equal(store.getState().playing, false, 'no-op switch is safe')
  store.actions.setViewMode('nope')
  strictAssert.equal(store.getState().viewMode, 'day', 'unknown mode ignored')
})

test('one store instance: every action writes the same state and notifies once', () => {
  strictAssert.equal(typeof timelineStore.getState, 'function')
  strictAssert.equal(typeof timelineStore.actions.setDate, 'function')
  let fired = 0
  const off = timelineStore.subscribe(() => {
    fired += 1
  })
  timelineStore.actions.setRange('1981-01-01', '2025-12-31')
  timelineStore.actions.setDate('2000-06-15')
  strictAssert.equal(timelineStore.getState().date, '2000-06-15', 'getState sees the action')
  strictAssert.equal(fired, 2, 'one notification per write, from one state')
  timelineStore.actions.setDate('2000-06-15')
  strictAssert.equal(fired, 2, 'identical write is a no-op')
  off()
  timelineStore.actions.setDate('2001-06-15')
  strictAssert.equal(fired, 2, 'unsubscribe stops notifications')
  // leave the singleton back on a sane default for any later import
  timelineStore.actions.setDate('2025-04-15')
})
