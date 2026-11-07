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
