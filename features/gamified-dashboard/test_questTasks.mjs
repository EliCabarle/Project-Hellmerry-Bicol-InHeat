// Run: node test_questTasks.mjs — CSV parse, point bands, daily draw; fails on any assertion.
import test from 'node:test'
import { strict as assert } from 'node:assert/strict'
import {
  parseQuestCsv,
  drawDaily,
  pointsFor,
  TIER_POINTS,
  QUESTS_PER_DAY,
} from './src/questTasks.js'

const CSV = `Task_Number,Difficulty,Task_Title,Description
1,Easy,Sort & Rinse Recyclables,"Separate paper, plastics, glass, and metal, and rinse out food residue."
2,Medium,Compost Kitchen Scraps,Turn food scraps into compost.
3,Hard,Host a Workshop,"Run a session, with neighbors, about waste."
4,Easy,Pick Up Litter,Pick up litter.
5,Medium,Repair Instead of Replace,Fix one item.
6,Easy,Buy Local,Buy from a local vendor.
7,Hard,Plant a Tree,Plant one native tree.
`

const CATALOG = [
  ...Array.from({ length: 10 }, (_, i) => ({ n: i + 1, title: `E${i + 1}`, description: '', tier: 'easy' })),
  ...Array.from({ length: 10 }, (_, i) => ({ n: i + 11, title: `M${i + 1}`, description: '', tier: 'medium' })),
  ...Array.from({ length: 5 }, (_, i) => ({ n: i + 21, title: `H${i + 1}`, description: '', tier: 'hard' })),
]

test('parses the header, quoted commas and all four columns', () => {
  const tasks = parseQuestCsv(CSV)
  assert.equal(tasks.length, 7)
  assert.deepEqual(tasks[0], {
    n: 1,
    title: 'Sort & Rinse Recyclables',
    description: 'Separate paper, plastics, glass, and metal, and rinse out food residue.',
    tier: 'easy',
  })
  assert.equal(tasks[2].tier, 'hard', 'hard tier read from the column')
  assert.equal(tasks[2].description, 'Run a session, with neighbors, about waste.')
})

test('drops malformed rows and handles empty input', () => {
  const tasks = parseQuestCsv(
    'Task_Number,Difficulty,Task_Title,Description\nx,Easy,No number,desc\n9,Easy,,no title\n10,Easy,Good,Fine',
  )
  assert.equal(tasks.length, 1)
  assert.equal(tasks[0].n, 10)
  assert.deepEqual(parseQuestCsv(''), [])
  assert.deepEqual(parseQuestCsv(null), [])
})

test('points stay inside each tier band and are stable per day', () => {
  for (let n = 1; n <= 60; n += 1) {
    for (const tier of ['easy', 'medium', 'hard']) {
      const [lo, hi] = TIER_POINTS[tier]
      const hp = pointsFor(tier, n, '2026-11-14')
      assert.ok(Number.isInteger(hp), `${tier} #${n} is an integer`)
      assert.ok(hp >= lo && hp <= hi, `${tier} #${n} = ${hp} inside ${lo}..${hi}`)
      assert.equal(pointsFor(tier, n, '2026-11-14'), hp, 'same day is deterministic')
    }
  }
})

test('draws five, at least two easy, no duplicates, stable per day', () => {
  const a = drawDaily(CATALOG, '2026-11-14')
  const b = drawDaily(CATALOG, '2026-11-14')
  assert.equal(a.length, QUESTS_PER_DAY)
  assert.equal(new Set(a.map((q) => q.id)).size, QUESTS_PER_DAY, 'no duplicates')
  const easy = a.filter((q) => CATALOG.find((t) => `csv-${t.n}` === q.id).tier === 'easy')
  assert.ok(easy.length >= 2, `at least 2 easy, got ${easy.length}`)
  assert.deepEqual(a.map((q) => q.id), b.map((q) => q.id), 'same day, same list')
  assert.ok(a.every((q) => q.title && Number.isInteger(q.hp)), 'rows carry title + hp')
})

test('next day avoids the previous ids when the pool allows', () => {
  const day1 = drawDaily(CATALOG, '2026-11-14').map((q) => q.id)
  const day2 = drawDaily(CATALOG, '2026-11-15', day1).map((q) => q.id)
  assert.equal(day2.length, QUESTS_PER_DAY)
  const overlap = day2.filter((id) => day1.includes(id))
  assert.equal(overlap.length, 0, `expected disjoint days, got ${overlap.join(',')}`)
})

test('a catalog smaller than the quota returns what exists, not a crash', () => {
  const tiny = CATALOG.slice(0, 3)
  const drawn = drawDaily(tiny, '2026-11-14')
  assert.equal(drawn.length, 3)
  assert.equal(new Set(drawn.map((q) => q.id)).size, 3, 'no duplicates in the backfill')
  assert.deepEqual(drawDaily([], '2026-11-14'), [])
})