// Run: node test_lift.mjs — 3D depth + hover-lift maths; fails on any assertion.
import test from 'node:test'
import { strict as strictAssert } from 'node:assert/strict'
import {
  DEPTH_BASE,
  DEPTH_SPAN,
  FLATTEN_3D_MS,
  FLAT_FLOOR_M,
  LIFT_RATIO,
  clearFlatFactors,
  flatHeight,
  flatTarget,
  getFlatFactor,
  depthFor,
  liftFor,
  stepFlats,
  snapFlats,
} from './src/gis/lift.js'
import { TREND_MAX, YEAR_MAX } from './src/gis/yearRamp.js'
import { getMunicipalityStyle, SELECT_COLOUR } from './src/gis/engine.js'

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

test('flatTarget flattens every non-selected area and keeps the selected area elevated', () => {
  const sel = 'bato|cam sur'
  const other = 'naga|cam sur'
  strictAssert.equal(flatTarget(sel, sel), 0, 'selected area stays at flatFactor 0')
  strictAssert.equal(flatTarget(other, sel), 1, 'neighbour flattens to flatFactor 1')
  strictAssert.equal(flatTarget(sel, null), 0, 'no selection: nothing flattens')
  strictAssert.equal(flatTarget(other, null), 0, 'no selection: nothing flattens')
})

test('flatHeight collapses flattened areas to 0 m and keeps the selected area elevated', () => {
  const depth = 6000
  const lift = depth * LIFT_RATIO
  strictAssert.equal(flatHeight(depth, lift, 0), depth + lift, 'selected area at full depth + lift')
  strictAssert.equal(flatHeight(depth, lift, 1), FLAT_FLOOR_M, 'flattened neighbour at 0 m')
  strictAssert.equal(flatHeight(depth, lift, 0.5), (depth + lift) * 0.5, 'partial flatten is linear')
})

test('stepFlats animates non-selected areas to flat, selected stays put, then deselect rises back', () => {
  clearFlatFactors()
  const sel = 'bato|cam sur'
  const other = 'naga|cam sur'
  const keys = [sel, other]
  const base = performance.now()

  // First call arms the animation (start = base, p = 0); subsequent calls advance it.
  stepFlats(base, keys, sel)

  const mid = stepFlats(base + FLATTEN_3D_MS / 2, keys, sel)
  const midOther = mid.changed.get(other)
  strictAssert.ok(midOther > 0 && midOther < 1, 'neighbour mid-flatten')
  strictAssert.ok(mid.active, 'still animating mid-way')
  strictAssert.equal(mid.changed.get(sel), undefined, 'selected area already at target 0, not re-animated')

  const end = stepFlats(base + FLATTEN_3D_MS, keys, sel)
  strictAssert.equal(end.changed.get(other), 1, 'neighbour reaches flat at end')
  strictAssert.equal(getFlatFactor(other), 1)
  strictAssert.equal(end.active, false, 'settled within tolerance, loop stops')

  const b1 = stepFlats(base + 2 * FLATTEN_3D_MS, keys, null)
  strictAssert.equal(b1.changed.get(other), 1, 'first deselect frame holds current value')
  strictAssert.ok(b1.active, 'deselect starts animating back up')

  const b2 = stepFlats(base + 3 * FLATTEN_3D_MS, keys, null)
  strictAssert.equal(b2.changed.get(other), 0, 'neighbour rises back to 0 on deselect')
  strictAssert.equal(getFlatFactor(other), 0)
  strictAssert.equal(b2.active, false, 'fully settled after deselect')
})

test('snapFlats snaps every area to its target in one call (prefers-reduced-motion)', () => {
  clearFlatFactors()
  const sel = 'bato|cam sur'
  const other = 'naga|cam sur'
  const snapped = snapFlats([sel, other], sel)
  strictAssert.equal(snapped.get(sel), 0)
  strictAssert.equal(snapped.get(other), 1)
  strictAssert.equal(getFlatFactor(sel), 0)
  strictAssert.equal(getFlatFactor(other), 1)

  const back = snapFlats([sel, other], null)
  strictAssert.equal(back.get(sel), 0)
  strictAssert.equal(back.get(other), 0)
  strictAssert.equal(getFlatFactor(other), 0)
})

test('selection keeps the exact ramp fill colour; only the border changes to SELECT_COLOUR', () => {
  const f = feature({ trend: { slope_c_per_year: 0.05, is_significant: true } })
  const base = getMunicipalityStyle(f, { selected: false, viewMode: 'trend' })
  const chosen = getMunicipalityStyle(f, { selected: true, viewMode: 'trend' })
  strictAssert.equal(chosen.fillColor, base.fillColor, 'ramp fill colour identical on selection')
  strictAssert.equal(chosen.color, SELECT_COLOUR, 'border becomes the selection colour')
  strictAssert.ok(chosen.weight > base.weight, 'border gets thicker on selection')
})
