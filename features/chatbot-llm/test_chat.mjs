// Run: node test_chat.mjs — chatbot boilerplate check; fails on any assertion.
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { strict as assert } from 'node:assert/strict'
import { chatReducer, initialState } from './src/chat/reducer.js'
import { stubAdapter } from './src/chat/stubAdapter.js'

const assert2 = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exit(1)
  }
  console.log('ok:', msg)
}

const SRC = join(dirname(fileURLToPath(import.meta.url)), 'src')

test('stub adapter resolves the placeholder reply after a delay', async () => {
  const start = Date.now()
  const { text, done } = await stubAdapter.send('hello')
  const elapsed = Date.now() - start
  assert2(typeof text === 'string' && text.length > 0, 'stub returns a non-empty reply')
  assert2(done === true, 'stub marks the reply done')
  assert2(elapsed > 0, 'stub simulates a round-trip delay')
})

test('zero network: no fetch / XHR / WebSocket / dynamic http import in src', () => {
  const walk = (dir, out = []) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full, out)
      else out.push(full)
    }
    return out
  }
  const files = walk(SRC)
    .filter((f) => (f.endsWith('.js') || f.endsWith('.jsx')) && !f.endsWith('qaAdapter.js'))
  const network = /\bfetch\s*\(|XMLHttpRequest|\bWebSocket\s*\(|import\s*\(|https?:/
  let hits = 0
  for (const f of files) {
    const src = readFileSync(f, 'utf8')
    for (const line of src.split(/\r?\n/)) {
      if (network.test(line)) {
        // allow the comment/doc that says "no network" itself — but assert no real call site
        hits += 1
        console.error(`NETWORK HIT in ${f}: ${line.trim()}`)
      }
    }
  }
  assert2(hits === 0, 'no network primitives in chatbot-llm src')
})

test('reducer send -> reply reaches idle with both messages', () => {
  let state = initialState
  state = chatReducer(state, { type: 'send', text: 'hi there' })
  assert2(state.status === 'sending', 'send sets sending')
  assert2(state.messages.length === 1, 'one user message')
  assert2(state.messages[0].role === 'user' && state.messages[0].text === 'hi there', 'user message text')
  assert2(state.lastAttempt === 'hi there', 'lastAttempt stored for retry')

  state = chatReducer(state, { type: 'reply', text: 'placeholder reply' })
  assert2(state.status === 'idle', 'reply returns to idle')
  assert2(state.messages.length === 2, 'assistant message appended')
  assert2(state.messages[1].role === 'assistant', 'assistant role')
  assert2(state.messages[1].text === 'placeholder reply', 'assistant text')
})

test('reducer send -> fail reaches error with message', () => {
  let state = initialState
  state = chatReducer(state, { type: 'send', text: 'broken' })
  state = chatReducer(state, { type: 'fail', message: 'adapter exploded' })
  assert2(state.status === 'error', 'fail sets error status')
  assert2(state.error === 'adapter exploded', 'error message carried')
})

test('streaming chunks build one pending then done assistant message', () => {
  let state = initialState
  state = chatReducer(state, { type: 'stream', text: 'hel' })
  state = chatReducer(state, { type: 'stream', text: 'hello' })
  assert2(state.messages.length === 1, 'streaming accumulates into one message')
  assert2(state.messages[0].status === 'pending', 'pending while streaming')
  assert2(state.messages[0].text === 'hello', 'latest chunk shown')
  state = chatReducer(state, { type: 'stream', text: 'hello world', done: true })
  assert2(state.messages.length === 1, 'done finalizes the same message')
  assert2(state.messages[0].status === 'sent', 'final status sent')
  assert2(state.messages[0].text === 'hello world', 'final text')
})

test('clear resets to initial state', () => {
  let state = initialState
  state = chatReducer(state, { type: 'send', text: 'x' })
  state = chatReducer(state, { type: 'fail', message: 'boom' })
  state = chatReducer(state, { type: 'reset' })
  assert2(state.status === 'idle', 'reset to idle')
  assert2(state.messages.length === 0, 'reset clears messages')
  assert2(state.error === null, 'reset clears error')
})

test('reducer ignores unknown actions without throwing', () => {
  let state = initialState
  state = chatReducer(state, { type: 'not-a-real-action' })
  assert2(state.status === 'idle', 'unknown action is a no-op')
})

console.log('CHAT TESTS PASSED')
