// Finder card data layer. Run: node test_finderData.mjs
// Integration part reads the real shipped data files (read-only) to prove the
// 114/114 join and derived province counts, mirroring the pipeline outputs.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { provincesOf, countByProvince, joinCards, outlineStroke } from './src/finderData.js'

const here = fileURLToPath(new URL('.', import.meta.url))
const narratives = JSON.parse(
  readFileSync(join(here, '../../apps/web/public/data/narratives.json'), 'utf8'),
)
const geojson = JSON.parse(
  readFileSync(join(here, '../../apps/web/public/data/bicol-municipalities.geojson'), 'utf8'),
)

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`  ok ${pass} - ${name}`)
}

// 1. Provinces derived from data, not hardcoded; counts sum to the LGU total.
const provinces = provincesOf(narratives.municipalities)
assert.deepEqual(provinces, [
  'Albay',
  'Camarines Norte',
  'Camarines Sur',
  'Catanduanes',
  'Masbate',
  'Sorsogon',
])
const counts = countByProvince(narratives.municipalities)
const total = [...counts.values()].reduce((a, b) => a + b, 0)
assert.equal(total, narratives.municipalities.length)
assert.equal(counts.get('Albay'), 18)
assert.equal(counts.get('Camarines Sur'), 37)
ok('province list derived with verified counts (Albay 18, Cam Sur 37, …)')

// 2. Full join coverage: every feature joins, every card has an outline path.
const all = joinCards(geojson, narratives, null)
assert.equal(all.length, geojson.features.length, 'card count must equal feature count')
assert.ok(all.every((c) => c.outline?.d?.startsWith('M')), 'every card has an outline path')
assert.ok(all.every((c) => c.trend && c.narrationEn), 'every card joins a narrative entry')
ok(`all ${all.length} cards join geojson <-> narratives with outlines`)

// 3. Alphabetical browsing order, province filter actually filters.
assert.deepEqual(
  all.map((c) => c.name),
  [...all.map((c) => c.name)].sort((a, b) => a.localeCompare(b)),
)
const albay = joinCards(geojson, narratives, 'Albay')
assert.equal(albay.length, 18)
assert.ok(albay.every((c) => c.province === 'Albay'))
ok('alphabetical order + province filter returns exactly Albay 18')

// 4. Drivers capped at top 3; card data carries the "why".
const withDrivers = all.filter((c) => c.drivers.length > 0)
assert.ok(withDrivers.length > 100, 'driver data expected for nearly every LGU')
assert.ok(withDrivers.every((c) => c.drivers.length <= 3))
assert.ok(
  withDrivers.every((c) =>
    c.drivers.every((d) => Number.isFinite(d.mean_abs_shap) && Number.isFinite(d.share)),
  ),
)
ok('top_drivers sliced to 3 with numeric share/SHAP')

// 5. Null-narrative fallback (flag, not filter) on synthetic data.
const syntheticNarratives = { municipalities: [{ id: 'aroroy', name: 'Aroroy', province: 'Masbate', trend: { slope_c_per_year: 0.04, direction: 'increasing' } }] }
const syntheticGeo = { features: [{ properties: { adm3_en: 'Aroroy', province: 'Masbate' }, geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] } }] }
const [card] = joinCards(syntheticGeo, syntheticNarratives, 'Masbate')
assert.equal(card.trend.direction, 'increasing')
assert.equal(card.narrationEn, null)
assert.equal(card.drivers.length, 0)
ok('card survives a narrative without narration/drivers')

// 6. Missing narrative entirely -> outline card with null trend (never filtered out).
const [orphan] = joinCards(syntheticGeo, { municipalities: [] }, null)
assert.equal(orphan.name, 'Aroroy')
assert.equal(orphan.trend, null)
assert.ok(orphan.outline?.d)
ok('orphan feature renders outline card with null trend')

// 7. outlineStroke ramp language: cooling -> cyan, flat -> muted, increasing -> binned ramp.
assert.equal(outlineStroke({ direction: 'decreasing' }), '#67e8f9')
assert.equal(outlineStroke({ direction: 'stable' }), '#475569')
assert.ok(outlineStroke({ direction: 'increasing', slope_c_per_year: 0.04 }).startsWith('#'))
ok('outline stroke reuses map ramp colours only')

console.log(`FINDER TESTS PASSED (${pass})`)
