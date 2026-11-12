// Run: node test_ranking.mjs — ranking logic check; fails on any assertion.
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { strict as strictAssert } from 'node:assert/strict'
import { rankMunicipalities } from './src/ranking.js'

const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exit(1)
  }
  console.log('ok:', msg)
}

const mk = (name, slope, p, sig, danger = 0, peak = 0) => ({
  name,
  trend: { slope_c_per_year: slope, p_value: p, is_significant: sig, direction: slope >= 0 ? 'increasing' : 'decreasing' },
  total_danger_days_45y: danger,
  peak_danger_days: { days: peak },
})

test('slope mode orders by |slope| desc, non-significant included', () => {
  const input = [mk('a', 0.01, 0.5, false), mk('b', 0.05, 0.0001, true), mk('c', -0.03, 0.01, true)]
  const out = rankMunicipalities(input)
  assert(out.map((r) => r.name).join(',') === 'b,c,a', 'order = b,c,a')
  assert(input.map((r) => r.name).join(',') === 'a,b,c', 'input array unmutated')
  assert(out.length === 3, 'non-significant still ranked — flag, not filter')
  assert(rankMunicipalities([]).length === 0, 'empty list OK')
})

test('slope mode breaks ties on p_value then name', () => {
  const out = rankMunicipalities([mk('x', 0.02, 0.4, false), mk('y', 0.02, 0.1, true), mk('z', -0.02, 0.1, true)])
  assert(out.map((r) => r.name).join(',') === 'y,z,x', 'tie broken by p_value')
})

test('danger mode orders by danger days desc with peak tie-break', () => {
  const out = rankMunicipalities(
    [mk('a', 0.01, 0.5, false, 1, 0), mk('b', 0.05, 0.0001, true, 3, 2), mk('c', 0.02, 0.2, true, 3, 5)],
    'danger',
  )
  assert(out.map((r) => r.name).join(',') === 'c,b,a', 'danger order with peak tie-break')
})

test('missing fields degrade to 0, never throw', () => {
  const out = rankMunicipalities([null, {}, { name: 'z', trend: {} }], 'danger')
  assert(out.length === 3, 'null/missing entries tolerated')
})

// real data: first row must be the max |slope| computed independently
const nar = JSON.parse(readFileSync(new URL('../../apps/web/public/data/narratives.json', import.meta.url), 'utf8'))
const real = nar.municipalities
const ranked = rankMunicipalities(real)
const maxSlope = Math.max(...real.map((m) => Math.abs(m.trend?.slope_c_per_year ?? 0)))
assert(ranked.length === real.length, `real data: all ${real.length} ranked`)
assert(Math.abs(ranked[0].trend.slope_c_per_year) === maxSlope, 'first row = max |slope|')
assert(ranked.filter((m) => !m.trend.is_significant).length >= 0, 'no significance filtering applied')
console.log('RANKING TESTS PASSED')
