// Run: node test_lift.mjs — 3D depth + hover-lift maths; fails on any assertion.
import test from 'node:test'
import { strict as strictAssert } from 'node:assert/strict'
import { DEPTH_BASE, DEPTH_SPAN, LIFT_RATIO, depthFor, liftFor } from './src/gis/lift.js'
import { TREND_MAX, YEAR_MAX } from './src/gis/yearRamp.js'

const feature = (narrative) => ({ properties: { adm3_en: 'Test', province: 'Test', narrative } })

test('areas without narrative data still get a base depth', () => {
  strictAssert.equal(depthFor(feature(null), 'trend'), DEPTH_BASE)
  strictAssert.equal(depthFor(feature(null), 'year', 2025), DEPTH_BASE)
  strictAssert.equal(depthFor(null, 'trend'), DEPTH_BASE)
})

test('depth grows across the same domain as the fill colour', () => {
  const cold = feature({ series: [{ year: 1981, mean_heat_index_c: 31 }], latest: { year: 1981, mean_heat_index_c: 31 } })
  const hot = feature({ series: [{ year: 2025, mean_heat_index_c: YEAR_MAX }], latest: { year: 2025, mean_heat_index_c: YEAR_MAX } })
  strictAssert.equal(depthFor(cold, 'year', 1981), DEPTH_BASE)
  strictAssert.equal(depthFor(hot, 'year', 2025), DEPTH_BASE + DEPTH_SPAN)
  strictAssert.ok(depthFor(hot, 'year', 2025) > depthFor(cold, 'year', 1981))
})

test('trend depth is clamped to the rate domain, above and below', () => {
  const slow = feature({ trend: { slope_c_per_year: 0 } })
  const fast = feature({ trend: { slope_c_per_year: TREND_MAX + 1 } })
  strictAssert.equal(depthFor(slow, 'trend'), DEPTH_BASE)
  strictAssert.equal(depthFor(fast, 'trend'), DEPTH_BASE + DEPTH_SPAN)
})

test('hover lifts exactly the hovered area, by LIFT_RATIO of its own depth', () => {
  const depth = 6000
  strictAssert.equal(liftFor('bato|cam sur', { hoveredKey: 'bato|cam sur' }, depth), depth * LIFT_RATIO)
  strictAssert.equal(liftFor('naga|cam sur', { hoveredKey: 'bato|cam sur' }, depth), 0)
  strictAssert.equal(liftFor(null, { hoveredKey: null }, depth), 0, 'no hover means no lift')
})

test('selection keeps full lift and never stacks with hover', () => {
  const depth = 9000
  strictAssert.equal(liftFor('naga|cam sur', { selectedKey: 'naga|cam sur' }, depth), depth * LIFT_RATIO)
  strictAssert.equal(
    liftFor('naga|cam sur', { hoveredKey: 'naga|cam sur', selectedKey: 'naga|cam sur' }, depth),
    depth * LIFT_RATIO,
    'hover on the selected area is still one lift, not two',
  )
})
