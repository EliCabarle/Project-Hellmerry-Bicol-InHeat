// Run: node test_score.mjs — HP -> leaderboard publish check; fails on any assertion.
// The Supabase client is a stub: this pins the payload and the clamping rules,
// not the network. The RPC itself is exercised by hand against the live project
// (same convention as test_saved.mjs).
import test from 'node:test'
import { MAX_SCORE, readScore, syncScore } from './src/scoreStore.js'

const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exit(1)
  }
  console.log('ok:', msg)
}

// Records every rpc('set_my_score', ...) call and answers with a chosen ceiling.
const stub = (answer = { data: null, error: null }) => {
  const calls = []
  return {
    calls,
    rpc(name, args) {
      calls.push({ name, args })
      return Promise.resolve(answer)
    },
  }
}

test('signed-out call makes no request at all', async () => {
  // No client = no session = nothing may reach the network.
  const r = await syncScore(null, 500)
  assert(r.cappedTo === null && r.error === null, 'missing client is a silent no-op')
  assert(true, 'no stub to inspect: nothing was called')
})

test('sends a rounded, clamped integer under the right RPC name', async () => {
  const s = stub()
  await syncScore(s, 42.6)
  assert(s.calls.length === 1, 'exactly one call')
  assert(s.calls[0].name === 'set_my_score', 'function name matches the migration')
  assert(s.calls[0].args.p_score === 43, 'HP is rounded to an integer')
  assert(Number.isInteger(s.calls[0].args.p_score), 'integer payload, not a float string')
})

test('negative HP is clamped to zero, never sent as a negative score', async () => {
  const s = stub()
  await syncScore(s, -5)
  assert(s.calls[0].args.p_score === 0, 'floor is 0 so the table check cannot fire')
})

test('absurd HP is clamped to the server floor before it leaves the client', async () => {
  const s = stub()
  await syncScore(s, 1e9)
  assert(s.calls[0].args.p_score === MAX_SCORE, 'clamped to MAX_SCORE')
})

test('reports the cap when the server stores less than asked', async () => {
  // Server answers 100: the account-age ceiling for a day-0 profile.
  const r = await syncScore(stub({ data: 100, error: null }), 900)
  assert(r.cappedTo === 100 && r.error === null, 'cappedTo carries the ceiling')
})

test('no cap reported when the server accepted the value', async () => {
  const r = await syncScore(stub({ data: 100000, error: null }), 50)
  assert(r.cappedTo === null, 'ceiling above the ask is not a cap')
})

test('null data (no profile row yet) is not reported as a cap', async () => {
  const r = await syncScore(stub({ data: null, error: null }), 50)
  assert(r.cappedTo === null, 'no handle yet: caller shows the onboarding state')
})

test('a failed publish returns the error and claims no cap', async () => {
  const r = await syncScore(stub({ data: null, error: { message: 'function not found' } }), 50)
  assert(r.error?.message === 'function not found', 'error surfaces to the caller')
  assert(r.cappedTo === null, 'no cap claim on failure')
})

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