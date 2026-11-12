// Run: node test_provinceGroups.mjs — province-list logic check; fails on any assertion.
import test from 'node:test'
import { strict as assert } from 'node:assert/strict'
import { provinceList } from './src/provinceGroups.js'

const mk = (name, province, rank) => ({ name, province, rank })

test('empty input yields no provinces', () => {
  assert.equal(provinceList().length, 0, 'undefined input -> []')
  assert.equal(provinceList([]).length, 0, 'empty array -> []')
})

test('unique provinces sort A to Z', () => {
  const out = provinceList([
    mk('Zee muni', 'Zamboanga del Sur', 9),
    mk('Aye muni', 'Albay', 1),
    mk('Bee muni', 'Camarines Sur', 5),
    mk('Dupe muni', 'Albay', 2),
  ])
  assert.equal(out.join(','), 'Albay,Camarines Sur,Zamboanga del Sur', 'unique + A->Z')
})

test('missing/blank provinces are skipped', () => {
  const out = provinceList([
    mk('Only', undefined, 1),
    mk('Blank', '', 2),
    mk('Real', 'Sorsogon', 3),
  ])
  assert.equal(out.join(','), 'Sorsogon', 'only real provinces remain')
})

test('row objects pass through untouched (list is read-only)', () => {
  const input = [mk('One muni', 'Albay', 2)]
  const out = provinceList(input)
  assert.equal(out[0], 'Albay', 'province derived')
  assert.equal(input[0].rank, 2, 'input not mutated')
})
