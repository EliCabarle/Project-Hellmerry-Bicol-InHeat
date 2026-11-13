// Run: node test_metric.mjs  — slice-3 metric layer check; fails on any assertion.
import { readFileSync } from 'node:fs'
import { strict as strictAssert } from 'node:assert/strict'
import {
  metricFor,
  metricSummary,
  colourFor,
  rampFor,
  RAMP,
  MISSING_TINT,
  LEGEND_STOPS,
  SCALE_METHOD,
} from './src/gis/metric.js'
import { joinNarratives } from './src/gis/engine.js'

const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exit(1)
  }
  console.log('ok:', msg)
}

const mun = JSON.parse(
  readFileSync(new URL('../../apps/web/public/data/bicol-municipalities.geojson', import.meta.url), 'utf8'),
)
const nar = JSON.parse(
  readFileSync(new URL('../../apps/web/public/data/narratives.json', import.meta.url), 'utf8'),
)
const joined = joinNarratives(mun, nar)
const features = joined.features

assert(features.length === 114, '114 municipality features joined')

// ---- metricFor shape ----
const sample = features[0]
const m = metricFor(sample, { viewMode: 'trend' })
assert(
  ['value', 'lowConfidence', 'missing', 'label', 'units'].every((k) => k in m),
  'metricFor returns value/lowConfidence/missing/label/units',
)
assert(typeof m.label === 'string' && typeof m.units === 'string', 'metric label + units are strings')
assert(typeof m.lowConfidence === 'boolean' && typeof m.missing === 'boolean', 'flags are booleans')

// narrative-null -> missing
const pending = { properties: { adm3_en: 'Nowhere', narrative: null } }
assert(metricFor(pending, { viewMode: 'trend' }).missing === true, 'null narrative is missing')

// ---- colourFor missing treatment ----
assert(colourFor({ missing: true, value: null }, RAMP) === MISSING_TINT, 'missing -> MISSING_TINT')
assert(colourFor({ missing: false, value: 0.05 }, []) === MISSING_TINT, 'empty ramp -> MISSING_TINT')
assert(MISSING_TINT === '#475569', 'MISSING_TINT is the neutral surface tint')

// ---- ramp: LEGEND_STOPS stops, lightness-monotonic (greyscale-readable) ----
const trendValues = []
for (const f of features) {
  const n = f.properties.narrative
  if (!n) continue
  if (n.trend.direction === 'decreasing') continue
  const mv = metricFor(f, { viewMode: 'trend' })
  if (!mv.missing && Number.isFinite(mv.value)) trendValues.push(mv.value)
}
assert(trendValues.length > 0, 'trend has usable values')
const ramp = rampFor(trendValues, { stops: LEGEND_STOPS, method: SCALE_METHOD })
assert(ramp.length === LEGEND_STOPS, `ramp has ${LEGEND_STOPS} stops`)
const rgb = (hex) => {
  const h = String(hex).replace(/^#/, '')
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
const lights = ramp.map((s) => lum(rgb(s.color)))
for (let i = 1; i < lights.length; i += 1) {
  assert(lights[i] < lights[i - 1] - 0.5, `ramp lightness decreases at stop ${i}`)
}
assert(lights[0] > lights[lights.length - 1], 'ramp spans light to dark')
assert(
  new Set(ramp.map((s) => s.color)).size === ramp.length,
  'ramp stops have distinct colours',
)

// every ramp colour drawn from the project palette (RAMP)
for (const s of ramp) assert(RAMP.includes(s.color), `ramp colour ${s.color} is from project palette`)

// ---- colourFor bands cover the value range ----
const breaks = ramp.map((s) => s.value)
const lo = Math.min(...trendValues)
const hi = Math.max(...trendValues)
assert(breaks[0] <= lo + 1e-9, 'ramp starts at/below min value')
assert(breaks[breaks.length - 1] >= hi - 1e-9 || breaks[breaks.length - 1] <= hi, 'ramp reaches max band')
for (const v of trendValues) {
  const c = colourFor({ missing: false, value: v }, ramp)
  assert(c !== MISSING_TINT, `usable value ${v} gets a ramp colour, not MISSING_TINT`)
}

// ---- metricSummary: no-data count and range match the data exactly ----
const summary = metricSummary(features, { viewMode: 'trend' })
let expectedMissing = 0
const expectedValues = []
for (const f of features) {
  const n = f.properties.narrative
  if (!n) { expectedMissing += 1; continue }
  if (n.trend.direction === 'decreasing') continue
  const mv = metricFor(f, { viewMode: 'trend' })
  if (mv.missing) expectedMissing += 1
  else if (Number.isFinite(mv.value)) expectedValues.push(mv.value)
}
assert(summary.noDataCount === expectedMissing, `no-data count ${summary.noDataCount} == ${expectedMissing}`)
assert(summary.valueCount === expectedValues.length, `value count ${summary.valueCount} == ${expectedValues.length}`)
assert(summary.min === Math.min(...expectedValues), `min ${summary.min} == data min`)
assert(summary.max === Math.max(...expectedValues), `max ${summary.max} == data max`)

// year mode range matches the narrative series for a fixed year
const yearSummary = metricSummary(features, { viewMode: 'year', year: 2025 })
const yearValues = []
let yearMissing = 0
for (const f of features) {
  const n = f.properties.narrative
  const row = n?.series?.find((r) => r.year === 2025) ?? n?.latest
  const v = row?.mean_heat_index_c
  if (!Number.isFinite(v)) { yearMissing += 1; continue }
  yearValues.push(v)
}
assert(yearSummary.noDataCount === yearMissing, `year no-data count ${yearSummary.noDataCount} == ${yearMissing}`)
assert(yearSummary.min === Math.min(...yearValues), 'year min matches data')
assert(yearSummary.max === Math.max(...yearValues), 'year max matches data')

console.log('METRIC TESTS PASSED')
