// Pure tooltip HTML builder for municipality polygons — no React/Leaflet here.
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

const fmtInt = (n) => new Intl.NumberFormat('en-US').format(n)
const fmtP = (p) => (p < 0.001 ? 'p < 0.001' : `p = ${p.toFixed(3)}`)
const arrow = (dir) => (dir === 'increasing' ? '▲' : dir === 'decreasing' ? '▼' : '■')

export function tooltipHtml(feature) {
  const p = feature?.properties ?? {}
  const name = esc(p.adm3_en ?? 'Unknown')
  const province = esc(p.province ?? '')
  const n = p.narrative
  if (!n) {
    return (
      `<div class="bih-tip__name">${name}</div>` +
      `<div class="bih-tip__sub">${province}</div>` +
      `<div class="bih-tip__row">Trend data pending — arriving soon</div>`
    )
  }
  const t = n.trend ?? {}
  const slope = typeof t.slope_c_per_year === 'number' ? t.slope_c_per_year : null
  const slopeLine = slope === null ? '' : ` ${arrow(t.direction)} ${esc(t.direction)} <b>${slope >= 0 ? '+' : ''}${slope.toFixed(3)} °C/yr</b>`
  const sig = t.is_significant
    ? `<span class="bih-tip__pill bih-tip__pill--sig">Significant</span> <span class="bih-tip__p">${esc(fmtP(t.p_value ?? 1))}</span>`
    : `<span class="bih-tip__pill bih-tip__pill--nonsig">Not significant</span>`
  const sample = (n.sample?.n_days ?? null) !== null
    ? `Sample: ${fmtInt(n.sample.n_days)} days · ${fmtInt(n.sample.n_years ?? 0)} years`
    : ''
  const latest = typeof n.latest?.mean_heat_index_c === 'number'
    ? `${n.latest.year} mean heat index: ${n.latest.mean_heat_index_c.toFixed(1)} °C`
    : ''
  const danger = Number.isFinite(n.total_danger_days_45y)
    ? `Danger days (>42 °C, 45y): ${fmtInt(n.total_danger_days_45y)}`
    : ''
  return (
    `<div class="bih-tip__name">${name}</div>` +
    `<div class="bih-tip__sub">${province}</div>` +
    (slopeLine ? `<div class="bih-tip__row">${slopeLine}</div>` : '') +
    `<div class="bih-tip__row">${sig}</div>` +
    (sample ? `<div class="bih-tip__row bih-tip__muted">${esc(sample)}</div>` : '') +
    (latest ? `<div class="bih-tip__row">${esc(latest)}</div>` : '') +
    (danger ? `<div class="bih-tip__row">${esc(danger)}</div>` : '')
  )
}
