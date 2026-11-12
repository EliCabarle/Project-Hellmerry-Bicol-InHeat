// Pure colour ramps for the map. Two different questions:
// - trend: how fast is this municipality warming? (rate ramp)
// - year: what did the mean heat index look like in the selected year? (heat ramp)

export const YEAR_MIN = 31
export const YEAR_MAX = 36.5
export const YEAR_BREAKS = [31, 32, 33, 34, 35, 36.5]
export const YEAR_COLORS = ['#fde68a', '#fbbf24', '#fb923c', '#f97316', '#b91c1c']

export const TREND_MIN = 0.03
export const TREND_MAX = 0.065
export const TREND_BREAKS = [0.03, 0.037, 0.044, 0.051, 0.058, 0.065]
export const TREND_COLORS = ['#fde68a', '#fbbf24', '#fb923c', '#f97316', '#b91c1c']

// PAGASA daily bands (CONCEPT §6c-4), classified by lower bound on the
// displayed one-decimal value. Danger floor (42) matches the pipeline's
// danger-day comparison: heat_index_max_c >= DANGER_C (calculate_trends.py:79),
// i.e. 42.0 °C itself is a danger day. Cool blue→indigo ladder so it never
// reads as the YEAR amber ramp; greyscale lightness strictly decreases.
// Adjacent fills: 2.02–2.10:1 — the WCAG ceiling for 5 bands (3:1 would need
// an 81:1 luminance span, impossible within [0,1]); still above YEAR's 1.24–2.31.
export const DAY_BANDS = [
  { min: 52, label: 'Extreme Danger', color: '#0b0925' },
  { min: 42, label: 'Danger', color: '#2637a6' },
  { min: 33, label: 'Extreme Caution', color: '#4370db' },
  { min: 27, label: 'Caution', color: '#90b2df' },
  { min: -Infinity, label: 'Below Caution', color: '#f9fafb' },
]
// Dark achromatic veil: 3.47:1 from Caution (the required distinction),
// neutral hue vs every blue band, and clearly not the dark pending fill.
export const DAY_NO_DATA = '#475569'

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return null
  return Math.min(max, Math.max(min, value))
}

export function binIndex(value, breaks) {
  if (!Array.isArray(breaks) || breaks.length < 2 || !Number.isFinite(value)) return -1
  if (value < breaks[0] || value > breaks[breaks.length - 1]) return -1
  for (let i = 0; i < breaks.length - 1; i += 1) {
    if (value <= breaks[i + 1]) return i
  }
  return breaks.length - 2
}

export function yearColor(value) {
  if (!Number.isFinite(value)) return null
  const bounded = Math.min(YEAR_MAX, Math.max(YEAR_MIN, value))
  const i = binIndex(bounded, YEAR_BREAKS)
  return i < 0 ? null : YEAR_COLORS[i]
}

export function trendColor(slope) {
  if (!Number.isFinite(slope) || slope <= 0) return null
  const bounded = Math.min(TREND_MAX, Math.max(TREND_MIN, slope))
  const i = binIndex(bounded, TREND_BREAKS)
  return i < 0 ? null : TREND_COLORS[Math.min(i, TREND_COLORS.length - 1)]
}

// Classify on the displayed one-decimal value so legend text, tooltip text and
// fill always agree. A missing day is null — never a band.
export function dayBand(value) {
  if (!Number.isFinite(value)) return null
  const shown = Math.round(value * 10) / 10
  return DAY_BANDS.find((band) => shown >= band.min)?.label ?? null
}

export function dayColor(value) {
  if (!Number.isFinite(value)) return null
  const shown = Math.round(value * 10) / 10
  return DAY_BANDS.find((band) => shown >= band.min)?.color ?? null
}

export function dayLegend() {
  const rows = [...DAY_BANDS].reverse().map((band, i, all) => {
    const next = all[i + 1]
    const label = band.min === -Infinity
      ? '<27 Below Caution'
      : next && next.min !== -Infinity
        ? `${band.min}–${next.min - 1} ${band.label}`
        : `≥${band.min} ${band.label}`
    return { color: band.color, label }
  })
  rows.push({ color: DAY_NO_DATA, label: 'No data for this day' })
  return rows
}

export function recordForYear(series, year) {
  if (!Array.isArray(series) || !Number.isFinite(Number(year))) return null
  const target = Number(year)
  return series.find((row) => Number(row?.year) === target) ?? null
}

export function yearLabel(year) {
  return Number.isFinite(Number(year)) ? String(Number(year)) : '—'
}

export function formatTrend(slope) {
  return Number.isFinite(slope) ? `${slope >= 0 ? '+' : ''}${slope.toFixed(3)} °C/yr` : '—'
}

export function yearLegend() {
  return YEAR_COLORS.map((color, i) => ({
    color,
    label: i === YEAR_COLORS.length - 1
      ? `${YEAR_BREAKS[i]}+`
      : `${YEAR_BREAKS[i]}–${YEAR_BREAKS[i + 1]}`,
  }))
}

export function trendLegend() {
  return TREND_COLORS.map((color, i) => ({
    color,
    label: i === TREND_COLORS.length - 1
      ? `${TREND_BREAKS[i]}+`
      : `${TREND_BREAKS[i].toFixed(3)}–${TREND_BREAKS[i + 1].toFixed(3)}`,
  }))
}

export function clampYearValue(value) {
  return clamp(value, YEAR_MIN, YEAR_MAX)
}
