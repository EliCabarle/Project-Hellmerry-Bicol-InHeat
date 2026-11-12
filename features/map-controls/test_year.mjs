// Run: node test_year.mjs — colour ramp + year-view checks; fails on any assertion.
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { strict as strictAssert } from 'node:assert/strict'
import { getMunicipalityStyle, joinNarratives } from './src/gis/engine.js'
import {
  recordForYear,
  trendColor,
  trendLegend,
  yearColor,
  yearLegend,
  YEAR_MAX,
  YEAR_MIN,
} from './src/gis/yearRamp.js'

test('year colours clamp to the fixed 31.0–36.5 °C domain', () => {
  strictAssert.equal(yearColor(YEAR_MIN), '#fde68a')
  strictAssert.equal(yearColor(YEAR_MAX), '#b91c1c')
  strictAssert.equal(yearColor(30), '#fde68a', 'below domain clamps to first bin')
  strictAssert.equal(yearColor(40), '#b91c1c', 'above domain clamps to last bin')
  strictAssert.equal(yearColor(NaN), null)
  strictAssert.equal(yearLegend().length, 5)
})

test('trend colours only apply to positive slopes and clamp to the rate domain', () => {
  strictAssert.equal(trendColor(-0.01), null)
  strictAssert.equal(trendColor(0), null)
  strictAssert.equal(trendColor(0.03), '#fde68a')
  strictAssert.equal(trendColor(0.1), '#b91c1c')
  strictAssert.equal(trendLegend().length, 5)
})

test('recordForYear finds the annual row without inventing data', () => {
  const series = [{ year: 1981, mean_heat_index_c: 33.3 }, { year: 2025, mean_heat_index_c: 35.1 }]
  strictAssert.equal(recordForYear(series, 1981).mean_heat_index_c, 33.3)
  strictAssert.equal(recordForYear(series, 2000), null)
  strictAssert.equal(recordForYear(null, 2025), null)
})

const mun = JSON.parse(
  readFileSync(new URL('../../apps/web/public/data/bicol-municipalities.geojson', import.meta.url), 'utf8'),
)
const nar = JSON.parse(
  readFileSync(new URL('../../apps/web/public/data/narratives.json', import.meta.url), 'utf8'),
)

test('year mode changes fill by selected year while keeping the significance border', () => {
  const joined = joinNarratives(mun, nar)
  const feature = joined.features.find((f) => f.properties.adm3_en === 'Aroroy')
  strictAssert.ok(feature, 'fixture municipality exists')
  const first = getMunicipalityStyle(feature, { viewMode: 'year', year: 1981 })
  const last = getMunicipalityStyle(feature, { viewMode: 'year', year: 2025 })
  strictAssert.notEqual(first.fillColor, last.fillColor, 'different years produce different fills')
  strictAssert.equal(first.dashArray, undefined, 'significant trend keeps a solid border')
  strictAssert.equal(first.fillOpacity, 0.62)
})
