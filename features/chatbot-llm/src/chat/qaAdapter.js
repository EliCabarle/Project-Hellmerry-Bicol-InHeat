// The one network seam in this slice: the server-side QA endpoint. The model
// key and every model call stay in apps/api (CONCEPT 6d) — the browser holds
// neither, and this URL is relative so no host or key is baked into the bundle.
const QA_URL = '/api/qa'

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
