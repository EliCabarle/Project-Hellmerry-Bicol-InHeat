// Bicol In-Heat — daily data loader (per-year lazy files).
// Data contract (produced by the pipeline, served from /data/daily/):
//   index.json {start, end, years:[...], ids:[...], scale:0.1, variable,
//               units:'°C', method, generated_at}
//   {YYYY}.json {year, start:'YYYY-01-01', n_days, v:[[...]]}
//               v[i] = daily values for ids[i], ints in tenths of °C, null = missing.
//
// This module owns data state only (index + year files + LRU); the selected
// date/mode live in timelineStore. Errors become state — nothing here throws.
// yearStates is keyed per year, so concurrent loads of different years can
// never clobber each other; same-year requests share one fetch.

export const DAILY_MISSING_REASON = "Daily data isn't in this build"

const defaultBaseUrl = () => {
  // Vite exposes BASE_URL; node has no import.meta.env — guard for tests.
  try {
    const env = typeof import.meta !== 'undefined' ? import.meta.env : undefined
    if (env && typeof env.BASE_URL === 'string' && env.BASE_URL) return env.BASE_URL
  } catch {
    /* import.meta.env unavailable — fall through */
  }
  return '/'
}

const joinUrl = (base, path) => `${String(base ?? '/').replace(/\/+$/, '')}/${path}`

const errText = (e) => (e && e.message ? e.message : String(e))

// Map<narrativeId, °C|null> for one day index. Never invents a value:
// null/short rows stay null (missing). Contract: v holds ints in tenths of °C,
// null is the only missing marker.
export function valuesForDay(yearFile, dayIndex, ids, scale = 0.1) {
  if (!yearFile || !Array.isArray(yearFile.v) || !Array.isArray(ids)) return null
  if (!Number.isInteger(dayIndex) || dayIndex < 0) return null
  const out = new Map()
  for (let i = 0; i < ids.length; i += 1) {
    const row = yearFile.v[i]
    const raw = Array.isArray(row) ? row[dayIndex] : undefined
    out.set(ids[i], Number.isFinite(raw) ? Math.round(raw * scale * 10) / 10 : null)
  }
  return out
}

export function createDailyStore({
  fetchImpl,
  baseUrl,
  cacheYears = 3,
  indexPath = 'data/daily/index.json',
  yearPath = (year) => `data/daily/${year}.json`,
} = {}) {
  const fetchFn = fetchImpl ?? ((url) => globalThis.fetch(url))
  const base = baseUrl ?? defaultBaseUrl()

  // Small LRU over ready year files (never precache all years).
  const cache = new Map()
  const cacheLimit = Number.isFinite(cacheYears) && cacheYears > 0 ? Math.trunc(cacheYears) : 3

  let indexState = { status: 'idle', meta: null, reason: null, error: null }
  let indexPromise = null
  const inflight = new Map() // year -> promise of shared request
  const yearStates = new Map() // year -> {status, file, error}

  async function fetchJson(path) {
    const res = await fetchFn(joinUrl(base, path))
    if (!res || typeof res.ok !== 'boolean') throw new Error('bad response')
    if (res.status === 404) return { notFound: true }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return { json: await res.json() }
  }

  function touch(year, file) {
    cache.delete(year)
    cache.set(year, file)
    while (cache.size > cacheLimit) cache.delete(cache.keys().next().value)
  }

  function loadIndex() {
    if (indexState.status === 'ready' || indexState.status === 'missing') {
      return Promise.resolve(indexState)
    }
    if (indexPromise) return indexPromise
    indexState = { ...indexState, status: 'loading', error: null }
    indexPromise = (async () => {
      try {
        const res = await fetchJson(indexPath)
        if (res.notFound) {
          indexState = { status: 'missing', meta: null, reason: DAILY_MISSING_REASON, error: null }
        } else {
          const meta = res.json
          if (!meta || !Array.isArray(meta.years) || !Array.isArray(meta.ids)) {
            throw new Error('index.json has an unexpected shape')
          }
          indexState = { status: 'ready', meta, reason: null, error: null }
        }
      } catch (err) {
        indexState = { status: 'error', meta: null, reason: null, error: errText(err) }
      } finally {
        indexPromise = null
      }
      return indexState
    })()
    return indexPromise
  }

  async function requestYear(y) {
    try {
      const res = await fetchJson(yearPath(y))
      if (res.notFound) {
        const missing = { status: 'missing', file: null, error: DAILY_MISSING_REASON }
        yearStates.set(y, missing)
        return missing
      }
      const file = res.json
      if (!file || !Array.isArray(file.v)) throw new Error(`${y}.json has an unexpected shape`)
      touch(y, file)
      const ready = { status: 'ready', file, error: null }
      yearStates.set(y, ready)
      return ready
    } catch (err) {
      const failed = { status: 'error', file: null, error: errText(err) }
      yearStates.set(y, failed)
      return failed
    }
  }

  function loadYear(year) {
    const y = Math.trunc(Number(year))
    if (!Number.isFinite(y)) {
      return Promise.resolve({ status: 'error', file: null, error: 'invalid year' })
    }
    const cached = cache.get(y)
    if (cached) {
      const ready = { status: 'ready', file: cached, error: null }
      yearStates.set(y, ready)
      return Promise.resolve(ready)
    }
    // Same-year dedupe: concurrent requests share one fetch.
    const existing = inflight.get(y)
    if (existing) return existing
    yearStates.set(y, { status: 'loading', file: null, error: null })
    const promise = requestYear(y).finally(() => {
      if (inflight.get(y) === promise) inflight.delete(y)
    })
    inflight.set(y, promise)
    return promise
  }

  return {
    loadIndex,
    loadYear,
    valuesForDay,
    getState: () => ({ index: indexState, years: yearStates, cachedYears: cache.size }),
    getYearState: (year) => yearStates.get(Math.trunc(Number(year))) ?? { status: 'idle', file: null, error: null },
  }
}

// App-wide instance: fetch/baseUrl defaults, 3-year LRU.
export const dailyStore = createDailyStore()
