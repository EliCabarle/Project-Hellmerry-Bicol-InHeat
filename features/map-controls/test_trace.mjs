// Run: node test_trace.mjs — progressive outline trace maths; fails on any assertion.
import test from 'node:test'
import { strict as strictAssert } from 'node:assert/strict'
import {
  TRACE_MS,
  easeOutCubic,
  measure,
  ribbon,
  ribbonWidthMetres,
  ringsOf,
  rotateToNearest,
  slicePrefix,
} from './src/gis/trace.js'

const square = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
  [0, 0],
]

test('only exterior rings are traced', () => {
  strictAssert.equal(ringsOf({ type: 'Polygon', coordinates: [square, square] }).length, 1)
  strictAssert.equal(
    ringsOf({ type: 'MultiPolygon', coordinates: [[square, square], [square]] }).length,
    2,
    'one ring per polygon part, holes ignored',
  )
  strictAssert.equal(ringsOf(null).length, 0)
})

test('measure returns the full boundary length', () => {
  strictAssert.equal(measure([square]), 4)
  strictAssert.equal(measure([square, square]), 8, 'every ring counts')
})

test('trace starts at the vertex nearest the previous camera centre', () => {
  const [rotated] = rotateToNearest([square], [0.9, 1.1])
  strictAssert.deepEqual(rotated[0], [1, 1])
  strictAssert.deepEqual(rotated[rotated.length - 1], [1, 1], 'ring stays closed')
  strictAssert.equal(rotated.length, square.length, 'no vertex is lost')
  strictAssert.deepEqual(rotateToNearest([square], null), [square], 'no centre means no rotation')
})

test('a prefix is a growing slice of the ring, never longer than the ring', () => {
  const rings = rotateToNearest([square], [0, 0])
  strictAssert.deepEqual(slicePrefix(rings, 0), [[[0, 0]]], 'nothing revealed at zero')
  strictAssert.deepEqual(slicePrefix(rings, 0.5)[0].at(-1), [0.5, 0], 'interpolated mid-segment')
  strictAssert.deepEqual(slicePrefix(rings, 4)[0], square, 'full length is the whole ring')
  strictAssert.deepEqual(slicePrefix(rings, 99)[0], square, 'clamped at the full ring')
})

test('ribbon emits one closed quad per revealed segment, at the requested width', () => {
  const quads = ribbon([[[0, 0], [0.001, 0]]], 111.32, 0)
  strictAssert.equal(quads.length, 1)
  const ring = quads[0][0]
  strictAssert.deepEqual(ring[0], ring.at(-1), 'quad is closed')
  const north = Math.max(...ring.map((p) => p[1]))
  const south = Math.min(...ring.map((p) => p[1]))
  strictAssert.ok(Math.abs((north - south) * 110540 - 111.32) < 0.01, 'quad is one width across')
  strictAssert.equal(ribbon([[[0, 0], [0, 0]]], 100, 0).length, 0, 'zero-length segment draws nothing')
})

test('the ribbon keeps its screen width as zoom changes', () => {
  const at8 = ribbonWidthMetres(13.3, 8)
  strictAssert.ok(Math.abs(at8 / ribbonWidthMetres(13.3, 9) - 2) < 1e-9, 'halves per zoom level')
  strictAssert.ok(ribbonWidthMetres(13.3, 11) > 10, 'wide enough to see at the default view')
})

test('easing is monotonic, ends where it should, and finishes inside the camera settle', () => {
  strictAssert.equal(easeOutCubic(0), 0)
  strictAssert.equal(easeOutCubic(1), 1)
  strictAssert.ok(easeOutCubic(0.5) > 0.5, 'ease-out front-loads the reveal')
  strictAssert.ok(TRACE_MS < 700, 'complete before the 700 ms camera settle')
})
