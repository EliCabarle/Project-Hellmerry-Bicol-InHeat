// Run: node test_saved.mjs — saved-history logic check; fails on any assertion.
// Pure functions only: no network, no Supabase client (the store's one-liners are
// exercised by hand against the live project).
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { filterSaved, savedKey, withRank } from './src/savedStore.js'
import { rankMunicipalities } from './src/ranking.js'

const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exit(1)
  }
  console.log('ok:', msg)
}

const mk = (name, province, slope) => ({
  name,
  province,
  trend: { slope_c_per_year: slope, p_value: 0.01, is_significant: true, direction: 'increasing' },
})

test('savedKey keeps same-name municipalities apart', () => {
  assert(
    savedKey('Bato', 'Camarines Sur') !== savedKey('Bato', 'Catanduanes'),
    'Bato in different provinces is not the same place',
  )
  assert(savedKey('Bato', 'Masbate') === 'Bato|Masbate', 'key shape is name|province')
  assert(savedKey(undefined, undefined) === '|', 'missing fields never throw')
})

test('withRank numbers the ranked order and leaves the input alone', () => {
  const input = [mk('a', 'P', 0.01), mk('b', 'P', 0.03)]
  const out = withRank(input)
  assert(out[0].rank === 1 && out[1].rank === 2, 'ranks are 1..N in list order')
  assert(input[0].rank === undefined, 'input array unmutated')
  assert(withRank([]).length === 0, 'empty list OK')
})

test('filtering preserves the original rank — no renumbering', () => {
  const ranked = withRank([mk('a', 'P', 0.09), mk('b', 'Q', 0.08), mk('c', 'R', 0.07), mk('d', 'S', 0.06)])
  const keys = new Set([savedKey('c', 'R')])
  const shown = filterSaved(ranked, keys)
  assert(shown.length === 1, 'only the saved row survives')
  assert(shown[0].name === 'c', 'correct row kept')
  assert(shown[0].rank === 3, `rank 3 preserved, got ${shown[0].rank}`)
})

test('empty saved set filters everything out (empty state, not the full list)', () => {
  const ranked = withRank([mk('a', 'P', 0.09)])
  assert(filterSaved(ranked, new Set()).length === 0, 'no saved places renders the empty state')
})

test('saved key matches between ranking rows and stored rows', () => {
  // The store reads rows back as { municipality_name, province }; the ranking row
  // uses { name, province }. Both must produce the same key or stars never light up.
  const stored = { municipality_name: 'Bato', province: 'Catanduanes' }
  const rowKey = savedKey('Bato', 'Catanduanes')
  assert(savedKey(stored.municipality_name, stored.province) === rowKey, 'stored row and ranking row agree')
})

// real data: a saved 10th place must still read 10th in the saved view
const nar = JSON.parse(readFileSync(new URL('../../apps/web/public/data/narratives.json', import.meta.url), 'utf8'))
const ranked = withRank(rankMunicipalities(nar.municipalities))
const tenth = ranked[9]
const shown = filterSaved(ranked, new Set([savedKey(tenth.name, tenth.province)]))
assert(shown.length === 1 && shown[0].rank === 10, `real data: rank 10 preserved, got ${shown[0]?.rank}`)
assert(ranked.length === nar.municipalities.length, `real data: all ${ranked.length} ranked`)
console.log('SAVED TESTS PASSED')
