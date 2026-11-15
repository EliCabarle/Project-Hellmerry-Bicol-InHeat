// Pure tooltip HTML builder for municipality polygons — no React/Leaflet here.
import { dayBand, recordForYear } from '../gis/yearRamp.js'
import { spelledDate } from '../state/dateModel.js'

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

const fmtInt = (n) => new Intl.NumberFormat('en-US').format(n)
const fmtDensity = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })
const fmtP = (p) => (p == null ? '' : p < 0.001 ? 'p < 0.001' : `p = ${p.toFixed(3)}`)
const fmtC = (n) => (Number.isFinite(n) ? `${n.toFixed(1)} °C` : '—')
const arrow = (dir) => (dir === 'increasing' ? '▲' : dir === 'decreasing' ? '▼' : '■')

function populationDensityLine(n) {
  const density = n.population_density
  if (typeof density !== 'number' || !Number.isFinite(density)) return ''
  return (
    `<div class="bih-tip__row bih-tip__population">` +
    `<svg class="bih-tip__population-icon" viewBox="0 0 24 24" aria-hidden="true">` +
    `<circle cx="9" cy="7" r="3"></circle><circle cx="17" cy="8" r="2.5"></circle>` +
    `<path d="M3.5 20v-1.5a5.5 5.5 0 0 1 11 0V20zM15 14.5a4.5 4.5 0 0 1 5.5 4.3V20h-4"></path>` +
    `</svg><span>Population density (2020): <b>${fmtDensity.format(density)} people/km²</b></span></div>`
  )
}

export function tooltipHtml(
  feature,
  { year = null, viewMode = 'trend', date = null, dayValues = null, provinceCount = null } = {},
) {
  const p = feature?.properties ?? {}
  const name = esc(p.adm3_en ?? 'Unknown')
  const province = esc(p.province ?? '')
  const provinceLine =
    provinceCount != null
      ? `${province} · ${fmtInt(provinceCount)} LGUs — Hover municipality for metrics`
      : province
  const n = p.narrative
  if (!n) {
    return (
      `<div class="bih-tip__name">${name}</div>` +
      `<div class="bih-tip__sub">${provinceLine}</div>` +
      `<div class="bih-tip__row">Trend data pending — arriving soon</div>`
    )
  }
  const t = n.trend ?? {}
  const sig = t.is_significant
    ? `<span class="bih-tip__pill bih-tip__pill--sig">Significant</span> <span class="bih-tip__p">${esc(fmtP(t.p_value))}</span>`
    : `<span class="bih-tip__pill bih-tip__pill--nonsig">Not significant</span> <span class="bih-tip__p">${esc(fmtP(t.p_value))}</span>`

  if (viewMode === 'day') {
    const value = dayValues instanceof Map ? dayValues.get(n.id) : undefined
    const dateLine = esc(date ? spelledDate(date) : '—')
    const valueLine = Number.isFinite(value)
      ? `${dateLine} peak heat index: <b>${fmtC(value)}</b> — ${esc(dayBand(value) ?? '')}`
      : `${dateLine}: <b>No data for this day</b>`
    const slope = typeof t.slope_c_per_year === 'number' ? t.slope_c_per_year : null
    const slopeLine = slope === null ? '' : `${arrow(t.direction)} ${esc(t.direction)} <b>${slope >= 0 ? '+' : ''}${slope.toFixed(3)} °C/yr</b>`
    return (
      `<div class="bih-tip__name">${name}</div>` +
      `<div class="bih-tip__sub">${provinceLine}</div>` +
      `<div class="bih-tip__row">${valueLine}</div>` +
      populationDensityLine(n) +
      (slopeLine ? `<div class="bih-tip__row">${slopeLine}</div>` : '') +
      `<div class="bih-tip__row">${sig}</div>` +
      `<div class="bih-tip__row bih-tip__muted">Sample: 1 day</div>`
    )
  }

  const slope = typeof t.slope_c_per_year === 'number' ? t.slope_c_per_year : null
  const slopeLine = slope === null ? '' : `${arrow(t.direction)} ${esc(t.direction)} <b>${slope >= 0 ? '+' : ''}${slope.toFixed(3)} °C/yr</b>`
  const sample = (n.sample?.n_days ?? null) !== null
    ? `Sample: ${fmtInt(n.sample.n_days)} days · ${fmtInt(n.sample.n_years ?? 0)} years`
    : ''
  const row = year == null ? n.latest : recordForYear(n.series, year)
  const rowYear = row?.year ?? year
  const heat = typeof row?.mean_heat_index_c === 'number'
    ? `${rowYear} mean heat index: ${fmtC(row.mean_heat_index_c)}`
    : ''
  const danger = Number.isFinite(row?.danger_days)
    ? `${rowYear} danger days (>42 °C): ${fmtInt(row.danger_days)}`
    : Number.isFinite(n.total_danger_days_45y)
      ? `Danger days (>42 °C, 45y): ${fmtInt(n.total_danger_days_45y)}`
      : ''
  return (
    `<div class="bih-tip__name">${name}</div>` +
    `<div class="bih-tip__sub">${provinceLine}</div>` +
    (slopeLine ? `<div class="bih-tip__row">${slopeLine}</div>` : '') +
    populationDensityLine(n) +
    `<div class="bih-tip__row">${sig}</div>` +
    (heat ? `<div class="bih-tip__row">${esc(heat)}</div>` : '') +
    (sample ? `<div class="bih-tip__row bih-tip__muted">${esc(sample)}</div>` : '') +
    (danger ? `<div class="bih-tip__row">${esc(danger)}</div>` : '')
  )
}
