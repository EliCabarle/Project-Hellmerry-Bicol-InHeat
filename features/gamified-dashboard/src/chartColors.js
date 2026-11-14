// Dashboard chart colours. The ramps are re-exported from the map's single
// source of truth — this file must never invent a new ramp (root AGENTS rule).
// Everything else mirrors the heat-* tokens in apps/web/tailwind.config.js.

export {
  YEAR_COLORS,
  YEAR_BREAKS,
  TREND_COLORS,
  TREND_BREAKS,
  trendColor,
} from '../../map-controls/src/gis/yearRamp.js'

// UI chrome (axis ticks, grid, tooltip) — clay-world equivalents of the
// heat-* tokens. Data accents below keep their map-ramp identity.
export const AXIS_TICK = '#64748B'
export const GRID_LINE = '#E6E3F7'
export const TOOLTIP_BG = '#FFFFFF'

export const HEAT_AMBER = '#fbbf24'
export const HEAT_COOL = '#67e8f9'
export const HEAT_ORANGE = '#fb923c'
export const HEAT_HOT = '#ef4444'
export const HEAT_MUTED = '#475569'
export const HEAT_SIG = '#BE123C'

// Danger-day bands: neutral when an LGU logged none, deepening toward extreme.
export const DANGER_BAND_COLORS = [HEAT_MUTED, HEAT_AMBER, HEAT_ORANGE, HEAT_HOT]

export const MONO_FONT = 'Consolas, ui-monospace, SFMono-Regular, monospace'
