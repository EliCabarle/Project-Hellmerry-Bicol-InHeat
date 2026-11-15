// The one network seam in this slice: the server-side QA endpoint. The model
// key and every model call stay in apps/api (CONCEPT 6d) — the browser holds
// neither. VITE_API_BASE_URL points at Render in production; empty in dev so
// the Vite proxy (/api -> localhost:8000) keeps working.
// Guarded for node tests, which have no import.meta.env (same reason as
// map-controls/src/data/dailyStore.js). Trailing slash trimmed so a dashboard
// value like "https://host/" does not produce "//api/qa".
const ENV = typeof import.meta !== 'undefined' ? import.meta.env : undefined
const BASE_URL = String(ENV?.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
const QA_URL = `${BASE_URL}/api/qa`

/** @param {string} text */
async function send(text) {
  const res = await fetch(QA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: text }),
  })
  if (!res.ok) {
    // FastAPI puts the reason in `detail`; a bare "500" would hide it.
    const body = await res.text()
    let detail
    try {
      detail = JSON.parse(body).detail
    } catch {
      detail = body.slice(0, 200)
    }
    throw new Error(`${res.status} ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`)
  }
  const data = await res.json()
  return {
    text: data.answer || 'I could not produce an answer from the available data.',
    done: true,
    sources: Array.isArray(data.sources) ? data.sources : [],
  }
}

export const qaAdapter = { send }

export default qaAdapter
