// Run: node test_dim.mjs — dimming spotlight maths; fails on any assertion.
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { strict as strictAssert } from 'node:assert/strict'
import { dimColor, DIM_LEVEL, DIM_AXIS, DIM_MS, KEEP_OUTLINE } from './src/gis/metric.js'
import { getMunicipalityStyle } from './src/gis/engine.js'
import { joinNarratives } from './src/gis/engine.js'

const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exit(1)
  }
  console.log('ok:', msg)
}

// ---- dimColor ----
const amber = '#fbbf24' // r=251 g=191 b=36, lightness ≈ 0.56
const dimmed = dimColor(amber)
// original lightness of amber
const h2 = amber.replace(/^#/, '')
const n2 = parseInt(h2, 16)
const r2 = (n2 >> 16) & 255, g2 = (n2 >> 8) & 255, b2 = n2 & 255
const mx2 = Math.max(r2, g2, b2), mn2 = Math.min(r2, g2, b2)
const lOrig = (mx2 + mn2) / 510
// dimmed lightness
const h3 = dimmed.replace(/^#/, '')
const n3 = parseInt(h3, 16)
const r3 = (n3 >> 16) & 255, g3 = (n3 >> 8) & 255, b3 = n3 & 255
const mx3 = Math.max(r3, g3, b3), mn3 = Math.min(r3, g3, b3)
const lDim = (mx3 + mn3) / 510
assert(Math.abs(lDim - lOrig * DIM_LEVEL) < 0.02, `dimColor scales lightness by DIM_LEVEL (${DIM_LEVEL})`)
assert(lDim < lOrig, 'dimmed is darker than original')

// saturation axis
const satDimmed = dimColor(amber, { axis: 'saturation' })
assert(satDimmed !== amber, 'saturation axis produces a different colour')

// black stays black
assert(dimColor('#000000') === '#000000', 'black stays black')

// constants are within safe range
assert(DIM_LEVEL >= 0.35 && DIM_LEVEL <= 0.70, 'DIM_LEVEL within safe 0.35–0.70')
assert(DIM_MS === 150, 'DIM_MS is 150 ms')
assert(KEEP_OUTLINE === true, 'KEEP_OUTLINE default true')

// ---- getMunicipalityStyle dimming ----
const mun = JSON.parse(
  readFileSync(new URL('../../apps/web/public/data/bicol-municipalities.geojson', import.meta.url), 'utf8'),
)
const nar = JSON.parse(
  readFileSync(new URL('../../apps/web/public/data/narratives.json', import.meta.url), 'utf8'),
)
const joined = joinNarratives(mun, nar)
const naga = joined.features.find((f) => f.properties.adm3_en === 'City of Naga')
const keyNaga = 'naga|camarines sur' // province-qualified
// pick any other key
const other = joined.features.find((f) => {
  const p = f.properties ?? {}
  return p.adm3_en !== 'City of Naga'
})
const keyOther = `${(other.properties.adm3_en ?? 'x').toLowerCase()}|${(other.properties.province ?? 'x').toLowerCase()}`

const baseNaga = getMunicipalityStyle(naga).fillColor
const baseOther = getMunicipalityStyle(other).fillColor

// nothing targeted: no dimming
assert(getMunicipalityStyle(naga, { selectedKey: null, hoveredKey: null }).fillColor === baseNaga, 'no target: naga not dimmed')
assert(getMunicipalityStyle(other, { selectedKey: null, hoveredKey: null }).fillColor === baseOther, 'no target: other not dimmed')

// hovered target keeps normal fill
const hoveredNaga = getMunicipalityStyle(naga, { hoveredKey: keyNaga }).fillColor
assert(hoveredNaga === baseNaga, 'hovered target keeps normal fill')

// non-target dims
const dimmedOther = getMunicipalityStyle(other, { hoveredKey: keyNaga }).fillColor
assert(dimmedOther !== baseOther, 'non-target is dimmed')

// selected target keeps selection fill (stronger than hover)
const selNaga = getMunicipalityStyle(naga, { selectedKey: keyNaga }).fillColor
assert(selNaga === baseNaga, 'selected target keeps normal fill')
const selNagaStyle = getMunicipalityStyle(naga, { selectedKey: keyNaga })
const plainNagaStyle = getMunicipalityStyle(naga)
assert(selNagaStyle.weight > plainNagaStyle.weight, 'selected is visually stronger (heavier weight)')

// selected + hovered: both exempt, everything else dims
const both = getMunicipalityStyle(other, { selectedKey: keyNaga, hoveredKey: keyNaga }).fillColor
assert(both !== baseOther, 'with selected+hovered target, other still dims')
const nagaBoth = getMunicipalityStyle(naga, { selectedKey: keyNaga, hoveredKey: keyNaga }).fillColor
assert(nagaBoth === baseNaga, 'selected+hovered target keeps normal fill')

// hover a second area while one selected: selected stays strong, hovered bright, rest dim
const withSel = getMunicipalityStyle(naga, { selectedKey: keyNaga, hoveredKey: keyOther })
assert(withSel.fillColor === baseNaga, 'selected stays bright while another hovered')
const hoveredOther = getMunicipalityStyle(other, { selectedKey: keyNaga, hoveredKey: keyOther })
assert(hoveredOther.fillColor === baseOther, 'hovered stays bright while one selected')
const third = joined.features.find((f) => {
  const p = f.properties ?? {}
  return p.adm3_en !== 'City of Naga' && p.adm3_en !== other.properties.adm3_en
})
const thirdDimmed = getMunicipalityStyle(third, { selectedKey: keyNaga, hoveredKey: keyOther }).fillColor
assert(thirdDimmed !== (getMunicipalityStyle(third).fillColor), 'third area dims when two targeted')

// restoration: no targets → everything back to normal
assert(getMunicipalityStyle(other, {}).fillColor === baseOther, 'restoration exact, no residue')

console.log('DIM TESTS PASSED')
