// Run: node test_engine.mjs  — slice-1 engine check; fails on any assertion.
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { strict as strictAssert } from 'node:assert/strict'
import { loadRegions, findBicol, getRegionStyle, isBicol } from './src/gis/engine.js'
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
// once layer-uhi-terrain ships, and add features/map-controls to Tailwind content.
