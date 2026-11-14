import { useCallback, useEffect, useState } from 'react'

const QA_URL = '/api/qa'

export default function ChatPanel() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  )

  useEffect(() => {
    if (typeof navigator === 'undefined') return undefined
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const ask = useCallback(
    async (e) => {
      e?.preventDefault()
      const trimmed = question.trim()
      if (!trimmed || loading || !online) return
      setLoading(true)
      setError('')
      setAnswer('')
      setSources([])
      try {
        const res = await fetch(QA_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: trimmed }),
        })
        if (!res.ok) {
          const text = await res.text()
          let detail
          try {
            detail = JSON.parse(text).detail
          } catch {
            detail = text.slice(0, 200)
          }
          throw new Error(
            `${res.status} ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`
          )
        }
        const data = await res.json()
        setAnswer(data.answer || '')
        setSources(Array.isArray(data.sources) ? data.sources : [])
      } catch (err) {
        console.error('[qa]', err)
        setError(
          import.meta.env.DEV
            ? `QA failed: ${err.message}`
            : 'Failed to get an answer. Please try again.'
        )
      } finally {
        setLoading(false)
      }
    },
    [question, loading, online]
  )

  return (
    <section className="flex flex-col gap-4 p-4 sm:p-6">
      <header className="flex items-center gap-2">
        <span
          className="inline-flex h-6 w-6 shrink-0 rounded-lg bg-heat-amber text-[10px] font-black text-slate-950 place-items-center"
          aria-hidden="true"
        >
          QA
        </span>
        <h2 className="text-sm font-semibold text-heat-ink sm:text-base">
          QA Chatbot
        </h2>
      </header>

      {!online && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-900/20 px-3 py-2 text-sm text-amber-200">
          QA requires an internet connection.
        </div>
      )}

      <form onSubmit={ask} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          aria-label="Ask a question about Bicol In-Heat"
          className="flex-1 min-w-0 rounded-lg border border-white/10 bg-heat-surface px-3 py-2 text-sm text-heat-ink placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-heat-amber disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="Ask about heat trends, drivers, or the methodology..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={!online || loading}
        />
        <button
          type="submit"
          disabled={loading || !online || !question.trim()}
          className={`cursor-pointer min-h-11 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            loading
              ? 'bg-slate-600 text-slate-200'
              : 'bg-heat-amber text-slate-950 hover:bg-heat-amber/90'
          }`}
        >
          {loading ? 'Thinking...' : 'Ask'}
        </button>
      </form>

      {loading && (
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-2 py-4">
          <div className="bih-spinner" aria-hidden="true" />
          <p className="text-xs text-slate-400 animate-pulse">
            Searching documents and analyzing data...
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-heat-hot">
          {error}
        </p>
      )}

      {answer && (
        <div className="rounded-lg border border-white/10 bg-heat-surface/60 p-3 sm:p-4 text-sm text-heat-ink leading-relaxed whitespace-pre-wrap">
          {answer}
        </div>
      )}

      {sources.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="text-xs text-slate-500">Sources:</span>
          {sources.map((src, i) => (
            <span
              key={i}
              className="rounded-md border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] text-slate-300"
            >
              {src}
            </span>
          ))}
        </div>
      )}

      {(answer || error) && (
        <p className="mt-2 text-[10px] text-slate-500">
          AI-generated summary based on Bicol In-Heat data.
        </p>
      )}
    </section>
  )
}
