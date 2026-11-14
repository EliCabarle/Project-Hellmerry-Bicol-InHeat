// Run: node test_engine.mjs  — slice-1 engine check; fails on any assertion.
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { strict as strictAssert } from 'node:assert/strict'
import { loadRegions, findBicol, getRegionStyle, isBicol,
  normalizeName, joinKey, joinNarratives, buildNarrativeIndex,
  getMunicipalityStyle, getRegionOutlineStyle, isCity,
  IDLE_MUNI_FILL_ALPHA } from './src/gis/engine.js'
import {
  PLAYBACK_MS,
  canToggleLayer,
  clampZoom,
  createTimelineStore,
  formatTimestamp,
} from './src/state/timelineStore.js'

const geo = JSON.parse(readFileSync(new URL('./src/data/ph-regions.geojson', import.meta.url), 'utf8'))

const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exit(1)
  }
  console.log('ok:', msg)
}

assert(geo.features.length >= 17, '17 ADM1 regions present')
const bicol = findBicol(geo)
assert(bicol !== null, 'Bicol Region found in boundary file')
assert(isBicol(bicol), 'isBicol() matches the Bicol feature')
assert(/bicol/i.test(bicol.properties.shapeName), 'Bicol name = ' + bicol.properties.shapeName)
const regions = loadRegions(geo)
assert(regions.length === 17, 'loadRegions normalizes all 17')
assert(regions.filter((r) => r.isBicol).length === 1, 'exactly one region flagged as Bicol')
assert(getRegionStyle(bicol).fillColor === '#ef4444' && !isBicol(regions[2].feature),
  'highlight style vs dark style distinct')
assert(bicol.geometry && bicol.geometry.coordinates.length > 0, 'Bicol has geometry')
console.log('ENGINE TESTS PASSED')

// ---- timeline / controls (slice 2) ----
const ISO = ['2019-01-01', '2020-01-01', '2021-01-01', '2022-01-01', '2023-01-01']

test('seek clamps to bounds', () => {
  const store = createTimelineStore({ timestamps: ISO })
  store.actions.seek(-4)
  strictAssert.equal(store.getState().index, 0)
  store.actions.seek(99)
  strictAssert.equal(store.getState().index, ISO.length - 1)
  store.actions.seek(2)
  strictAssert.equal(store.getState().index, 2)
})

test('prev/next step and wrap at the ends', () => {
  const store = createTimelineStore({ timestamps: ISO })
  store.actions.prev()
  strictAssert.equal(store.getState().index, ISO.length - 1, 'prev wraps to last')
  store.actions.next()
  strictAssert.equal(store.getState().index, 0, 'next wraps to first')
  store.actions.next()
  strictAssert.equal(store.getState().index, 1)
})

test('playback state toggles and needs two timestamps', () => {
  const store = createTimelineStore({ timestamps: ISO })
  strictAssert.equal(PLAYBACK_MS, 900)
  store.actions.play()
  strictAssert.equal(store.getState().playing, true)
  store.actions.pause()
  strictAssert.equal(store.getState().playing, false)
  store.actions.toggle()
  strictAssert.equal(store.getState().playing, true)

  const single = createTimelineStore({ timestamps: ['2020-01-01'] })
  single.actions.play()
  strictAssert.equal(single.getState().playing, false, 'one item cannot autoplay')
})

test('subscribers are notified and can unsubscribe', () => {
  const store = createTimelineStore({ timestamps: ISO })
  const seen = []
  const unsubscribe = store.subscribe((state, prev) => seen.push([prev.index, state.index]))
  store.actions.seek(3)
  strictAssert.deepEqual(seen, [[0, 3]])
  unsubscribe()
  store.actions.seek(1)
  strictAssert.equal(seen.length, 1, 'listener removed on unsubscribe')
})

test('layer guard rejects unsupported layers', () => {
  const registry = {
    layers: [
      { id: 'heat', label: 'Heat index', kind: 'heat-index' },
      { id: 'lst', label: 'LST', kind: 'lst', available: false },
    ],
    setActive() {},
  }
  strictAssert.equal(canToggleLayer(registry, 'heat'), true)
  strictAssert.equal(canToggleLayer(registry, 'lst'), false, 'available:false rejected')
  strictAssert.equal(canToggleLayer(registry, 'wind'), false, 'unlisted layer rejected')
  strictAssert.equal(canToggleLayer(registry, 'heat', undefined), true)
  strictAssert.equal(canToggleLayer(null, 'heat'), false, 'no registry and no callback rejected')
  strictAssert.equal(canToggleLayer(null, 'heat', () => {}), true, 'host callback seam accepted')
})

test('zoom is clamped to configurable limits', () => {
  strictAssert.equal(clampZoom(1), 2)
  strictAssert.equal(clampZoom(25), 18)
  strictAssert.equal(clampZoom(9), 9)
  strictAssert.equal(clampZoom(4, 5, 12), 5)
  strictAssert.equal(clampZoom(20, 5, 12), 12)
  strictAssert.equal(clampZoom(NaN), 2)
})

test('valid timestamps produce readable labels and clamp the index', () => {
  const store = createTimelineStore({ timestamps: ISO, index: 4 })
  strictAssert.equal(store.getState().index, 4)
  strictAssert.equal(formatTimestamp(store.getState().timestamps[4]), '2023-01-01')
  strictAssert.equal(formatTimestamp(1981), '1981', 'numeric year label stays as supplied')
  store.actions.setTimestamps(['2020-01-01', '2021-01-01'])
  strictAssert.equal(store.getState().index, 1, 'index clamped after list shrinks')
})

test('invalid, empty and one-item timestamps are safe', () => {
  const store = createTimelineStore({ timestamps: [null, 'not-a-date', NaN, {}, '1981'] })
  strictAssert.deepEqual(store.getState().timestamps, [], 'invalid entries filtered, no invented dates')
  strictAssert.equal(store.getState().index, 0)
  strictAssert.equal(formatTimestamp('nope'), '—')
  strictAssert.equal(formatTimestamp(undefined), '—')
  store.actions.seek(3)
  store.actions.next()
  store.actions.tick()
  strictAssert.equal(store.getState().index, 0, 'actions are no-ops on an empty list')
  store.actions.play()
  strictAssert.equal(store.getState().playing, false)
})

// ---- host integration still required (not testable here) ----
// app shell must pass timestamps from data, provide layerRegistry/onLayerChange
// once layer-uhi-terrain ships. Tailwind features glob shipped in slice 3.

// ---- normalizeName + narrative join (slice 3) ----
test('normalizeName strips city prefixes/suffixes, case and whitespace', () => {
  strictAssert.equal(normalizeName('City of Naga'), 'naga')
  strictAssert.equal(normalizeName('Legazpi'), 'legazpi')
  strictAssert.equal(normalizeName('Sorsogon City'), 'sorsogon')
  strictAssert.equal(normalizeName('CITY OF LIGAO'), 'ligao')
  strictAssert.equal(normalizeName('  City of  Iriga  '), 'iriga')
  strictAssert.equal(normalizeName('Iriga City'), 'iriga')
  strictAssert.equal(normalizeName(''), '')
  strictAssert.equal(normalizeName(null), '')
  strictAssert.equal(normalizeName(undefined), '')
})

test('joinKey is province-qualified (duplicate names across provinces)', () => {
  strictAssert.notEqual(joinKey('Bato', 'Camarines Sur'), joinKey('Bato', 'Catanduanes'))
  strictAssert.notEqual(joinKey('San Fernando', 'Masbate'), joinKey('San Fernando', 'Camarines Sur'))
  strictAssert.equal(joinKey('Naga', undefined), 'naga')
})

const mun = JSON.parse(
  readFileSync(new URL('../../apps/web/public/data/bicol-municipalities.geojson', import.meta.url), 'utf8'),
)
const nar = JSON.parse(
  readFileSync(new URL('../../apps/web/public/data/narratives.json', import.meta.url), 'utf8'),
)

test('municipality boundary file shape', () => {
  strictAssert.equal(mun.features.length, 114)
  for (const f of mun.features) {
    strictAssert.ok(f.properties.adm3_en, 'every feature has adm3_en')
  }
  strictAssert.equal(mun.features.filter((f) => f.properties.geo_level === 'City').length, 7)
  const keys = new Set(mun.features.map((f) => joinKey(f.properties.adm3_en, f.properties.province)))
  strictAssert.equal(keys.size, 114, 'all join keys unique (V2 tripwire)')
})

test('joinNarratives matches all 114 LGUs including the homonyms', () => {
  const joined = joinNarratives(mun, nar)
  const withData = joined.features.filter((f) => f.properties.narrative)
  strictAssert.equal(withData.length, 114, 'every LGU joins its narrative (regen regression tripwire: B2 shipped 112)')
  const byKey = Object.fromEntries(
    withData.map((f) => [joinKey(f.properties.adm3_en, f.properties.province), f.properties.narrative]),
  )
  strictAssert.equal(byKey[joinKey('City of Naga', 'Camarines Sur')].id, 'city-of-naga-camarines-sur')
  strictAssert.equal(byKey[joinKey('City of Sorsogon', 'Sorsogon')].id, 'city-of-sorsogon-sorsogon')
  strictAssert.equal(byKey[joinKey('City of Masbate', 'Masbate')].id, 'city-of-masbate-masbate')
  // the two homonyms + recovered LGUs must exist as DISTINCT joins
  const batoCS = byKey[joinKey('Bato', 'Camarines Sur')]
  const batoCat = byKey[joinKey('Bato', 'Catanduanes')]
  const sfCS = byKey[joinKey('San Fernando', 'Camarines Sur')]
  const sfMas = byKey[joinKey('San Fernando', 'Masbate')]
  strictAssert.ok(batoCS && batoCat && sfCS && sfMas, 'Bato/San Fernando homonyms all join')
  strictAssert.notEqual(batoCS.id, batoCat.id, 'the two Batos have different data')
  strictAssert.notEqual(sfCS.id, sfMas.id, 'the two San Fernandos have different data')
  for (const m of [batoCS, batoCat, sfCS, sfMas]) {
    strictAssert.equal(m.sample.n_years, 45, 'every homonym carries its own 45-year series')
  }
  strictAssert.ok(byKey[joinKey('Sagñay', 'Camarines Sur')], 'Sagñay joins with correct spelling')
  // synthetic un-joined feature gets null (the real 114 all join now)
  const synthetic = { features: [{ properties: { adm3_en: 'Nowhere-not-a-LGU', province: 'X' } }] }
  strictAssert.equal(joinNarratives(synthetic, nar).features[0].properties.narrative, null, 'un-joined feature gets null')
  strictAssert.doesNotThrow(() => joinNarratives(mun, undefined), 'no throw with missing narratives')
  // original objects untouched
  strictAssert.equal(mun.features[0].properties.narrative, undefined, 'input not mutated')
})

test('getMunicipalityStyle distinguishes states', () => {
  const pending = { properties: { adm3_en: 'Bacacay', narrative: null } }
  strictAssert.equal(getMunicipalityStyle(pending).fillOpacity, 0.25, 'pending is faint')
  strictAssert.equal(getMunicipalityStyle(pending).dashArray, undefined)

  const joined = joinNarratives(mun, nar)
  const sig = joined.features.find((f) => f.properties.adm3_en === 'City of Naga')
  const s = getMunicipalityStyle(sig)
  strictAssert.ok(s.weight >= 2, 'significant solid border weight')
  strictAssert.equal(s.dashArray, undefined, 'significant has no dash')

  const nonsig = {
    properties: { adm3_en: 'X', geo_level: 'Mun',
      narrative: { id: 'x', trend: { direction: 'increasing', is_significant: false }, sample: { n_days: 1000 } } },
  }
  const ns = getMunicipalityStyle(nonsig)
  strictAssert.equal(ns.dashArray, '4 3', 'not significant = dashed border')
  strictAssert.ok(ns.fill, 'non-significant still filled — flag, not filter')
  strictAssert.equal(
    ns.fillOpacity,
    IDLE_MUNI_FILL_ALPHA,
    'idle fill is subtle; subdivisions stay hidden until a province is hovered',
  );

  const dec = {
    properties: { adm3_en: 'Y',
      narrative: { id: 'y', trend: { direction: 'decreasing', is_significant: true } } },
  }
  strictAssert.equal(getMunicipalityStyle(dec).fillColor, '#3b82f6', 'decreasing = approved counter-hue blue')

  const sel = getMunicipalityStyle(sig, { selected: true })
  strictAssert.ok(sel.weight > getMunicipalityStyle(sig).weight, 'selected is heavier')
})

test('region outline keeps dark for non-Bicol and outline for Bicol', () => {
  strictAssert.equal(getRegionOutlineStyle(bicol).fill, false)
  strictAssert.equal(getRegionOutlineStyle(regions[2].feature).fillColor, '#1f2937')
  const cityFeature = mun.features.find((f) => f.properties.geo_level === 'City')
  strictAssert.equal(isCity(cityFeature), true)
  strictAssert.equal(isCity({ properties: { geo_level: 'Mun' } }), false)
})
