// Run: node test_viewMode.mjs — Public/Analyst view-mode contract checks.
// The mode toggle was inert because two components read the wrong data shape
// on a raw narratives.json row. These tests pin the real shape so a future
// refactor cannot silently re-break the narration panel.
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

import { changePointCounts, dominantChangePoint, personDaysDanger } from './src/chartData.js'

const DATA_URL = new URL('../../apps/web/public/data/narratives.json', import.meta.url)
const narratives = JSON.parse(readFileSync(DATA_URL, 'utf-8'))
const MUNIS = narratives.municipalities

test('a raw municipality row nests its narration under narration.en', () => {
  const row = MUNIS[0]
  assert.equal(typeof row.narration?.en, 'string')
  assert.ok(row.narration.en.length > 0)
  // The flattened names the narration panel must NOT use.
  assert.equal(row.narrationEn, undefined)
})

test('a raw municipality row carries top_drivers, not drivers', () => {
  const row = MUNIS[0]
  assert.ok(Array.isArray(row.top_drivers))
  assert.ok(row.top_drivers.length > 0)
  assert.equal(row.drivers, undefined)
  // Each driver carries a label and a share — what the SHAP bar renders.
  assert.equal(typeof row.top_drivers[0].label, 'string')
  assert.equal(typeof row.top_drivers[0].share, 'number')
})

test('every municipality exposes a slope 95% CI for the analyst view', () => {
  for (const m of MUNIS) {
    assert.equal(typeof m.trend?.slope_ci_low, 'number', `${m.name} missing slope_ci_low`)
    assert.equal(typeof m.trend?.slope_ci_high, 'number', `${m.name} missing slope_ci_high`)
    assert.ok(m.trend.slope_ci_low <= m.trend.slope_ci_high)
  }
})

test('changePointCounts tallies breaks per year, ignoring rows without one', () => {
  const counts = changePointCounts([
    { trend: { change_point_year: 2012 } },
    { trend: { change_point_year: 2012 } },
    { trend: { change_point_year: 2005 } },
    { trend: {} },
    {},
  ])
  assert.deepEqual(counts, [
    { year: 2005, count: 1 },
    { year: 2012, count: 2 },
  ])
})

test('dominantChangePoint picks the year the most LGUs break at', () => {
  assert.deepEqual(dominantChangePoint(MUNIS), { year: 2012, count: 74 })
})

test('dominantChangePoint returns null when nothing carries a break', () => {
  assert.equal(dominantChangePoint([{ trend: {} }, {}]), null)
  assert.equal(dominantChangePoint([]), null)
})

test('personDaysDanger sums the pipeline exposure across municipalities', () => {
  assert.equal(
    personDaysDanger([{ person_days_danger: 10 }, { person_days_danger: 5 }, {}]),
    15,
  )
  assert.equal(personDaysDanger([]), 0)
  // A null / non-numeric field contributes zero, never NaN.
  assert.equal(personDaysDanger([{ person_days_danger: null }, { person_days_danger: 7 }]), 7)
})

test('the real dataset carries 24.1M person-days of danger', () => {
  const total = personDaysDanger(MUNIS)
  assert.equal(total, 24_105_982)
  assert.equal((total / 1e6).toFixed(1), '24.1')
})

test('meta.period is not usable as years — the series years are authoritative', () => {
  // Guard against a regression to reading meta.period: it currently holds
  // non-year values, which used to print as "-9.2–85.5" on the dashboard.
  const metaStart = String(narratives.meta?.period?.start ?? '')
  assert.ok(!/^\d{4}/.test(metaStart), `meta.period.start unexpectedly looks like a year: ${metaStart}`)
  const years = [...new Set(MUNIS.flatMap((m) => (m.series ?? []).map((r) => r.year)))].sort()
  assert.equal(years[0], 1981)
  assert.equal(years[years.length - 1], 2025)
})
