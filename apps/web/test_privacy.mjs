// Run: node test_privacy.mjs — consent gate check; fails on any assertion.
// The gate is a single version comparison, so it gets a single test file: if
// hasConsent ever returns true without an exact version match, an account is
// using the app under a notice it never agreed to.
import test from 'node:test'
import { PRIVACY_VERSION, consentRecord, hasConsent } from './src/lib/privacy.js'

const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exit(1)
  }
  console.log('ok:', msg)
}

test('no metadata means no consent', () => {
  assert(hasConsent(undefined) === false, 'undefined metadata is not consent')
  assert(hasConsent(null) === false, 'null metadata is not consent')
  assert(hasConsent({}) === false, 'empty metadata is not consent')
})

test('a different notice version no longer counts', () => {
  assert(hasConsent({ privacy_version: '2025-01-01' }) === false, 'an older notice re-prompts')
  assert(hasConsent({ privacy_version: '2026-11-14 ' }) === false, 'a stray space is not a match')
})

test('the current version counts', () => {
  assert(hasConsent({ privacy_version: PRIVACY_VERSION }) === true, 'version match is consent')
  assert(
    hasConsent({ privacy_version: PRIVACY_VERSION, privacy_accepted_at: '2026-11-14T00:00:00Z' }) === true,
    'a timestamp does not disturb the match',
  )
})

test('the written record carries the version and a timestamp', () => {
  const record = consentRecord()
  assert(record.privacy_version === PRIVACY_VERSION, 'record stores the notice version')
  assert(!Number.isNaN(Date.parse(record.privacy_accepted_at)), 'record stores a parsed timestamp')
  assert(hasConsent(record) === true, 'what we write is what the gate accepts')
})

console.log('PRIVACY TESTS PASSED')
