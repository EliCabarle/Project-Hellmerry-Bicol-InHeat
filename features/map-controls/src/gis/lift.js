// Extrusion depth + hover lift for the 3D map entity. Pure maths only: no React, no MapLibre.
// Depth reuses the same domain as the fill colour (yearRamp), so height and hue tell the
// same story and neither can drift from the other.
import { TREND_MAX, TREND_MIN, YEAR_MAX, YEAR_MIN, recordForYear } from './yearRamp.js'

export const DEPTH_BASE = 3000 // metres, flat / pending areas still stand up
export const DEPTH_SPAN = 9000 // metres added across the full colour domain
export const LIFT_RATIO = 0.30 // of the area's own depth
export const LIFT_MS = 150

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
