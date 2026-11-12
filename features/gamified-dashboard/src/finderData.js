// Municipality Finder data layer — pure functions, no React. Cards join the
// map's GeoJSON boundaries to narratives entries (114/114 verified coverage)
// and are browsed alphabetically: a finder browses, it doesn't rank — ranking
// stays in the dashboard table.

import { featureKey, isCity, joinKey } from '../../map-controls/src/gis/engine.js'
import { buildOutlineIndex } from './outlinePath.js'
import { HEAT_COOL, HEAT_AMBER, HEAT_MUTED, trendColor } from './chartColors.js'

export function provincesOf(municipalities = []) {
  return [...new Set(municipalities.map((m) => m?.province).filter(Boolean))].sort()
}

export function countByProvince(municipalities = []) {
  const counts = new Map()
  for (const m of municipalities) {
    const p = m?.province
    if (!p) continue
    counts.set(p, (counts.get(p) ?? 0) + 1)
  }
  return counts
}

// Front-face stroke: same ramp language as the map — trend colour when the
// slope bins into the rate ramp, counter-hue when cooling, neutral otherwise.
export function outlineStroke(trend = {}) {
  if (trend?.direction === 'decreasing') return HEAT_COOL
  const binned = trendColor(trend?.slope_c_per_year)
  if (binned) return binned
  if (trend?.direction === 'increasing') return HEAT_AMBER
  return HEAT_MUTED
}

// geojson + narratives -> card records for one province (or all when null/'All').
// Cards without a narrative still render outline + name (flag, not filter).
export function joinCards(geojson, narratives, province = null) {
  const narrativeIndex = new Map()
  for (const m of narratives?.municipalities ?? []) {
    if (m?.id != null) narrativeIndex.set(joinKey(m.id, m.province), m)
    narrativeIndex.set(joinKey(m?.name, m?.province), m)
  }
  const outlines = buildOutlineIndex(geojson)

  const cards = []
  for (const feature of geojson?.features ?? []) {
    const key = featureKey(feature)
    if (!key) continue
    const p = feature?.properties ?? {}
    const prov = p.province ?? ''
    if (province && province !== 'All' && prov !== province) continue
    const narrative = narrativeIndex.get(key) ?? null
    cards.push({
      key,
      name: p.adm3_en ?? p.shapeName ?? 'Unknown',
      province: prov,
      isCity: isCity(feature),
      outline: outlines.get(key) ?? null,
      trend: narrative?.trend ?? null,
      sample: narrative?.sample ?? null,
      latest: narrative?.latest ?? null,
      totalDangerDays: narrative?.total_danger_days_45y ?? null,
      narrationEn: narrative?.narration?.en ?? null,
      drivers: Array.isArray(narrative?.top_drivers) ? narrative.top_drivers.slice(0, 3) : [],
    })
  }
  cards.sort((a, b) => String(a.name).localeCompare(String(b.name)) || String(a.province).localeCompare(String(b.province)))
  return cards
}
