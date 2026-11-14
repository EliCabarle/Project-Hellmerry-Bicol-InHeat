// Run: node test_finderSearch.mjs — municipality finder search (pure matcher);
// fails on any assertion. Kept separate from the DOM so it runs without React.
import test from 'node:test'
import { strict as strictAssert } from 'node:assert/strict'
import { matchCards } from './src/finderData.js'

const cards = [
  { key: 'bato|cam sur', name: 'Bato', province: 'Camarines Sur' },
  { key: 'bato|catanduanes', name: 'Bato', province: 'Catanduanes' },
  { key: 'legazpi|albay', name: 'Legazpi', province: 'Albay' },
  { key: 'san fernando|cam sur', name: 'San Fernando', province: 'Camarines Sur' },
]

test('empty or blank query matches nothing', () => {
  strictAssert.deepEqual(matchCards(cards, ''), [])
  strictAssert.deepEqual(matchCards(cards, '   '), [])
  strictAssert.deepEqual(matchCards(undefined, 'bato'), [])
})

test('matches name case-insensitively and keeps the browse index', () => {
  const out = matchCards(cards, 'BATO')
  strictAssert.deepEqual(
    out.map((m) => m.index),
    [0, 1],
  )
  strictAssert.equal(out[0].card.name, 'Bato')
})

test('matches province as well as name', () => {
  strictAssert.deepEqual(
    matchCards(cards, 'catanduanes').map((m) => m.index),
    [1],
  )
  strictAssert.deepEqual(
    matchCards(cards, 'albay').map((m) => m.index),
    [2],
  )
})

test('partial substrings match — scan, not exact lookup', () => {
  strictAssert.deepEqual(
    matchCards(cards, 'fern').map((m) => m.index),
    [3],
  )
})

test('no match is an empty list and missing fields never throw', () => {
  strictAssert.deepEqual(matchCards(cards, 'zzz'), [])
  strictAssert.deepEqual(matchCards([{}, { name: null }], 'bato'), [])
})

console.log('FINDER SEARCH TESTS PASSED')