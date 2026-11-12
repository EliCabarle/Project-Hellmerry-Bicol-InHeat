// Projection math for the finder outline cards. Run: node test_outlinePath.mjs
import assert from 'node:assert/strict'
import { buildOutlineIndex, projectGeometry } from './src/outlinePath.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`  ok ${pass} - ${name}`)
}

// 1. Y-flip: north (max lat) must map to the TOP of the SVG (small y).
const square = { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] }
const proj = projectGeometry(square)
const pointsOf = (d) =>
  (d.match(/[ML][^MLZ]*/g) ?? []).map((token) => token.slice(1).trim().split(/\s+/).map(Number))
const ys = pointsOf(proj.d).map(([x, y]) => y)
assert.equal(Math.min(...ys), 6, `north should sit at y=PAD, got ${Math.min(...ys)}`)
assert.equal(Math.max(...ys), 94, 'south should sit at y=100-PAD')
ok('y-flip puts max latitude at the top of the viewBox')

// 2. Square with pad 6 fills 6..94 on both axes.
const xs = pointsOf(proj.d).map(([x, y]) => x)
assert.equal(Math.min(...xs), 6)
assert.equal(Math.max(...xs), 94)
ok('bbox scaled to fill the padded viewBox')

// 3. MultiPolygon -> one subpath per polygon (M ... Z twice).
const multi = {
  type: 'MultiPolygon',
  coordinates: [
    [[[0, 0], [5, 0], [5, 5], [0, 5], [0, 0]]],
    [[[20, 20], [25, 20], [25, 25], [20, 25], [20, 20]]],
  ],
}
const multiProj = projectGeometry(multi)
assert.equal(multiProj.d.match(/Z/g)?.length, 2, `expected 2 subpaths, got ${multiProj.d.match(/Z/g)?.length}`)
ok('MultiPolygon emits one subpath per polygon')

// 4. Degenerate geometry never emits NaN.
const degenerate = projectGeometry({ type: 'Polygon', coordinates: [[[5, 5], [5, 5], [5, 5]]] })
assert.ok(!/NaN|Infinity/.test(degenerate.d), `degenerate emitted non-finite: ${degenerate.d}`)
assert.ok(degenerate.d.startsWith('M'), 'degenerate path still starts with M')
ok('degenerate bbox centres without NaN')

// 5. Empty geometry -> empty path, valid viewBox.
const empty = projectGeometry(null)
assert.equal(empty.d, '')
assert.equal(empty.viewBox, '0 0 100 100')
ok('null geometry yields empty path')

// 6. buildOutlineIndex keys by featureKey and skips duplicates.
const geojson = {
  features: [
    { properties: { adm3_en: 'Bato', province: 'Camarines Sur' }, geometry: square },
    { properties: { adm3_en: 'Bato', province: 'Catanduanes' }, geometry: multi },
  ],
}
const idx = buildOutlineIndex(geojson)
assert.equal(idx.size, 2, `two province-qualified keys expected, got ${idx.size}`)
assert.ok(idx.has('bato|camarines sur'))
assert.ok(idx.has('bato|catanduanes'))
ok('index keys are province-qualified (Bato two-province tripwire)')

console.log(`OUTLINE TESTS PASSED (${pass})`)
