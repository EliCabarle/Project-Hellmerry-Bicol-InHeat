// Run: node test_score.mjs — stored-score read check; fails on any assertion.
// The Supabase client is a stub: this pins the query shape, not the network.
// Publishing moved to events (test_eventStore.mjs); this covers the read that
// lets a fresh browser adopt a score earned elsewhere.
import test from 'node:test'
import { readScore } from './src/scoreStore.js'

const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exit(1)
  }
  console.log('ok:', msg)
}

// Answers a user_profiles select chain and records the query it was given.
const profileStub = (answer) => {
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

test('readScore scopes the query to the signed-in user', async () => {
  const s = profileStub({ data: { score: 250 }, error: null })
  const r = await readScore(s, 'uuid-1')
  assert(r.score === 250 && r.error === null, 'stored score is returned')
  assert(s.chain[0][0] === 'from' && s.chain[0][1] === 'user_profiles', 'reads user_profiles')
  assert(s.chain[1][1] === 'score', 'selects only the score column')
  assert(s.chain[2][1] === 'user_id' && s.chain[2][2] === 'uuid-1', 'filtered to this user')
})

test('readScore reports no row as a null score, not an error', async () => {
  // Signed in before picking a handle: nothing stored, nothing to adopt.
  const r = await readScore(profileStub({ data: null, error: null }), 'uuid-1')
  assert(r.score === null && r.error === null, 'missing row is not a failure')
})

test('readScore surfaces a query error so the caller can skip publishing', async () => {
  const r = await readScore(profileStub({ data: null, error: { message: 'network' } }), 'uuid-1')
  assert(r.error?.message === 'network', 'error is passed through')
  assert(r.score === null, 'no score invented on failure')
})

test('readScore without a client or user id does nothing', async () => {
  const a = await readScore(null, 'uuid-1')
  const b = await readScore(profileStub({ data: null, error: null }), null)
  assert(a.score === null && b.score === null, 'no query, no score')
})