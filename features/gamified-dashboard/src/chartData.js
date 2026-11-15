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

// 95% CI of the province mean heat index per year. The standard error of the
// mean needs the sum and the sum of squares, so both are accumulated here
// rather than trusting a pre-computed band.
export function yearlyMeanCi95(municipalities) {
  const byYear = new Map()
  for (const m of municipalities ?? []) {
    for (const row of m?.series ?? []) {
      const year = Number(row?.year)
      const hi = row?.mean_heat_index_c
      if (!Number.isFinite(year) || !Number.isFinite(hi)) continue
      const cell = byYear.get(year) ?? { sum: 0, sumSq: 0, n: 0 }
      cell.sum += hi
      cell.sumSq += hi * hi
      cell.n += 1
      byYear.set(year, cell)
    }
  }
  return [...byYear]
    .sort((a, b) => a[0] - b[0])
    .map(([year, cell]) => {
      if (cell.n < 2) return { year, ciLow: null, ciHigh: null }
      const mean = cell.sum / cell.n
      const variance = (cell.sumSq - (cell.sum * cell.sum) / cell.n) / (cell.n - 1)
      const se = Math.sqrt(Math.max(0, variance) / cell.n)
      return { year, ciLow: mean - 1.96 * se, ciHigh: mean + 1.96 * se }
    })
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

// Person-days of danger: population exposure to days above the danger
// threshold. The pipeline already computes this per municipality; this only
// sums what is computed — no exposure figure is derived here.
export function personDaysDanger(municipalities) {
  return (municipalities ?? []).reduce(
    (sum, m) => sum + (Number.isFinite(m?.person_days_danger) ? m.person_days_danger : 0),
    0,
  )
}

// Population of every municipality that has recorded at least one danger day,
// and the regional total — the denominator an LGU needs beside person-days.
export function populationExposure(municipalities) {
  let exposed = 0
  let total = 0
  let exposedCount = 0
  for (const m of municipalities ?? []) {
    const pop = Number.isFinite(m?.population_2020) ? m.population_2020 : 0
    total += pop
    if ((m?.person_days_danger ?? 0) > 0) {
      exposed += pop
      exposedCount += 1
    }
  }
  return {
    exposedPopulation: exposed,
    exposedCount,
    totalPopulation: total,
    exposedSharePct: total > 0 ? Math.round((exposed / total) * 1000) / 10 : null,
  }
}

// The largest single person-days figure — the scale for the in-cell bar.
export function maxPersonDays(municipalities) {
  return (municipalities ?? []).reduce(
    (max, m) => Math.max(max, Number.isFinite(m?.person_days_danger) ? m.person_days_danger : 0),
    0,
  )
}

// Mean SHAP share per driver label across every municipality — the regional
// driver story for the narration panel.
export function regionalDriverShares(municipalities) {
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
    .filter((cell) => cell.n > 0)
    .map((cell) => ({ label: cell.label, meanShare: cell.sum / cell.n, municipalities: cell.n }))
    .sort((a, b) => b.meanShare - a.meanShare)
}

// Regional median of a numeric condition field (LST, NDVI) — the reference a
// single municipality is compared against.
export function regionalMedian(municipalities, field) {
  const values = (municipalities ?? [])
    .map((m) => m?.[field])
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b)
  if (values.length === 0) return null
  const mid = Math.floor(values.length / 2)
  return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2
}

// How many municipalities show a structural break in each year (Pettitt
// change-point test, computed in apps/api). Counts only — the year itself
// comes from the pipeline, never inferred here.
export function changePointCounts(municipalities) {
  const counts = new Map()
  for (const m of municipalities ?? []) {
    const year = Number(m?.trend?.change_point_year)
    if (!Number.isFinite(year)) continue
    counts.set(year, (counts.get(year) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, count]) => ({ year, count }))
}

// The dominant break: the year the most municipalities change regime at.
// Returns null when no municipality carries a change point.
export function dominantChangePoint(municipalities) {
  const rows = changePointCounts(municipalities)
  if (rows.length === 0) return null
  return rows.reduce((best, r) => (r.count > best.count ? r : best))
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
