// Run: node test_daily.mjs — daily loader, PAGASA day ramp, day styling; fails on any assertion.
// Every fixture here is SYNTHETIC and in-memory — nothing is written to public/.
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { strict as strictAssert } from 'node:assert/strict'
import { DAILY_MISSING_REASON, createDailyStore, valuesForDay } from './src/data/dailyStore.js'
import { DAY_BANDS, DAY_NO_DATA, dayBand, dayColor, dayLegend } from './src/gis/yearRamp.js'
import { getMunicipalityStyle, joinNarratives, IDLE_MUNI_FILL_ALPHA } from './src/gis/engine.js'
import { tooltipHtml } from './src/components/municipalityTooltip.js'

// --- synthetic fixture builders --------------------------------------------

const IDS = ['alpha', 'beta', 'gamma']

const SYNTH_INDEX = {
  start: '1981-01-01',
  end: '2025-12-31',
  years: [2015, 2025],
  ids: IDS,
  scale: 0.1,
  variable: 'heat_index_max_c',
  units: '°C',
  method: 'synthetic test fixture',
  generated_at: '2026-01-01T00:00:00Z',
}

// rows are ints in tenths of °C, null = missing (contract)
const synthYear = (year, firstValue) => ({
  year,
  start: `${year}-01-01`,
  n_days: 3,
  v: [
    [firstValue, 300, null],
    [271, null, 515],
    [null, null, null],
  ],
})

function makeFetch(routes) {
  const calls = []
  const fetchImpl = async (url) => {
    calls.push(url)
    const route = routes[url]
    if (!route) return { ok: false, status: 404, json: async () => ({}) }
    if (route.delay) await new Promise((r) => setTimeout(r, route.delay))
    return { ok: true, status: 200, json: async () => route.body }
  }
  return { fetchImpl, calls }
}

const baseUrl = 'https://synthetic.test'
const urlFor = (path) => `${baseUrl}/${path}`

// --- loader -----------------------------------------------------------------

test('index + year load and valuesForDay scales tenths to °C', async () => {
  const { fetchImpl, calls } = makeFetch({
    [urlFor('data/daily/index.json')]: { body: SYNTH_INDEX },
    [urlFor('data/daily/2025.json')]: { body: synthYear(2025, 423) },
  })
  const store = createDailyStore({ fetchImpl, baseUrl })
  const idx = await store.loadIndex()
  strictAssert.equal(idx.status, 'ready')
  strictAssert.deepEqual(idx.meta.years, [2015, 2025])
  const year = await store.loadYear(2025)
  strictAssert.equal(year.status, 'ready')

  const day0 = valuesForDay(year.file, 0, IDS, idx.meta.scale)
  strictAssert.equal(day0.get('alpha'), 42.3, '423 tenths -> 42.3 °C')
  strictAssert.equal(day0.get('beta'), 27.1)
  strictAssert.equal(day0.get('gamma'), null, 'null stays null')
  strictAssert.equal(valuesForDay(year.file, 2, IDS, 0.1).get('alpha'), null, 'missing that day')
  strictAssert.equal(valuesForDay(year.file, -1, IDS, 0.1), null, 'negative day index rejected')
  strictAssert.equal(valuesForDay(year.file, 1.5, IDS, 0.1), null, 'non-integer day index rejected')
  strictAssert.equal(valuesForDay(null, 0, IDS, 0.1), null)
  strictAssert.equal(valuesForDay(year.file, 0, null, 0.1), null)
  strictAssert.equal(calls.length, 2)
})

test('index 404 → missing state with the exact visible reason', async () => {
  const { fetchImpl } = makeFetch({})
  const store = createDailyStore({ fetchImpl, baseUrl })
  const idx = await store.loadIndex()
  strictAssert.equal(idx.status, 'missing')
  strictAssert.equal(idx.reason, "Daily data isn't in this build")
  strictAssert.equal(idx.reason, DAILY_MISSING_REASON)
  const again = await store.loadIndex()
  strictAssert.equal(again.status, 'missing', 'missing is memoised — one fetch total')
})

test('year 404 → that year is missing, others unaffected', async () => {
  const { fetchImpl } = makeFetch({ [urlFor('data/daily/2025.json')]: { body: synthYear(2025, 423) } })
  const store = createDailyStore({ fetchImpl, baseUrl })
  const gone = await store.loadYear(1999)
  strictAssert.equal(gone.status, 'missing')
  strictAssert.equal(gone.error, DAILY_MISSING_REASON)
  const ok = await store.loadYear(2025)
  strictAssert.equal(ok.status, 'ready')
  strictAssert.equal(store.getYearState(1999).status, 'missing')
  strictAssert.equal(store.getYearState(1980).status, 'idle', 'never requested years stay idle')
})

test('malformed index becomes an error state, never a throw', async () => {
  const { fetchImpl } = makeFetch({ [urlFor('data/daily/index.json')]: { body: { years: 'nope' } } })
  const store = createDailyStore({ fetchImpl, baseUrl })
  const idx = await store.loadIndex()
  strictAssert.equal(idx.status, 'error')
  strictAssert.ok(idx.error, 'error text kept for diagnostics')
})

test('LRU keeps at most 3 years; repeats and cache hits fetch nothing', async () => {
  const routes = {}
  for (const y of [2015, 2016, 2017, 2018, 2019]) routes[urlFor(`data/daily/${y}.json`)] = { body: synthYear(y, 400) }
  const { fetchImpl, calls } = makeFetch(routes)
  const store = createDailyStore({ fetchImpl, baseUrl })
  await store.loadIndex()
  const indexFetches = calls.length

  for (const y of [2015, 2016, 2017, 2018]) await store.loadYear(y)
  strictAssert.equal(store.getState().cachedYears, 3, 'never precache all years')
  await store.loadYear(2017)
  strictAssert.equal(calls.length, indexFetches + 4, 'cache hit → zero fetches')
  await store.loadYear(2018)
  strictAssert.equal(calls.length, indexFetches + 4, 'repeat load → zero fetches')

  await store.loadYear(2019)
  strictAssert.equal(store.getState().cachedYears, 3, 'still capped after 5 distinct years')
  await store.loadYear(2015)
  strictAssert.equal(calls.length, indexFetches + 6, 'evicted year refetches')
})

test('concurrent same-year requests share one in-flight fetch', async () => {
  const { fetchImpl, calls } = makeFetch({
    [urlFor('data/daily/2030.json')]: { body: synthYear(2030, 423), delay: 20 },
  })
  const store = createDailyStore({ fetchImpl, baseUrl })
  const [a, b] = await Promise.all([store.loadYear(2030), store.loadYear(2030)])
  strictAssert.equal(calls.length, 1, 'one network request for two callers')
  strictAssert.equal(a.status, 'ready')
  strictAssert.equal(b.status, 'ready')
})

test('slow 2015 and fast 2025 load concurrently without clobbering', async () => {
  const { fetchImpl } = makeFetch({
    [urlFor('data/daily/2015.json')]: { body: synthYear(2015, 111), delay: 40 },
    [urlFor('data/daily/2025.json')]: { body: synthYear(2025, 222), delay: 0 },
  })
  const store = createDailyStore({ fetchImpl, baseUrl })
  const [slow, fast] = await Promise.all([store.loadYear(2015), store.loadYear(2025)])
  strictAssert.equal(slow.status, 'ready')
  strictAssert.equal(fast.status, 'ready')
  strictAssert.equal(store.getYearState(2015).file.v[0][0], 111, 'slow year keeps its own data')
  strictAssert.equal(store.getYearState(2025).file.v[0][0], 222, 'fast year keeps its own data')
})

// --- PAGASA day ramp --------------------------------------------------------

const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  const f = (v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255)
}

test('dayBand classifies band floors with >= exactly like the pipeline', () => {
  strictAssert.equal(dayBand(42.0), 'Danger', '42.0 is a danger day (>= DANGER_C)')
  strictAssert.equal(dayBand(41.9), 'Extreme Caution')
  strictAssert.equal(dayBand(33.0), 'Extreme Caution')
  strictAssert.equal(dayBand(32.9), 'Caution')
  strictAssert.equal(dayBand(27.0), 'Caution')
  strictAssert.equal(dayBand(26.9), 'Below Caution')
  strictAssert.equal(dayBand(52.0), 'Extreme Danger')
  strictAssert.equal(dayBand(NaN), null, 'missing is never a band')
  strictAssert.equal(dayBand(null), null)
  // classification agrees with the displayed one-decimal value
  strictAssert.equal(dayBand(41.96), 'Danger', 'rounds to 42.0 before classifying')
})

test('dayColor maps every band and the no-data veil is never a band colour', () => {
  for (const band of DAY_BANDS) {
    strictAssert.equal(dayColor(band.min === -Infinity ? 20 : band.min), band.color, band.label)
  }
  strictAssert.notEqual(DAY_NO_DATA, dayColor(27), 'no-data differs from Caution')
  for (const band of DAY_BANDS) strictAssert.notEqual(DAY_NO_DATA, band.color)
  strictAssert.equal(dayColor(null), null)
})

test('day ramp lightness is monotonic and adjacent contrast is the 5-band ceiling', () => {
  const ordered = [...DAY_BANDS].reverse() // mild → extreme
  const ls = ordered.map((b) => lum(b.color))
  for (let i = 0; i < ls.length - 1; i += 1) {
    strictAssert.ok(ls[i] > ls[i + 1], `lightness strictly decreases at band ${i}`)
  }
  const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  for (let i = 0; i < ls.length - 1; i += 1) {
    const r = ratio(ls[i], ls[i + 1])
    strictAssert.ok(r >= 2.0 && r <= 2.15, `adjacent contrast ${r.toFixed(2)} inside the WCAG ceiling for 5 bands`)
  }
})

test('dayLegend carries all five bands plus the no-data row', () => {
  const rows = dayLegend()
  strictAssert.equal(rows.length, 6)
  strictAssert.equal(rows[5].label, 'No data for this day')
  strictAssert.equal(rows[5].color, DAY_NO_DATA)
  strictAssert.ok(rows.some((r) => r.label.includes('42–51 Danger')))
  strictAssert.ok(rows.some((r) => r.label.includes('≥52 Extreme Danger')))
})

// --- day styling on the real fixtures ---------------------------------------

const mun = JSON.parse(
  readFileSync(new URL('../../apps/web/public/data/bicol-municipalities.geojson', import.meta.url), 'utf8'),
)
const nar = JSON.parse(
  readFileSync(new URL('../../apps/web/public/data/narratives.json', import.meta.url), 'utf8'),
)
const joined = joinNarratives(mun, nar)
const feature = joined.features.find((f) => f.properties.adm3_en === 'Aroroy')
const narId = feature?.properties?.narrative?.id

test('day mode styles by daily value; missing day gets the no-data veil', () => {
  strictAssert.ok(narId, 'fixture municipality has a narrative id')
  const hot = getMunicipalityStyle(feature, { viewMode: 'day', dayValues: new Map([[narId, 42.0]]) })
  strictAssert.equal(hot.fillColor, dayColor(42.0), 'Danger fill at the 42.0 floor')
  strictAssert.equal(hot.fillOpacity, IDLE_MUNI_FILL_ALPHA)

  const noId = getMunicipalityStyle(feature, { viewMode: 'day', dayValues: new Map() })
  strictAssert.equal(noId.fillColor, DAY_NO_DATA, 'unlisted municipality is no-data, not a band')

  const nullDay = getMunicipalityStyle(feature, { viewMode: 'day', dayValues: new Map([[narId, null]]) })
  strictAssert.equal(nullDay.fillColor, DAY_NO_DATA, 'null measurement is no-data, not a band')

  const noMap = getMunicipalityStyle(feature, { viewMode: 'day' })
  strictAssert.equal(noMap.fillColor, DAY_NO_DATA, 'no values yet → no-data veil')
})

test('significance border survives into day mode (flag, not filter)', () => {
  // Fixtures are all significant; clone one to exercise the non-significant path.
  const nonSig = structuredClone(feature)
  nonSig.properties.narrative.trend.is_significant = false
  const style = getMunicipalityStyle(nonSig, {
    viewMode: 'day',
    dayValues: new Map([[narId, 30.0]]),
  })
  strictAssert.equal(style.dashArray, '4 3', 'non-significant stays dashed')
  strictAssert.equal(style.color, '#cbd5e1')
  strictAssert.equal(style.fillColor, dayColor(30.0), 'and still gets its daily fill')

  const trendStyle = getMunicipalityStyle(nonSig, { viewMode: 'trend' })
  strictAssert.equal(trendStyle.dashArray, '4 3', 'trend mode unchanged')
  const dayMissing = getMunicipalityStyle(nonSig, { viewMode: 'day', dayValues: new Map() })
  strictAssert.equal(dayMissing.dashArray, '4 3', 'flag renders in day mode even with no data')
})

test('day fill never equals the trend fill (different ramps)', () => {
  const day = getMunicipalityStyle(feature, { viewMode: 'day', dayValues: new Map([[narId, 35.0]]) })
  const trend = getMunicipalityStyle(feature, { viewMode: 'trend' })
  strictAssert.notEqual(day.fillColor, trend.fillColor)
})

test('day tooltip shows the date, value, band and 1-day sample; trend branch unchanged', () => {
  const hot = tooltipHtml(feature, {
    viewMode: 'day',
    date: '2025-04-15',
    dayValues: new Map([[narId, 42.0]]),
  })
  strictAssert.match(hot, /April 15, 2025/)
  strictAssert.match(hot, /42\.0 °C/)
  strictAssert.match(hot, /Danger/)
  strictAssert.match(hot, /Sample: 1 day/)

  const missing = tooltipHtml(feature, { viewMode: 'day', date: '2025-04-15', dayValues: new Map() })
  strictAssert.match(missing, /No data for this day/)

  const trend = tooltipHtml(feature, { year: 2025 })
  strictAssert.doesNotMatch(trend, /Sample: 1 day/, 'trend branch keeps its multi-day sample')
  strictAssert.doesNotMatch(trend, /April 15, 2025/)
})

test('population density and people icon appear in day and trend tooltips', () => {
  const withDensity = structuredClone(feature)
  withDensity.properties.narrative.population_density = 1234.56

  for (const tooltip of [
    tooltipHtml(withDensity, { viewMode: 'day', date: '2025-04-15', dayValues: new Map() }),
    tooltipHtml(withDensity, { year: 2025 }),
  ]) {
    strictAssert.match(tooltip, /Population density \(2020\): <b>1,234\.6 people\/km²<\/b>/)
    strictAssert.match(tooltip, /bih-tip__population-icon/)
  }

  withDensity.properties.narrative.population_density = null
  strictAssert.doesNotMatch(tooltipHtml(withDensity, { year: 2025 }), /Population density/)
})
