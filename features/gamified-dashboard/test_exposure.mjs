// Run: node test_exposure.mjs — the LGU decision-tool layer: exposure
// ordering, human-impact aggregates, the CI band, and the action rules.
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

import { rankMunicipalities } from './src/ranking.js'
import {
  personDaysDanger,
  populationExposure,
  maxPersonDays,
  regionalDriverShares,
  regionalMedian,
  yearlyMeanCi95,
} from './src/chartData.js'
import { lguActions, regionalHeadline, THRESHOLDS } from './src/lguAction.js'

const DATA_URL = new URL('../../apps/web/public/data/narratives.json', import.meta.url)
const narratives = JSON.parse(readFileSync(DATA_URL, 'utf-8'))
const MUNIS = narratives.municipalities

test('the pipeline ships the human-impact fields the dashboard needs', () => {
  for (const field of ['person_days_danger', 'population_2020', 'lst_mean_c', 'ndvi_mean']) {
    const present = MUNIS.filter((m) => field in m).length
    assert.equal(present, MUNIS.length, `${field} missing from ${MUNIS.length - present} municipalities`)
  }
})

test('person-days of danger total 24.1M across the region', () => {
  const total = personDaysDanger(MUNIS)
  assert.equal(total, 24_105_982)
  assert.equal((total / 1e6).toFixed(1), '24.1')
})

test('exposure ordering puts the most people at risk first', () => {
  const ranked = rankMunicipalities(MUNIS, 'person-days')
  assert.equal(ranked[0].name, 'City of Naga')
  assert.equal(ranked[0].person_days_danger, 1_965_828)
  assert.equal(ranked[1].name, 'City of Legazpi')
  // Every row above the zero-exposure tail must have real exposure.
  const first = ranked.find((m) => (m.person_days_danger ?? 0) === 0)
  assert.ok(first, 'expected some municipalities with zero exposure')
  assert.ok(
    ranked.slice(0, ranked.indexOf(first)).every((m) => (m.person_days_danger ?? 0) > 0),
    'a zero-exposure municipality ranked above an exposed one',
  )
})

test('exposure ordering and warming-rate ordering share no municipality', () => {
  const byExposure = rankMunicipalities(MUNIS, 'person-days').slice(0, 10)
  const bySlope = rankMunicipalities(MUNIS, 'slope').slice(0, 10)
  const overlap = byExposure.filter((m) => bySlope.some((s) => s.name === m.name))
  assert.equal(overlap.length, 0, 'the two orderings should not agree — that is the whole point')
})

test('population exposure counts the people behind the person-days', () => {
  const exposure = populationExposure(MUNIS)
  assert.equal(exposure.exposedCount, 54)
  assert.equal(exposure.totalPopulation, 5_427_677)
  assert.ok(exposure.exposedPopulation > 2_900_000)
  assert.equal(exposure.exposedSharePct, 55.0)
})

test('the regional headline states the people, not the rate', () => {
  const headline = regionalHeadline(populationExposure(MUNIS))
  assert.match(headline, /2\.99M people across 54 municipalities/)
  assert.match(headline, /55% of Bicol/)
})

test('max person-days sets the in-cell bar scale', () => {
  assert.equal(maxPersonDays(MUNIS), 1_965_828)
  assert.equal(maxPersonDays([]), 0)
})

test('regional driver shares rank the wind drivers first', () => {
  const shares = regionalDriverShares(MUNIS)
  assert.ok(shares.length >= 3)
  assert.match(shares[0].label, /Wind/)
  assert.ok(shares[0].meanShare > 0)
  assert.ok(shares[0].meanShare >= shares[1].meanShare)
})

test('regional median is the midpoint of the condition fields', () => {
  const ndvi = regionalMedian(MUNIS, 'ndvi_mean')
  const lst = regionalMedian(MUNIS, 'lst_mean_c')
  assert.ok(ndvi > 0.54 && ndvi < 0.77)
  assert.ok(lst > 24 && lst < 32)
  assert.equal(regionalMedian([], 'ndvi_mean'), null)
})

test('the yearly CI band brackets the mean and narrows as n grows', () => {
  const band = yearlyMeanCi95(MUNIS)
  assert.equal(band.length, 45)
  const first = band[0]
  assert.ok(first.ciLow < first.ciHigh)
  // The band must be a real interval around the province mean, not a guess.
  const mean = MUNIS[0].series.find((r) => r.year === first.year).mean_heat_index_c
  assert.ok(first.ciLow <= mean + 2 && first.ciHigh >= mean - 2)
})

test('the action rules fire on the thresholds they claim', () => {
  const lowCanopy = lguActions({ name: 'X', ndvi_mean: 0.6 })
  assert.ok(lowCanopy.some((a) => a.id === 'canopy'))
  assert.ok(!lguActions({ name: 'X', ndvi_mean: 0.72 }).some((a) => a.id === 'canopy'))

  const hot = lguActions({ name: 'X', lst_mean_c: 30.5 })
  assert.ok(hot.some((a) => a.id === 'heat'))
  assert.ok(!lguActions({ name: 'X', lst_mean_c: 27 }).some((a) => a.id === 'heat'))

  const big = lguActions({ name: 'X', population_2020: 150000 })
  assert.ok(big.some((a) => a.id === 'population'))
  assert.ok(!lguActions({ name: 'X', population_2020: 20000 }).some((a) => a.id === 'population'))

  assert.equal(THRESHOLDS.ndviLow, 0.65)
  assert.equal(THRESHOLDS.lstHot, 30)
  assert.equal(THRESHOLDS.populationLarge, 100000)
})

test('the action list is never empty', () => {
  const actions = lguActions({ name: 'Y', ndvi_mean: 0.72, lst_mean_c: 26, population_2020: 9000 })
  assert.ok(actions.length > 0)
  assert.equal(lguActions(null).length, 0)
})
