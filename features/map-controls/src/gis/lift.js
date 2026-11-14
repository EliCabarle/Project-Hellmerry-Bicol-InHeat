// Extrusion depth + hover lift for the 3D map entity. Pure maths only: no React, no MapLibre.
// Depth reuses the same domain as the fill colour (yearRamp), so height and hue tell the
// same story and neither can drift from the other.
import { TREND_MAX, TREND_MIN, YEAR_MAX, YEAR_MIN, recordForYear } from './yearRamp.js'
import { easeOutCubic } from './trace.js'

export const DEPTH_BASE = 3000 // metres, flat / pending areas still stand up
export const DEPTH_SPAN = 9000 // metres added across the full colour domain
export const LIFT_RATIO = 0.30 // of the area's own depth
export const LIFT_MS = 150

// 3D selection spotlight: when an area is selected, every other area flattens to 0 m.
export const FLATTEN_3D_MS = 380 // ms to fall flat / rise back, ease-out cubic
export const FLAT_FLOOR_M = 0 // flattened neighbours sit exactly at 0 m
export const FLAT_FILL_ALPHA = 0.35 // subtle ground footprint for flattened neighbours
export const FLATTEN_EASING = easeOutCubic

const clamp01 = (v) => Math.min(1, Math.max(0, v))

export function depthFor(feature, viewMode = 'trend', year = null) {
  const n = feature?.properties?.narrative
  if (!n) return DEPTH_BASE
  let norm = 0
  if (viewMode === 'year') {
    const row = recordForYear(n.series, year) ?? n.latest
    const value = row?.mean_heat_index_c
    if (Number.isFinite(value)) norm = clamp01((value - YEAR_MIN) / (YEAR_MAX - YEAR_MIN))
  } else {
    const slope = Math.abs(n.trend?.slope_c_per_year ?? NaN)
    if (Number.isFinite(slope)) norm = clamp01((slope - TREND_MIN) / (TREND_MAX - TREND_MIN))
  }
  return DEPTH_BASE + norm * DEPTH_SPAN
}

// Selection and hover are mutually exclusive cases, never summed, so one area cannot double-lift.
export function liftFor(key, { hoveredKey = null, selectedKey = null } = {}, depth = DEPTH_BASE) {
  const base = Number.isFinite(depth) ? depth : DEPTH_BASE
  return key != null && (key === hoveredKey || key === selectedKey) ? base * LIFT_RATIO : 0
}

// ---- flatten spotlight (3D only) ----

// Per-feature current flatten factor in [0, 1]: 0 = full extrusion height, 1 = flat at 0 m.
// Module singleton: only one 3D entity mounts at a time.
const flatFactors = new Map()
const flatAnims = new Map() // key -> { start, target }

export function flatTarget(key, selectedJoinKey) {
  if (selectedJoinKey == null) return 0
  return key === selectedJoinKey ? 0 : 1
}

export function getFlatFactor(key) {
  return flatFactors.get(key) ?? 0
}

export function clearFlatFactors() {
  flatFactors.clear()
  flatAnims.clear()
}

export function flatHeight(depth, lift, flatFactor) {
  return Math.max(FLAT_FLOOR_M, (depth + lift) * (1 - flatFactor))
}

// Advance every active key toward its flatten target over FLATTEN_3D_MS using frame delta time.
// Returns { changed: Map<key, value>, active: boolean }.
export function stepFlats(now, keys, selectedJoinKey) {
  const changed = new Map()
  let active = false
  for (const key of keys) {
    const target = flatTarget(key, selectedJoinKey)
    const current = flatFactors.get(key) ?? 0
    if (Math.abs(current - target) < 0.001) {
      flatFactors.set(key, target)
      flatAnims.delete(key)
      continue
    }
    const prev = flatAnims.get(key)
    const start = prev && prev.target === target ? prev.start : now
    flatAnims.set(key, { start, target })
    const p = Math.min(1, (now - start) / FLATTEN_3D_MS)
    const eased = FLATTEN_EASING(p)
    const value = current + (target - current) * eased
    flatFactors.set(key, value)
    changed.set(key, value)
    if (p >= 1) {
      flatFactors.set(key, target)
      changed.set(key, target)
      flatAnims.delete(key)
    } else {
      active = true
    }
  }
  return { changed, active }
}

// Snap every key to its target in one call: zero intermediate frames (prefers-reduced-motion).
export function snapFlats(keys, selectedJoinKey) {
  const changed = new Map()
  for (const key of keys) {
    const target = flatTarget(key, selectedJoinKey)
    flatFactors.set(key, target)
    flatAnims.delete(key)
    changed.set(key, target)
  }
  return changed
}
