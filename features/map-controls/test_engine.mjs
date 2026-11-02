// Run: node test_engine.mjs  — slice-1 engine check; fails on any assertion.
import { readFileSync } from 'node:fs'
import { loadRegions, findBicol, getRegionStyle, isBicol } from './src/gis/engine.js'

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
