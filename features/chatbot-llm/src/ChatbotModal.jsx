import { useCallback, useEffect, useRef } from 'react'
import { useChat } from './chat/useChat.js'
import { qaAdapter } from './chat/qaAdapter.js'
import { IconClose, IconRobot, IconSend } from './components/ChatIcons.jsx'

const SUGGESTIONS = [
  'Why is it so hot in this area?',
  'Which 5 municipalities are warming fastest?',
  'Why is LST not the same as heat index?',
]

/**
 * Collect focusable, visible elements inside the dialog for the hand-rolled
 * focus trap (Tab cycles within the modal, never out to the launcher).
 */
function focusableElements(container) {
  if (!container) return []
  return Array.from(
    container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => el.offsetParent !== null)
}

export default function ChatbotModal({
  open = false,
  onClose,
  returnFocusTo = null,
  title = 'Silli',
}) {
  const previousFocus = useRef(null)
  const dialogRef = useRef(null)
  const inputRef = useRef(null)
  const closeRef = useRef(null)

  const {
    messages,
    status,
    error,
    input,
    setInput,
    send,
    handleSubmit,
    retry,
    clear,
  } = useChat({ adapter: qaAdapter })

  // Open: capture the launcher, trap focus inside the dialog.
  // Close (this effect's cleanup): return focus to the launcher.
  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement
    const dialog = dialogRef.current
    ;(closeRef.current ?? inputRef.current)?.focus()
    return () => {
      const el = (returnFocusTo && returnFocusTo.current) ?? previousFocus.current
      if (el && typeof el.focus === 'function') el.focus()
    }
  }, [open, returnFocusTo])

  // Keyboard: Esc closes; Tab cycles focus inside the dialog only.
  useEffect(() => {
    if (!open) return
    const onKeydown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose?.()
        return
      }
      if (event.key === 'Tab') {
        const els = focusableElements(dialogRef.current)
        if (!els.length) return
        const index = els.indexOf(document.activeElement)
        let next
        if (event.shiftKey) next = index <= 0 ? els.length - 1 : index - 1
        else next = index >= els.length - 1 ? 0 : index + 1
        event.preventDefault()
        els[next]?.focus()
      }
    }
    document.addEventListener('keydown', onKeydown)
    return () => document.removeEventListener('keydown', onKeydown)
  }, [open, onClose])

  const handleBackdropClick = useCallback(
    (event) => {
      if (event.target === event.currentTarget) onClose?.()
    },
    [onClose],
  )

  const canSend = input.trim().length > 0 && status !== 'sending'

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-[900] bg-black/40 backdrop-blur-[2px]"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        className="fixed z-[910] inset-x-3 top-[calc(4.25rem+env(safe-area-inset-top))] bottom-[max(1rem,env(safe-area-inset-bottom))] flex flex-col rounded-2xl border border-white/10 bg-white text-slate-100 shadow-hud backdrop-blur-md bih-scroll sm:right-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(36rem,calc(100vw-2rem))] sm:max-h-[70vh] sm:-translate-x-1/2 sm:-translate-y-1/2"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chatbot-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <IconRobot className="h-4 w-4 shrink-0 text-heat-eco" aria-hidden="true" />
            <h2
              id="chatbot-title"
              className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200 sm:text-xs"
            >
              {title}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close chatbot"
            className="bih-btn inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3" aria-live="polite">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
              <IconRobot className="h-8 w-8 shrink-0 opacity-50" aria-hidden="true" />
              <p className="text-[11px] leading-5 text-center">
                Ask about heat-index trends, drivers, or the method behind them.
              </p>
              <div className="mt-1 flex flex-wrap justify-center gap-1.5">
                {SUGGESTIONS.map((text) => (
                  <button
                    key={text}
                    type="button"
                    onClick={() => send(text)}
                    className="bih-btn cursor-pointer rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/10 hover:text-white"
                  >
                    {text}
                  </button>
                ))}
              </div>
              <p className="text-[11px] leading-5 text-center text-slate-400">
                Press Esc to close.
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="shrink-0">
                      <IconRobot className="h-3 w-3 shrink-0 text-slate-500" aria-hidden="true" />
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] rounded-xl px-3 py-2 text-sm leading-5 ${
                      message.role === 'user'
                        ? 'bg-heat-amber text-slate-950'
                        : 'bg-white/10 border border-white/5 text-slate-200'
                    }`}
                  >
                    {message.text}
                  </div>
                  {/* Sources are CORE (CONCEPT 6d): the retrieved chunk paths
                      behind an answer stay visible under it. */}
                  {message.sources?.length > 0 && (
                    <ul className="max-w-[82%] list-none self-end text-[11px] leading-4 text-slate-400">
                      {message.sources.map((source) => (
                        <li key={source} className="truncate">
                          Source: {source}
                        </li>
                      ))}
                    </ul>
                  )}
                  {message.role === 'user' && (
                    <div className="shrink-0">
                      <IconRobot className="h-3 w-3 shrink-0 text-slate-500" aria-hidden="true" />
                    </div>
                  )}
                </div>
              ))}
              {status === 'sending' && (
                <div className="flex gap-2 justify-start">
                  <div className="shrink-0">
                    <IconRobot className="h-3 w-3 shrink-0 text-slate-500" aria-hidden="true" />
                  </div>
                  <div className="bg-white/10 border border-white/5 rounded-xl px-3 py-2 text-sm leading-5 text-slate-200">
                    <span className="flex items-center gap-0.5 text-slate-400">
                      assistant is typing<span className="animate-pulse" aria-hidden="true">…</span>
                    </span>
                  </div>
                </div>
              )}
              {error && (
                <div role="alert" className="rounded-lg border border-heat-hot/50 bg-heat-surface/80 px-3 py-2.5 text-xs text-rose-200">
                  <div className="flex items-start gap-2">
                    <span className="shrink-0">⚠</span>
                    <div>
                      <div className="font-semibold">{error}</div>
                      <button
                        type="button"
                        onClick={retry}
                        disabled={status === 'sending'}
                        className="bih-btn mt-1 cursor-pointer rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-semibold text-heat-amber hover:bg-white/10"
                      >
                        Try again
                      </button>
                      <button
                        type="button"
                        onClick={clear}
                        className="bih-btn mt-1 ml-2 cursor-pointer rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-semibold text-slate-400 hover:bg-white/10"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <footer className="border-t border-white/10 p-3 shrink-0">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <label htmlFor="chatbot-input" className="sr-only">
              Message
            </label>
            <input
              ref={inputRef}
              id="chatbot-input"
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type a message…"
              disabled={status === 'sending'}
              className="flex-1 min-w-0 rounded-md border border-white/10 bg-black/25 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
            />
            <button
              type="submit"
              disabled={!canSend}
              className="bih-btn shrink-0 cursor-pointer min-h-11 min-w-11 rounded-md border border-white/10 bg-heat-amber text-slate-950 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-200"
            >
              <IconSend className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </button>
          </form>
          <p className="mt-1 text-[11px] leading-4 text-slate-400">
            Powered by Silli RAG + NASA/PAGASA document store.
          </p>
        </footer>
      </div>
    </>
  )
}
