// Run: node test_chartData.mjs — dashboard chart aggregation checks; fails on any assertion.
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  dangerBandCounts,
  heatIndexHistogram,
  provinceYearlyMean,
  topDriverShares,
  trendHistogram,
  yearOverYearDelta,
  yearsOf,
} from './src/chartData.js'

const MUNIS = [
  {
    trend: { slope_c_per_year: 0.05 },
    total_danger_days_45y: 3,
    top_drivers: [
      { label: 'Wind (east-west, U10M)', share: 0.5 },
      { label: 'Longitude', share: 0.3 },
    ],
    series: [
      { year: 2024, mean_heat_index_c: 33.0, danger_days: 0 },
      { year: 2025, mean_heat_index_c: 34.0, danger_days: 2 },
    ],
  },
  {
    trend: { slope_c_per_year: 0.04 },
    total_danger_days_45y: 0,
    top_drivers: [{ label: 'Wind (east-west, U10M)', share: 0.4 }],
    series: [
      { year: 2024, mean_heat_index_c: 31.5, danger_days: 0 },
      { year: 2025, mean_heat_index_c: 32.0, danger_days: 0 },
    ],
  },
  {
    trend: { slope_c_per_year: 0.035 },
    total_danger_days_45y: 12,
    top_drivers: [{ label: 'Wind (east-west, U10M)', share: 0.2 }],
    series: [
      { year: 2024, mean_heat_index_c: 35.0, danger_days: 1 },
      { year: 2025, mean_heat_index_c: 36.0, danger_days: 0 },
    ],
  },
]

test('yearsOf collects and sorts every series year', () => {
  assert.deepEqual(yearsOf(MUNIS), [2024, 2025])
  assert.deepEqual(yearsOf([]), [])
  assert.deepEqual(yearsOf(null), [])
})

test('provinceYearlyMean averages heat index and counts danger-day LGUs', () => {
  const rows = provinceYearlyMean(MUNIS)
  assert.equal(rows.length, 2)
  assert.equal(rows[0].year, 2024)
  assert.ok(Math.abs(rows[0].meanHeatIndexC - 33.1666667) < 1e-6)
  assert.equal(rows[0].dangerDayLgus, 1) // only the 3rd LGU had a danger day
  assert.equal(rows[0].nCounted, 3)
  assert.ok(Math.abs(rows[1].meanHeatIndexC - 34.0) < 1e-9)
  assert.equal(rows[1].dangerDayLgus, 1) // only the 1st LGU (2 days)
})

test('yearOverYearDelta converts means into a % change, null when a side is missing', () => {
  const delta = yearOverYearDelta(MUNIS, 2025)
  assert.equal(delta.year, 2025)
  assert.ok(Math.abs(delta.current - 34.0) < 1e-9)
  assert.ok(Math.abs(delta.previous - 99.5 / 3) < 1e-12)
  const expected = ((34.0 - 99.5 / 3) / (99.5 / 3)) * 100
  assert.ok(Math.abs(delta.deltaPct - expected) < 1e-12)
  assert.equal(yearOverYearDelta(MUNIS, 1981), null) // no 1980 series
})

test('heatIndexHistogram bins the selected year on the map YEAR breaks', () => {
  const bins = heatIndexHistogram(MUNIS, 2025)
  // YEAR_BREAKS = [31, 32, 33, 34, 35, 36.5] -> 5 bins
  assert.equal(bins.length, 5)
  // Map-ramp convention: a value on an upper break (34.0) pairs with the bin below.
  assert.deepEqual(bins.map((b) => b.count), [1, 0, 1, 0, 1]) // 32 -> 31–32, 34 -> 33–34, 36 -> 35–36.5 (clamped below 36.5)
  assert.equal(bins[4].label, '35+') // same label convention as the map legend
  assert.equal(bins[0].label, '31–32')
  assert.deepEqual(heatIndexHistogram(MUNIS, 1981).map((b) => b.count), [0, 0, 0, 0, 0])
})

test('trendHistogram bins slopes on the map TREND breaks with 3-decimal labels', () => {
  const bins = trendHistogram(MUNIS)
  assert.deepEqual(bins.map((b) => b.count), [1, 1, 1, 0, 0]) // .035 -> b0, .04 -> b1, .05 -> b2
  assert.equal(bins[0].label, '0.030–0.037')
  assert.equal(bins[4].label, '0.058+')
})

test('dangerBandCounts groups the 45-year totals into plain bands', () => {
  const bands = dangerBandCounts(MUNIS)
  assert.deepEqual(
    bands.map((b) => b.label),
    ['0 days', '1–5', '6–10', '11+'],
  )
  assert.deepEqual(bands.map((b) => b.count), [1, 1, 0, 1])
  assert.deepEqual(dangerBandCounts([]).map((b) => b.count), [0, 0, 0, 0])
})

test('topDriverShares averages SHAP shares per label and ranks by mean', () => {
  const drivers = topDriverShares(MUNIS)
  assert.equal(drivers.length, 2)
  assert.equal(drivers[0].label, 'Wind (east-west, U10M)')
  assert.ok(Math.abs(drivers[0].meanShare - 0.3666667) < 1e-6)
  assert.equal(drivers[0].lgus, 3)
  assert.equal(drivers[1].label, 'Longitude')
  assert.equal(drivers[1].lgus, 1)
  assert.equal(topDriverShares([]).length, 0)
  // limit respected
  assert.deepEqual(topDriverShares(MUNIS, 1).length, 1)
})

test('nothing throws on missing or malformed records', () => {
  const junk = [{}, { series: null }, { series: [{ year: 'x' }], trend: { slope_c_per_year: 'x' }, top_drivers: [null] }]
  yearsOf(junk)
  provinceYearlyMean(junk)
  heatIndexHistogram(junk, 2025)
  trendHistogram(junk)
  dangerBandCounts(junk)
  topDriverShares(junk)
  yearOverYearDelta(junk, 2025)
})
