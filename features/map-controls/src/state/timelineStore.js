// Bicol In-Heat — map-controls timeline store (slice 2)
// Zustand-compatible surface: getState / setState / subscribe / actions.
// Pure (no React, no Leaflet) so node --test can import it directly.
//
// Contract: timestamps come from the host/data. Accepted forms are ISO date
// strings ('YYYY-MM-DD' or longer), Date objects, or finite numbers (e.g. years).
// Labels are derived from the supplied value only — this module never invents dates.

export const PLAYBACK_MS = 900

export function isValidTimestamp(value) {
  if (value instanceof Date) return !Number.isNaN(value.getTime())
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value === 'string') {
    const s = value.trim()
    return /^\d{4}-\d{2}-\d{2}/.test(s) && !Number.isNaN(Date.parse(s))
  }
  return false
}

export function formatTimestamp(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'string') {
    const s = value.trim()
    if (/^\d{4}-\d{2}-\d{2}/.test(s) && !Number.isNaN(Date.parse(s))) return s.slice(0, 10)
  }
  return '—'
}

export function normalizeTimestamps(list) {
  return Array.isArray(list) ? list.filter(isValidTimestamp) : []
}

export function clampIndex(index, length) {
  if (!Number.isFinite(index) || length <= 0) return 0
  const i = Math.trunc(index)
  if (i < 0) return 0
  return i > length - 1 ? length - 1 : i
}

export function wrapIndex(index, length) {
  if (length <= 0) return 0
  return ((Math.trunc(index) % length) + length) % length
}

export function clampZoom(zoom, min = 2, max = 18) {
  const lo = Number.isFinite(min) ? min : 2
  const hi = Number.isFinite(max) ? max : 18
  const low = Math.min(lo, hi)
  const high = Math.max(lo, hi)
  if (!Number.isFinite(zoom)) return low
  return Math.min(high, Math.max(low, zoom))
}

// Layer-registry seam. layer-uhi-terrain owns the real registry (not shipped yet).
// Expected shape: { layers: [{ id, label, kind, available? }], isActive?(id), setActive?(id, on) }
// Fallback until that lands: host passes onLayerChange(id, nextActive).
export function canToggleLayer(registry, layerId, onLayerChange) {
  if (!layerId) return false
  if (Array.isArray(registry?.layers)) {
    const layer = registry.layers.find((l) => l?.id === layerId)
    if (!layer || layer.available === false) return false
  }
  return typeof registry?.setActive === 'function' || typeof onLayerChange === 'function'
}

const sameTimestamps = (a, b) => a.length === b.length && a.every((v, i) => Object.is(v, b[i]))

export function createTimelineStore(options = {}) {
  const timestamps = normalizeTimestamps(options.timestamps)
  let state = {
    timestamps,
    index: clampIndex(options.index ?? 0, timestamps.length),
    playing: false,
    intervalMs: options.intervalMs ?? PLAYBACK_MS,
  }
  const listeners = new Set()

  const getState = () => state

  const setState = (partial, replace) => {
    const patch = typeof partial === 'function' ? partial(state) : partial
    if (!patch) return state
    const next = replace ? { ...patch } : { ...state, ...patch }
    if (!Array.isArray(next.timestamps)) next.timestamps = []
    next.index = clampIndex(next.index, next.timestamps.length)
    // Nothing to advance: keep autoplay off (one-item and empty lists).
    if (next.timestamps.length < 2) next.playing = false
    const unchanged =
      next.index === state.index &&
      next.playing === state.playing &&
      next.intervalMs === state.intervalMs &&
      sameTimestamps(next.timestamps, state.timestamps)
    if (unchanged) return state
    const prev = state
    state = next
    for (const listener of listeners) listener(state, prev)
    return state
  }

  const subscribe = (listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  const actions = {
    setTimestamps(list) {
      const next = normalizeTimestamps(list)
      setState((s) => ({ timestamps: next, index: clampIndex(s.index, next.length) }))
    },
    seek(index) {
      setState((s) => ({ index: clampIndex(index, s.timestamps.length) }))
    },
    next() {
      setState((s) => ({ index: wrapIndex(s.index + 1, s.timestamps.length) }))
    },
    prev() {
      setState((s) => ({ index: wrapIndex(s.index - 1, s.timestamps.length) }))
    },
    tick() {
      setState((s) => ({ index: wrapIndex(s.index + 1, s.timestamps.length) }))
    },
    play() {
      setState((s) => ({ playing: s.timestamps.length > 1 }))
    },
    pause() {
      setState({ playing: false })
    },
    toggle() {
      setState((s) => ({ playing: s.timestamps.length > 1 ? !s.playing : false }))
    },
  }

  return { getState, setState, subscribe, actions }
}

export const timelineStore = createTimelineStore()
