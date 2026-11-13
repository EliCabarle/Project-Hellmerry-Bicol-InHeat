// Bicol In-Heat — single colour decider for the municipality fill.
// One place answers "what colour is this area, given the active metric".
// Every fill (2D setStyle and 3D _fill) goes through colourFor(metricFor(...));
// nothing else invents a fill colour or a local ramp.
// Pure functions: no React, no Leaflet, no MapLibre.

import { binIndex, recordForYear } from './yearRamp.js'

// ---- customizable constants (brief) ----
export const LEGEND_STOPS = 5
export const SCALE_METHOD = 'quantile' // 'quantile' | 'equal-interval' | 'natural-breaks'
export const SWITCH_MS = 700 // eased colour duration when the metric switches

// Lightness-monotonic ramp from the project palette (heat family): amber→orange→red.
// Strictly decreasing lightness, so it stays readable in greyscale. Five stops.
export const RAMP = ['#fde68a', '#fbbf24', '#fb923c', '#f97316', '#b91c1c']

// Neutral surface tint for areas with no usable value — clearly outside the ramp.
export const MISSING_TINT = '#475569'

// ---- dimming (brief: spotlight / de-emphasise non-targets) ----
// Customizable constants. DIM_EXCLUDE default = both selected and hovered stay bright.
export const DIM_LEVEL = 0.55 // of normal brightness; safe 0.35–0.70
export const DIM_AXIS = 'lightness' // 'lightness' | 'saturation'
export const DIM_MS = 150 // eased colour duration (ms)
export const KEEP_OUTLINE = true // boundaries stay at full strength while dimmed
export const DIM_EXCLUDE = 'selected-plus-hovered' // 'selected' | 'selected-plus-hovered'

function parseHex(hex) {
  const h = String(hex).replace(/^#/, '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHsl(r, g, b) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  } else {
    s = 0
  }
  return [h, s, l]
}

function hue2rgb(p, q, t) {
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}

function hslToRgb(h, s, l) {
  let r, g, b
  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

// Scale the chosen channel by DIM_LEVEL; result always stays between black and
// the original colour, so dimmed areas never drop out of view.
export function dimColor(color, { level = DIM_LEVEL, axis = DIM_AXIS } = {}) {
  if (!color) return color
  const [r, g, b] = parseHex(color)
  const [h, s, l] = rgbToHsl(r, g, b)
  let nl = l
  let ns = s
  if (axis === 'saturation') ns = Math.max(0, Math.min(1, s * level))
  else nl = Math.max(0, Math.min(1, l * level))
  const [rr, gg, bb] = hslToRgb(h, ns, nl)
  const pad = (v) => v.toString(16).padStart(2, '0')
  return `#${pad(rr)}${pad(gg)}${pad(bb)}`
}

// ---- metric shape: value per area, low-confidence flag, label + units ----
// { value, lowConfidence, missing, label, units }
export function metricFor(feature, { viewMode = 'trend', year = null, dayValues = null } = {}) {
  const n = feature?.properties?.narrative
  if (!n) {
    return { value: null, lowConfidence: false, missing: true, label: '—', units: '' }
  }
  const t = n.trend ?? {}
  const sig = Boolean(t.is_significant)
  const lowConfidence = !sig

  if (viewMode === 'trend') {
    const slope = t.slope_c_per_year
    if (t.direction === 'decreasing') {
      // Decreasing is its own category (approved counter-hue), never on the ramp.
      return { value: slope, lowConfidence, missing: false, label: 'Warming rate', units: '°C/yr' }
    }
    if (Number.isFinite(slope) && slope > 0) {
      return { value: slope, lowConfidence, missing: false, label: 'Warming rate', units: '°C/yr' }
    }
    return { value: null, lowConfidence, missing: true, label: 'Warming rate', units: '°C/yr' }
  }

  if (viewMode === 'year') {
    const row = recordForYear(n.series, year) ?? n.latest
    const value = row?.mean_heat_index_c
    const missing = !Number.isFinite(value)
    return {
      value: missing ? null : value,
      lowConfidence,
      missing,
      label: 'Mean heat index',
      units: '°C',
    }
  }

  if (viewMode === 'day') {
    const value = dayValues instanceof Map ? dayValues.get(n.id) : undefined
    const missing = !Number.isFinite(value)
    return {
      value: missing ? null : value,
      lowConfidence,
      missing,
      label: 'Peak heat index',
      units: '°C',
    }
  }

  return { value: null, lowConfidence: false, missing: true, label: '—', units: '' }
}

// ---- data-driven ramp across the value range ----
function quantileBreaks(sorted, stops) {
  const n = sorted.length
  const breaks = []
  for (let i = 0; i <= stops; i += 1) {
    const pos = (i * (n - 1)) / stops
    const lo = Math.floor(pos)
    const hi = Math.ceil(pos)
    breaks.push(sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo))
  }
  return breaks
}

function equalIntervalBreaks(lo, hi, stops) {
  const breaks = []
  for (let i = 0; i <= stops; i += 1) {
    breaks.push(lo + (hi - lo) * (i / stops))
  }
  return breaks
}

function jenksBreaks(sorted, stops) {
  // Jenks natural breaks; returns stops+1 break values from min to max.
  const n = sorted.length
  const mat1 = Array.from({ length: n + 1 }, () => Array(stops + 1).fill(0))
  const mat2 = Array.from({ length: n + 1 }, () => Array(stops + 1).fill(0))
  for (let i = 1; i <= stops; i += 1) {
    mat1[1][i] = 1
    mat2[1][i] = 0
    for (let j = 2; j <= n; j += 1) mat2[j][i] = Infinity
  }
  for (let l = 2; l <= n; l += 1) {
    let s1 = 0
    let s2 = 0
    let w = 0
    for (let m = 1; m <= l; m += 1) {
      const lower = l - m + 1
      const val = sorted[lower - 1]
      w += 1
      s1 += val
      s2 += val * val
      const v = s2 - (s1 * s1) / w
      const i4 = lower - 1
      if (i4 !== 0) {
        for (let j = 2; j <= stops; j += 1) {
          if (mat2[l][j] >= v + mat2[i4][j - 1]) {
            mat1[l][j] = lower
            mat2[l][j] = v + mat2[i4][j - 1]
          }
        }
      }
    }
    mat1[l][1] = 1
    mat2[l][1] = s2 - (s1 * s1) / w
  }
  const kclass = Array(stops + 1).fill(0)
  kclass[stops] = sorted[n - 1]
  let k = n
  for (let countNum = stops; countNum >= 2; countNum -= 1) {
    const lower = mat1[k][countNum]
    kclass[countNum - 1] = sorted[lower - 2]
    k = lower - 1
  }
  kclass[0] = sorted[0]
  return kclass
}

export function rampFor(values, { stops = LEGEND_STOPS, method = SCALE_METHOD, ramp = RAMP } = {}) {
  const finite = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
  if (finite.length === 0) return []
  const lo = finite[0]
  const hi = finite[finite.length - 1]
  if (lo === hi) {
    return [{ value: lo, color: ramp[Math.floor((ramp.length - 1) / 2)] }]
  }
  let breaks
  if (method === 'equal-interval') {
    breaks = equalIntervalBreaks(lo, hi, stops)
  } else if (method === 'natural-breaks') {
    breaks = jenksBreaks(finite, stops)
  } else {
    breaks = quantileBreaks(finite, stops)
  }
  return breaks.slice(0, stops).map((value, i) => ({
    value,
    color: ramp[Math.min(i, ramp.length - 1)],
  }))
}

export function colourFor(metric, ramp) {
  if (!metric || metric.missing || !Number.isFinite(metric.value) || !ramp?.length) {
    return MISSING_TINT
  }
  const breaks = ramp.map((s) => s.value)
  const last = breaks[breaks.length - 1]
  // The final band runs up to the data max: values at/above the last lower
  // bound take the last (darkest) colour.
  if (metric.value >= last) return ramp[ramp.length - 1].color
  const i = binIndex(metric.value, breaks)
  return i < 0 ? MISSING_TINT : ramp[i].color
}

// ---- one-pass summary: ramp + no-data count + value range for the legend ----
// Decreasing trends are excluded from the trend ramp: they carry the approved
// counter-hue (#3b82f6), not a ramp colour.
export function metricSummary(
  features,
  { viewMode = 'trend', year = null, dayValues = null, stops = LEGEND_STOPS, method = SCALE_METHOD } = {},
) {
  const values = []
  let noDataCount = 0
  let min = Infinity
  let max = -Infinity
  for (const f of features ?? []) {
    const m = metricFor(f, { viewMode, year, dayValues })
    if (m.missing) {
      noDataCount += 1
      continue
    }
    if (viewMode === 'trend' && f.properties?.narrative?.trend?.direction === 'decreasing') continue
    if (!Number.isFinite(m.value)) continue
    values.push(m.value)
    if (m.value < min) min = m.value
    if (m.value > max) max = m.value
  }
  const ramp = rampFor(values, { stops, method })
  return {
    ramp,
    noDataCount,
    min: Number.isFinite(min) ? min : null,
    max: Number.isFinite(max) ? max : null,
    valueCount: values.length,
  }
}
