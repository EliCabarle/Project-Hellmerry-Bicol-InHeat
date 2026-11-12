// Bicol In-Heat — map-controls timeline store (slice 2)
// Zustand-compatible surface: getState / setState / subscribe / actions.
// Pure (no React, no Leaflet) so node --test can import it directly.
//
// Contract: timestamps come from the host/data. Accepted forms are ISO date
// strings ('YYYY-MM-DD' or longer), Date objects, or finite numbers (e.g. years).
// Labels are derived from the supplied value only — this module never invents dates.
//
// One store, one write path: year slider, day slider, date picker, search,
// prev/next and playback all dispatch the same setDate/setYear actions here.

import {
  addDays,
  clampDate,
  formatDate,
  isValidISO,
  parseISO,
  setDateYear,
} from './dateModel.js'

export const PLAYBACK_MS = 900
export const DAY_PLAY_MS = 150
export const DAY_STEP_CHOICES = [1, 7, 30]
export const DEFAULT_DAY_MD = '04-15' // mid dry season
// 'stop' pauses playback on Dec 31 of the selected year; 'continue' would
// cross into the next year (needs that year's file loaded first).
export const PLAY_AT_YEAR_END = 'stop'

export const VIEW_MODES = ['trend', 'year', 'day']

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

const yearOfTimestamp = (t) => {
  if (typeof t === 'number' && Number.isFinite(t)) return Math.trunc(t)
  const s = String(t ?? '')
  return /^\d{4}/.test(s) ? Number(s.slice(0, 4)) : NaN
}

export function createTimelineStore(options = {}) {
  const timestamps = normalizeTimestamps(options.timestamps)
  let state = {
    timestamps,
    index: clampIndex(options.index ?? 0, timestamps.length),
    playing: false,
    intervalMs: options.intervalMs ?? PLAYBACK_MS,
    viewMode: VIEW_MODES.includes(options.viewMode) ? options.viewMode : 'trend',
    date: isValidISO(options.date) ? options.date : null,
    range: null,
    dayStep: DAY_STEP_CHOICES.includes(Number(options.dayStep)) ? Number(options.dayStep) : 1,
  }
  const listeners = new Set()

  const getState = () => state

  const setState = (partial, replace) => {
    const patch = typeof partial === 'function' ? partial(state) : partial
    if (!patch) return state
    const next = replace ? { ...patch } : { ...state, ...patch }
    if (!Array.isArray(next.timestamps)) next.timestamps = []
    next.index = clampIndex(next.index, next.timestamps.length)
    if (!VIEW_MODES.includes(next.viewMode)) next.viewMode = 'trend'
    if (next.date != null && !isValidISO(next.date)) next.date = null
    if (!DAY_STEP_CHOICES.includes(next.dayStep)) next.dayStep = 1
    // Nothing to advance: autoplay off (one-item/empty lists; day needs a date).
    if (next.viewMode === 'day' ? !next.date : next.timestamps.length < 2) next.playing = false
    const unchanged =
      next.index === state.index &&
      next.playing === state.playing &&
      next.intervalMs === state.intervalMs &&
      next.viewMode === state.viewMode &&
      next.date === state.date &&
      next.dayStep === state.dayStep &&
      (next.range?.min ?? null) === (state.range?.min ?? null) &&
      (next.range?.max ?? null) === (state.range?.max ?? null) &&
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
    // Data period drives every clamp and the default day date — no constants.
    setRange(min, max) {
      if (!isValidISO(min) || !isValidISO(max)) return
      setState((s) => {
        if (s.range?.min === min && s.range?.max === max) return {}
        const patch = { range: { min, max } }
        if (!s.date) {
          const year = parseISO(max).y
          patch.date = clampDate(`${year}-${DEFAULT_DAY_MD}`, min, max)
        } else {
          const clamped = clampDate(s.date, min, max)
          if (clamped !== s.date) patch.date = clamped
        }
        return patch
      })
    },
    setViewMode(mode) {
      if (!VIEW_MODES.includes(mode)) return
      // Switching modes pauses playback — the other mode's clock must not run.
      setState((s) => (s.viewMode === mode ? {} : { viewMode: mode, playing: false }))
    },
    setDate(iso) {
      if (!isValidISO(iso)) return
      setState((s) => {
        const next = s.range ? clampDate(iso, s.range.min, s.range.max) : iso
        return next === s.date ? {} : { date: next }
      })
    },
    // One write path for every year control: seeks the year slider and rewrites
    // the date's year (Feb 29 -> Feb 28 allowed here; search never clamps).
    setYear(year) {
      const y = Math.trunc(Number(year))
      if (!Number.isFinite(y)) return
      setState((s) => {
        const patch = {}
        if (s.range) {
          const lo = parseISO(s.range.min).y
          const hi = parseISO(s.range.max).y
          if (y < lo || y > hi) return {}
        }
        if (s.timestamps.length) {
          const idx = s.timestamps.findIndex((t) => yearOfTimestamp(t) === y)
          if (idx >= 0 && idx !== s.index) patch.index = idx
        }
        const base = s.date ?? `${y}-${DEFAULT_DAY_MD}`
        const nextDate = clampDate(setDateYear(base, y), s.range?.min, s.range?.max)
        if (nextDate !== s.date) patch.date = nextDate
        return patch
      })
    },
    stepDay(delta) {
      const n = Math.trunc(Number(delta))
      if (!Number.isFinite(n) || n === 0) return
      setState((s) => {
        if (!s.date) return {}
        const next = clampDate(addDays(s.date, n), s.range?.min, s.range?.max)
        return next && next !== s.date ? { date: next } : {}
      })
    },
    setDayStep(step) {
      const n = Number(step)
      setState((s) => (DAY_STEP_CHOICES.includes(n) && n !== s.dayStep ? { dayStep: n } : {}))
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
    // Day playback tick. Stops at Dec 31 of the selected year (PLAY_AT_YEAR_END).
    dayTick() {
      setState((s) => {
        if (!s.date) return {}
        const p = parseISO(s.date)
        const next = addDays(s.date, s.dayStep)
        if (!next) return {}
        const np = parseISO(next)
        const beyond = s.range && next > s.range.max
        if (beyond) {
          return { date: s.range.max, playing: false }
        }
        if (np.y !== p.y && PLAY_AT_YEAR_END === 'stop') {
          const yearEnd = formatDate(p.y, 12, 31)
          const target = s.range && yearEnd > s.range.max ? s.range.max : yearEnd
          return { date: target, playing: false }
        }
        return { date: next }
      })
    },
    play() {
      setState((s) => ({
        playing: s.viewMode === 'day' ? Boolean(s.date) : s.timestamps.length > 1,
      }))
    },
    pause() {
      setState({ playing: false })
    },
    toggle() {
      setState((s) => {
        const canPlay = s.viewMode === 'day' ? Boolean(s.date) : s.timestamps.length > 1
        return { playing: canPlay ? !s.playing : false }
      })
    },
  }

  return { getState, setState, subscribe, actions }
}

export const timelineStore = createTimelineStore()
