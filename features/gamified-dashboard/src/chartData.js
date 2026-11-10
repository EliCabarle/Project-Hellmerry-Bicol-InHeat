// Pure aggregation for the dashboard charts. No React here.
// Values come straight from narratives.json series/trend records — nothing is
// invented, only counted or averaged. Bins are re-used from the map's ramp
// module so both screens classify the world identically (single source of truth).

import {
  YEAR_BREAKS,
  YEAR_MIN,
  YEAR_MAX,
  TREND_BREAKS,
  TREND_MIN,
  TREND_MAX,
  binIndex,
  recordForYear,
} from '../../map-controls/src/gis/yearRamp.js'

// Sorted year list across all municipalities (the pipeline emits one uniform
// series length, but this stays correct even if one LGU is shorter).
export function yearsOf(municipalities) {
  const seen = new Set()
  for (const m of municipalities ?? []) {
    for (const row of m?.series ?? []) {
      const year = Number(row?.year)
      if (Number.isFinite(year)) seen.add(year)
    }
  }
  return [...seen].sort((a, b) => a - b)
}

// Province-wide mean heat index per year + how many LGUs fed it and how many
// logged at least one danger day that year.
export function provinceYearlyMean(municipalities) {
  const byYear = new Map()
  for (const m of municipalities ?? []) {
    for (const row of m?.series ?? []) {
      const year = Number(row?.year)
      const hi = row?.mean_heat_index_c
      if (!Number.isFinite(year) || !Number.isFinite(hi)) continue
      const cell = byYear.get(year) ?? { sum: 0, n: 0, dangerDayLgus: 0 }
      cell.sum += hi
      cell.n += 1
      if (Number(row?.danger_days) > 0) cell.dangerDayLgus += 1
      byYear.set(year, cell)
    }
  }
  return [...byYear]
    .sort((a, b) => a[0] - b[0])
    .map(([year, cell]) => ({
      year,
      meanHeatIndexC: cell.n > 0 ? cell.sum / cell.n : null,
      dangerDayLgus: cell.dangerDayLgus,
      nCounted: cell.n,
    }))
}

// Province-mean heat index at `year` vs `year - 1`, as a % change (null when
// either side is missing — the change KPI shows "—" instead of a made-up 0).
export function yearOverYearDelta(municipalities, year) {
  const yearly = provinceYearlyMean(municipalities)
  const rowFor = (y) => yearly.find((r) => r.year === Number(y)) ?? null
  const current = rowFor(year)
  const previous = rowFor(Number(year) - 1)
  if (
    !current ||
    !previous ||
    !Number.isFinite(current.meanHeatIndexC) ||
    !Number.isFinite(previous.meanHeatIndexC) ||
    previous.meanHeatIndexC === 0
  ) {
    return null
  }
  return {
    year: current.year,
    current: current.meanHeatIndexC,
    previous: previous.meanHeatIndexC,
    deltaPct: ((current.meanHeatIndexC - previous.meanHeatIndexC) / previous.meanHeatIndexC) * 100,
  }
}

// Shared binning: values outside [min, max] clamp like the map ramps do, so a
// histogram never hides an LGU — every finite value lands in a visible bin.
function binize(values, breaks, min, max, fmt = String) {
  const counts = Array(breaks.length - 1).fill(0)
  for (const value of values) {
    if (!Number.isFinite(Number(value))) continue
    const clamped = Math.min(max, Math.max(min, Number(value)))
    const i = binIndex(clamped, breaks)
    if (i >= 0) counts[i] += 1
  }
  const labels = breaks.slice(0, -1).map((lo, i) =>
    i === breaks.length - 2
      ? `${lo}+`
      : `${fmt(lo)}–${fmt(breaks[i + 1])}`,
  )
  return { labels, counts }
}

// LGUs by mean heat index at `year`, binned on the map's YEAR breaks so bar
// colours can re-use the map legend exactly.
export function heatIndexHistogram(municipalities, year) {
  const values = (municipalities ?? []).map(
    (m) => recordForYear(m?.series, year)?.mean_heat_index_c,
  )
  const { labels, counts } = binize(values, YEAR_BREAKS, YEAR_MIN, YEAR_MAX)
  return labels.map((label, i) => ({ label, count: counts[i], binIndex: i }))
}

// LGUs by warming rate (|slope|), binned on the map's TREND breaks.
export function trendHistogram(municipalities) {
  const values = (municipalities ?? []).map((m) => m?.trend?.slope_c_per_year)
  const { labels, counts } = binize(
    values,
    TREND_BREAKS,
    TREND_MIN,
    TREND_MAX,
    (n) => n.toFixed(3),
  )
  return labels.map((label, i) => ({ label, count: counts[i], binIndex: i }))
}

// LGUs grouped by their 45-year total danger days (the "which LGUs trap
// extreme heat" view planners asked for).
export function dangerBandCounts(municipalities) {
  const bands = [
    { label: '0 days', test: (n) => n === 0 },
    { label: '1–5', test: (n) => n >= 1 && n <= 5 },
    { label: '6–10', test: (n) => n >= 6 && n <= 10 },
    { label: '11+', test: (n) => n >= 11 },
  ]
  return bands.map((band) => ({
    label: band.label,
    count: (municipalities ?? []).filter((m) => band.test(Number(m?.total_danger_days_45y ?? 0)))
      .length,
  }))
}

// Aggregate driver ranking: for each driver label, the mean of its SHAP shares
// across the LGUs whose top-drivers list mentions it. Association, not causation.
export function topDriverShares(municipalities, limit = 6) {
  const acc = new Map()
  for (const m of municipalities ?? []) {
    for (const d of m?.top_drivers ?? []) {
      const label = String(d?.label ?? '').trim()
      if (!label) continue
      const cell = acc.get(label) ?? { label, sum: 0, n: 0 }
      const share = Number(d?.share)
      if (Number.isFinite(share)) {
        cell.sum += share
        cell.n += 1
      }
      acc.set(label, cell)
    }
  }
  return [...acc.values()]
    .map((cell) => ({ label: cell.label, meanShare: cell.n > 0 ? cell.sum / cell.n : 0, lgus: cell.n }))
    .sort((a, b) => b.meanShare - a.meanShare)
    .slice(0, limit)
}
