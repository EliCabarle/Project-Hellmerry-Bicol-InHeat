// Run: node test_routes.mjs — URL-hash route grammar; fails on any assertion.
// The grammar is the load-time contract: a shared or bookmarked hash must
// restore exactly one screen, an empty or foreign hash must fall back to
// Landing, and the legacy #muni= deep link must keep decoding exactly as
// before — so every token in the table is asserted here token by token.
import test from 'node:test'
import { parseRoute, hashFor } from './src/lib/routes.js'

const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exit(1)
  }
  console.log('ok:', msg)
}

// Field-wise comparison: a null parse result must never satisfy a route shape.
const eq = (actual, expected) =>
  !!actual &&
  actual.screen === expected.screen &&
  actual.tab === expected.tab &&
  actual.muniKey === expected.muniKey

const route = (screen, tab = null, muniKey = null) => ({ screen, tab, muniKey })

test('the standalone screen tokens parse to their own screen', () => {
  assert(eq(parseRoute('#map'), route('map')), '#map → map screen')
  assert(eq(parseRoute('#account'), route('account')), '#account → account screen')
  assert(eq(parseRoute('#settings'), route('settings')), '#settings → settings screen')
  assert(eq(parseRoute('#landing'), route('landing')), '#landing → landing screen')
})

test('the dashboard sub-tab tokens imply the dashboard screen', () => {
  for (const tab of ['dashboard', 'quests', 'history', 'leaderboard']) {
    assert(eq(parseRoute(`#${tab}`), route('dashboard', tab)), `#${tab} → dashboard/${tab} tab`)
  }
})

test('the empty hash is the first-visit landing route', () => {
  assert(eq(parseRoute(''), route('landing')), '"" → landing (D-02 first visit)')
})

test('the legacy #muni= deep link decodes to a map selection', () => {
  assert(
    eq(parseRoute('#muni=bato%7Ccamarines%20sur'), route('map', null, 'bato|camarines sur')),
    'encoded joinKey decodes to the map with a selection',
  )
  assert(parseRoute('#muni=%E0%A4%A') === null, 'malformed percent-encoding is not a route')
  assert(parseRoute('#muni=') === null, 'an empty key is not a route')
})

test('foreign and legacy fragments are not routes', () => {
  assert(parseRoute('#main') === null, '#main (skip-link target) is not a route')
  assert(parseRoute('#access_token=abc') === null, 'an auth fragment is not a route')
  assert(parseRoute('#mapx') === null, 'a near-miss token is not a route')
  assert(parseRoute('#muni') === null, 'the bare #muni prefix is not a route')
  assert(parseRoute('#bicol') === null, 'arbitrary text is not a route')
})

test('hashFor renders the canonical token for each target', () => {
  assert(hashFor('quests') === '#quests', 'quests → #quests')
  assert(hashFor('history') === '#history', 'history → #history')
  assert(hashFor('map', null) === '#map', 'map without a key → #map')
  assert(
    hashFor('map', 'bato|camarines sur') === '#muni=bato%7Ccamarines%20sur',
    'map with a key → encoded #muni=',
  )
})

test('parseRoute(hashFor(...)) round-trips every supported target', () => {
  const cases = [
    ['map', null, route('map')],
    ['map', 'bato|camarines sur', route('map', null, 'bato|camarines sur')],
    ['landing', null, route('landing')],
    ['dashboard', null, route('dashboard', 'dashboard')],
    ['quests', null, route('dashboard', 'quests')],
    ['history', null, route('dashboard', 'history')],
    ['leaderboard', null, route('dashboard', 'leaderboard')],
    ['account', null, route('account')],
    ['settings', null, route('settings')],
  ]
  for (const [target, key, expected] of cases) {
    assert(eq(parseRoute(hashFor(target, key)), expected), `${target} round-trips`)
  }
})

console.log('ROUTE TESTS PASSED')
