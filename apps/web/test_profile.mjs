// Run: node test_profile.mjs — handle validation check; fails on any assertion.
// Mirrors the user_profiles_handle_fmt constraint: if these drift apart, the form
// accepts something the database rejects (or blocks something it would allow).
import test from 'node:test'
import { validateHandle } from './src/lib/profile.js'

const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exit(1)
  }
  console.log('ok:', msg)
}

test('accepts the handles the constraint accepts', () => {
  assert(validateHandle('leonel_04') === null, 'letters, digits, underscore')
  assert(validateHandle('abc') === null, '3 characters is the minimum')
  assert(validateHandle('A'.repeat(20)) === null, '20 characters is the maximum')
  assert(validateHandle('  bato  ') === null, 'surrounding spaces are trimmed, not rejected')
})

test('rejects the handles the constraint rejects', () => {
  assert(validateHandle('') !== null, 'empty rejected')
  assert(validateHandle('   ') !== null, 'whitespace only rejected')
  assert(validateHandle('ab') !== null, '2 characters rejected')
  assert(validateHandle('a'.repeat(21)) !== null, '21 characters rejected')
  assert(validateHandle('leonel dizon') !== null, 'space rejected — no real names in a handle')
  assert(validateHandle('leonel@example.com') !== null, 'email address rejected')
  assert(validateHandle('sagñay') !== null, 'non-ASCII rejected like the DB would')
  assert(validateHandle(null) !== null, 'null rejected without throwing')
  assert(validateHandle(undefined) !== null, 'undefined rejected without throwing')
})

test('every rejection carries a readable message', () => {
  for (const bad of ['', 'ab', 'a'.repeat(21), 'x y']) {
    const msg = validateHandle(bad)
    assert(typeof msg === 'string' && msg.length > 5, `message for ${JSON.stringify(bad)} is usable`)
  }
})

console.log('PROFILE TESTS PASSED')
