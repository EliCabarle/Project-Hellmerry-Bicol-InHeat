// Privacy-notice identity and the consent gate (RA 10173 §16(b)).
// Consent is recorded in the user's auth metadata, not in a table: no migration,
// nothing new to expose through RLS or the leaderboard view, and bumping
// PRIVACY_VERSION re-asks every account exactly once.

export const PRIVACY_VERSION = '2026-11-14'

// shortcut: placeholder contact, replace before submission
export const PRIVACY_CONTACT = 'ashronbengimpa9@gmail.com'
// shortcut: placeholder accountable person, replace before submission
export const PRIVACY_ACCOUNTABLE = 'Ashron Ben Gimpao'
// shortcut: placeholder Supabase region, replace before submission
export const PRIVACY_REGION = 'South Asia(Mumbai)'

// A version match is the evidence; privacy_accepted_at is written for audit only.
export const hasConsent = (meta, version = PRIVACY_VERSION) => meta?.privacy_version === version

// What "agree" writes. Timestamped so a later dispute can be answered.
export const consentRecord = () => ({
  privacy_version: PRIVACY_VERSION,
  privacy_accepted_at: new Date().toISOString(),
})
