// First-sign-in privacy gate. RA 10173 §16(b) requires the data subject to be
// told what is collected, why, who receives it, how long it is kept and which
// rights exist, before collection or at the first practical moment after it.
// One native <dialog> covers three modes: the consent gate, the handle step
// that used to live in the header pill, and a read-only notice the header link
// opens at any time, signed in or not.
import { useEffect, useRef, useState } from 'react'
import { saveHandle, validateHandle } from '../lib/profile.js'
import {
  PRIVACY_ACCOUNTABLE,
  PRIVACY_CONTACT,
  PRIVACY_REGION,
  consentRecord,
} from '../lib/privacy.js'

const LINK =
  'rounded text-heat-amber underline underline-offset-2 hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber'
const PRIMARY = 'bih-btn min-h-11 cursor-pointer rounded-md bg-heat-amber px-3 text-xs font-semibold text-slate-950 hover:bg-amber-300'
const SECONDARY = 'bih-btn min-h-11 cursor-pointer rounded-md px-3 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white'

function Section({ title, children }) {
  return (
    <section className="mt-4 first:mt-0">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-heat-amber">{title}</h3>
      <div className="mt-1 space-y-1.5 text-xs leading-5 text-slate-300">{children}</div>
    </section>
  )
}

// The notice body. Wording is fixed and reviewed: it maps one-to-one onto the
// §16(b) list, so reordering or trimming a section is a compliance change, not
// a copy edit. Placeholders come from lib/privacy.js.
function Notice() {
  return (
    <>
      <p className="text-[11px] text-slate-400">
        Version 2026-11-14 · applies from your first sign-in
      </p>

      <Section title="Who we are">
        <p>
          Bicol In-Heat is a team entry to the NASA International Space Apps Challenge. In
          data-protection terms we are the “personal information controller” of everything described
          below — the people who decide what is collected and why.
        </p>
        <p>
          Questions, requests or complaints:{' '}
          <a href={`mailto:${PRIVACY_CONTACT}`} className={LINK}>
            {PRIVACY_CONTACT}
          </a>
          . The person accountable for data protection is {PRIVACY_ACCOUNTABLE}, at the same
          address.
        </p>
      </Section>

      <Section title="What we collect, and why">
        <p>
          Signing in with Google gives us four things: your Google account id, your name, your email
          address and your profile-photo link. We use them to create your account, keep it secure
          and recognise you next time. They are never shown to anyone in the app.
        </p>
        <p>
          Using the app gives us: the handle you pick, your points, your quest history and the
          places you save. We use them to show your progress and to build the leaderboard.
        </p>
        <p>
          That is the whole list. Loading a page also sends your IP address to our host and to the
          map-tile provider; we do not store it. Nothing about you is decided automatically — no
          profiling, no advertising, no analytics, no tracking cookies.
        </p>
      </Section>

      <Section title="What other people can see">
        <p>
          On the leaderboard: your handle, your score, and how many places you have saved. That is
          all. Nobody sees your Google name, email or photo, your quest history, or which
          municipalities you saved.
        </p>
      </Section>

      <Section title="Who else touches it">
        <p>
          Supabase hosts the database and the sign-in, and holds the rows described above. Google
          runs the sign-in step, under Google's own privacy policy. Esri and OpenStreetMap serve the
          map tiles and see your browser's request. We do not sell your data or hand it to anyone
          else.
        </p>
      </Section>

      <Section title="Where it lives, and how long it stays">
        <p>
          On Supabase servers in {PRIVACY_REGION}. We keep your account while it exists and delete
          it within 30 days of you asking. Your browser also keeps a local copy — login token,
          points, offline cache. Signing out and clearing site data wipes that copy; asking us
          deletes the server rows.
        </p>
      </Section>

      <Section title="What you can ask us to do">
        <p>
          Show you everything we hold about you. Correct it. Block or delete it. Give you a copy in
          a portable format. Email{' '}
          <a href={`mailto:${PRIVACY_CONTACT}`} className={LINK}>
            {PRIVACY_CONTACT}
          </a>{' '}
          and we will act on it. If you think we have got this wrong, you can also complain to the
          National Privacy Commission at{' '}
          <a href="https://privacy.gov.ph" className={LINK}>
            privacy.gov.ph
          </a>
          .
        </p>
      </Section>

      <Section title="How we protect it">
        <p>
          Your rows are locked to your own account in the database, and the browser never carries a
          server key. If a breach ever puts your data at real risk, we will tell you and the NPC
          within 72 hours of finding out.
        </p>
      </Section>

      <Section title="If this notice changes">
        <p>
          We will show it again and ask you to agree before using your data in any new way.
        </p>
      </Section>

      <Section title="If you are under 18">
        <p>Please use this with a parent or guardian's permission.</p>
      </Section>
    </>
  )
}

const TITLES = {
  consent: 'Privacy Notice',
  handle: 'Choose your handle',
  read: 'Privacy Notice',
}

export default function PrivacyDialog({
  open = false,
  mode = 'read',
  user = null,
  supabase = null,
  onConsent,
  onHandleSaved,
  onClose,
  onSignOut,
}) {
  const ref = useRef(null)
  const [agreed, setAgreed] = useState(false)
  const [handleInput, setHandleInput] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  // showModal() gives the focus trap, the backdrop and Escape for free. Calling
  // close() here also fires onClose, which the parent already handled.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    else if (!open && el.open) el.close()
  }, [open])

  // A fresh step starts clean: no half-typed handle, no stale error.
  useEffect(() => {
    setError(null)
    setAgreed(false)
  }, [mode, open])

  const dismiss = () => {
    if (saving) return
    onClose?.()
  }

  const accept = async () => {
    if (!supabase) return
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.auth.updateUser({ data: consentRecord() })
    setSaving(false)
    if (err) {
      // The handle is never offered without a recorded agreement.
      setError('Could not save your agreement — try again.')
      return
    }
    onConsent?.()
  }

  const submitHandle = async (e) => {
    e.preventDefault()
    const invalid = validateHandle(handleInput)
    if (invalid) {
      setError(invalid)
      return
    }
    setSaving(true)
    setError(null)
    const { data, error: err } = await saveHandle(supabase, user.id, handleInput)
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    setHandleInput('')
    onHandleSaved?.(data)
  }

  return (
    <dialog
      ref={ref}
      onClose={() => onClose?.()}
      aria-labelledby="privacy-title"
      className="w-[min(34rem,92vw)] rounded-2xl border border-white/10 bg-heat-deep p-0 text-slate-200 shadow-hud backdrop:bg-black/70"
    >
      <div className="flex max-h-[85vh] flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <h2 id="privacy-title" className="text-sm font-semibold text-white">
            {TITLES[mode] ?? TITLES.read}
          </h2>
          <button type="button" onClick={dismiss} className={SECONDARY} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="bih-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {mode === 'handle' ? (
            <form id="handle-form" onSubmit={submitHandle}>
              <p className="text-xs leading-5 text-slate-300">
                Pick the name other players will see. Letters, numbers and underscores, 3–20
                characters. Your Google name and email are never shown.
              </p>
              <label htmlFor="handle-input" className="mt-4 block text-xs font-medium text-slate-200">
                Your handle
              </label>
              <input
                id="handle-input"
                value={handleInput}
                onChange={(e) => setHandleInput(e.target.value)}
                maxLength={20}
                autoComplete="off"
                className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
              />
            </form>
          ) : (
            <>
              <Notice />
              {mode === 'consent' && (
                <label className="mt-4 flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-xs leading-5 text-slate-200">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-heat-amber focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
                  />
                  <span>
                    I have read this notice and agree to the collection and use described above.
                  </span>
                </label>
              )}
              {mode === 'read' && !user && (
                <p className="mt-4 text-xs text-slate-400">
                  Signing in means you agree to this notice.
                </p>
              )}
            </>
          )}

          {error && (
            <p role="alert" className="mt-3 text-xs text-rose-300">
              {error}
            </p>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-white/10 px-4 py-3 sm:flex-row sm:justify-end">
          {(mode === 'consent' || mode === 'handle') && (
            <button type="button" onClick={() => onSignOut?.()} disabled={saving} className={SECONDARY}>
              Sign out
            </button>
          )}

          {mode === 'consent' && (
            <button type="button" onClick={accept} disabled={!agreed || saving} className={PRIMARY}>
              {saving ? 'Saving…' : 'Agree and continue'}
            </button>
          )}

          {mode === 'handle' && (
            <button type="submit" form="handle-form" disabled={saving} className={PRIMARY}>
              {saving ? 'Saving…' : 'Save handle'}
            </button>
          )}

          {mode === 'read' && (
            <button type="button" onClick={dismiss} className={PRIMARY}>
              Close
            </button>
          )}
        </footer>
      </div>
    </dialog>
  )
}
