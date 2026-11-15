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

// UI chrome follows the shell's theme variables. Data accents below keep
// their map-ramp identity.
export const AXIS_TICK = 'var(--bih-muted)'
export const GRID_LINE = 'var(--bih-line)'
export const TOOLTIP_BG = 'var(--bih-surface)'

export const HEAT_AMBER = '#fbbf24'
export const HEAT_COOL = '#67e8f9'
export const HEAT_ORANGE = '#fb923c'
export const HEAT_HOT = '#ef4444'
export const HEAT_MUTED = '#475569'
export const HEAT_SIG = '#BE123C'

// Danger-day bands: neutral when an LGU logged none, deepening toward extreme.
export const DANGER_BAND_COLORS = [HEAT_MUTED, HEAT_AMBER, HEAT_ORANGE, HEAT_HOT]

export const MONO_FONT = 'Consolas, ui-monospace, SFMono-Regular, monospace'
