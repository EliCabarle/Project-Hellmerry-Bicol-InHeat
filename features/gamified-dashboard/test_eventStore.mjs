// Run: node test_eventStore.mjs — event publish payload check; fails on any
// assertion. The Supabase client is a stub: it pins what leaves the client, not
// the network. The RPC's per-day cap is exercised by hand against the live
// project (same convention as test_saved.mjs).
import test from 'node:test'
import { eventsToPush, pushEvents } from './src/eventStore.js'

const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exit(1)
  }
  console.log('ok:', msg)
}

const ev = (kind, date, hp, questId) => ({ id: `id-${kind}-${date}-${questId ?? ''}`, kind, date, hp, questId, at: 0 })

test('drops restore events — adopted HP was not earned here', () => {
  const out = eventsToPush(
    [ev('restore', '11-13-2026', 40), ev('quest', '11-13-2026', 12, 'csv-1')],
    '11-13-2026',
  )
  assert(out.length === 1 && out[0].kind === 'quest', 'only the quest row is sent')
})

test('maps to the RPC shape and blanks quest_id for a login', () => {
  const [e] = eventsToPush([ev('login', '11-13-2026', 1)], '11-13-2026')
  assert(e.kind === 'login' && e.quest_id === '' && e.date === '11-13-2026' && e.hp === 1, 'login row shape')
})

test('drops events older than the 30-day window', () => {
  const out = eventsToPush(
    [ev('quest', '2025-12-01', 5, 'old'), ev('quest', '11-13-2026', 5, 'new')],
    '11-13-2026',
  )
  assert(out.length === 1 && out[0].quest_id === 'new', 'old event is outside the window')
})

test('drops malformed and non-positive rows instead of failing the batch', () => {
  const out = eventsToPush(
    [
      ev('quest', 'nope', 5, 'a'),
      ev('quest', '11-13-2026', -5, 'b'),
      ev('quest', '11-13-2026', 5, 'c'),
    ],
    '11-13-2026',
  )
  assert(out.length === 1 && out[0].quest_id === 'c', 'only the valid row survives')
})

test('a signed-out push makes no request', async () => {
  const r = await pushEvents(null, [ev('quest', '11-13-2026', 5, 'a')], '11-13-2026')
  assert(r.inserted === 0 && r.error === null, 'missing client is a no-op')
})

test('pushEvents sends one record_events call and reports the inserted count', async () => {
  const calls = []
  const s = {
    rpc(name, args) {
      calls.push({ name, args })
      return Promise.resolve({ data: 2, error: null })
    },
  }
  const r = await pushEvents(
    s,
    [ev('quest', '11-13-2026', 5, 'a'), ev('quest', '11-13-2026', 6, 'b')],
    '11-13-2026',
  )
  assert(calls.length === 1 && calls[0].name === 'record_events', 'one RPC call')
  assert(Array.isArray(calls[0].args.p_events) && calls[0].args.p_events.length === 2, 'both events sent')
  assert(r.inserted === 2 && r.error === null, 'inserted count passed through')
})

test('an all-restore batch makes no request', async () => {
  let called = 0
  const s = {
    rpc() {
      called += 1
      return Promise.resolve({ data: 0, error: null })
    },
  }
  const r = await pushEvents(s, [ev('restore', '11-13-2026', 9)], '11-13-2026')
  assert(called === 0 && r.inserted === 0, 'nothing to send, nothing called')
})

test('a failed push surfaces the error', async () => {
  const s = { rpc: () => Promise.resolve({ data: null, error: { message: 'no function' } }) }
  const r = await pushEvents(s, [ev('quest', '11-13-2026', 5, 'a')], '11-13-2026')
  assert(r.error?.message === 'no function' && r.inserted === 0, 'error is returned')
})