// Run: node test_weekly.mjs — collective weekly bar read check; fails on any
// assertion. The Supabase client is a stub: this pins the view query, not the
// network.
import test from 'node:test'
import { fetchWeekTotal } from './src/weeklyStore.js'

const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exit(1)
  }
  console.log('ok:', msg)
}

const weekStub = (answer) => {
  const chain = []
  const q = {
    select(cols) {
      chain.push(['select', cols])
      return q
    },
    eq(col, val) {
      chain.push(['eq', col, val])
      return q
    },
    maybeSingle() {
      return Promise.resolve(answer)
    },
  }
  return {
    chain,
    from(table) {
      chain.push(['from', table])
      return q
    },
  }
}

test('reads the collective view scoped to the requested week', async () => {
  const s = weekStub({ data: { week: '11-13-2026', hp: 1250, contributors: 7 }, error: null })
  const r = await fetchWeekTotal(s, '11-13-2026')
  assert(r.total === 1250 && r.contributors === 7 && r.error === null, 'aggregate returned')
  assert(s.chain[0][1] === 'collective_weekly_hp', 'reads the public view')
  assert(s.chain[2][1] === 'week' && s.chain[2][2] === '11-13-2026', 'filtered to this week')
})

test('a week with no rows reads as zero, not an error', async () => {
  const r = await fetchWeekTotal(weekStub({ data: null, error: null }), '11-13-2026')
  assert(r.total === 0 && r.contributors === 0 && r.error === null, 'fresh week is empty')
})

test('an error is surfaced with zeroed numbers', async () => {
  const r = await fetchWeekTotal(weekStub({ data: null, error: { message: 'network' } }), '11-13-2026')
  assert(r.error?.message === 'network', 'error passes through')
  assert(r.total === 0 && r.contributors === 0, 'no invented numbers on failure')
})

test('no client or week does nothing', async () => {
  const a = await fetchWeekTotal(null, '11-13-2026')
  const b = await fetchWeekTotal(weekStub({ data: null, error: null }), null)
  assert(a.total === 0 && b.total === 0, 'no query, no numbers')
})