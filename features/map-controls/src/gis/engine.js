// Bicol In-Heat — map-controls GIS engine (slices 1 + 3)
// Pure functions only: boundary normalization, narrative join, styling. No React, no Leaflet here.
// Boundaries: geoBoundaries PHL ADM1 (simplified) — CC BY 4.0, computed 2026-11-10.
// Municipality boundaries: geoBoundaries (PSA/PSGC-aligned, adm3) — CC BY 4.0 (same note as slice 1).
// Fallback used pending PSA/PSGC official source verification at h6 (CONCEPT 8/13).

import { DAY_NO_DATA, dayColor, recordForYear, trendColor, yearColor } from './yearRamp.js'

// The one selection/outline token: 2D styles, 3D paint and the trace all read this.
export const SELECT_COLOUR = '#67e8f9'

// Province-scoped municipal disclosure. Idle = subtle tint, borders hidden.
// Revealed = full data fill with crisp internal boundaries.
// Values are safe within the documented ranges; keep them here so no component
// invents a local hue or alpha.
export const IDLE_MUNI_FILL_ALPHA = 0.04
export const REVEALED_FILL_ALPHA = 0.76

const HIGHLIGHT = {
  // Region V / Bicol — heat palette used only during the loading state
  fill: true,
  fillColor: '#ef4444',
  fillOpacity: 0.55,
  color: '#fca5a5',
  weight: 2,
}

const DARK = {
  // every other region — dark veil over the satellite basemap
  fill: true,
  fillColor: '#1f2937',
  fillOpacity: 0.58,
  color: '#475569',
  weight: 1,
}

export function isBicol(feature) {
  return /bicol/i.test(feature?.properties?.shapeName ?? '')
}

export function findBicol(geojson) {
  return geojson?.features?.find(isBicol) ?? null
}

export function loadRegions(geojson) {
  const features = geojson?.features ?? []
  return features.map((feature) => ({
    id: feature.properties?.shapeID ?? feature.properties?.shapeName,
    name: feature.properties?.shapeName ?? 'Unknown',
    isBicol: isBicol(feature),
    feature,
  }))
}

export function getRegionStyle(feature) {
  return isBicol(feature) ? HIGHLIGHT : DARK
}

// ---- municipality layer (slice 3) ----

// 'City of Naga'→'naga' | 'Sorsogon City'→'sorsogon' | '  CITY OF  Iriga '→'iriga'
export function normalizeName(name) {
  return String(name ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^city of\s+/i, '')
    .replace(/\s+city$/i, '')
    .trim()
    .toLowerCase()
}

// Province-qualified: 'Bato' and 'San Fernando' exist in two provinces each (V2 tripwire)
export function joinKey(name, province) {
  const p = normalizeName(province)
  const n = normalizeName(name)
  return p ? `${n}|${p}` : n
}

export function featureKey(feature) {
  const p = feature?.properties ?? {}
  return joinKey(p.adm3_en, p.province) || p.shapeName || ''
}

export function buildNarrativeIndex(narratives) {
  const idx = new Map()
  for (const m of narratives?.municipalities ?? []) {
    idx.set(joinKey(m.id, m.province), m)
    idx.set(joinKey(m.name, m.province), m)
  }
  return idx
}

// Attaches narratives entry (or null) to every feature's properties.narrative
export function joinNarratives(geojson, narratives) {
  const idx = buildNarrativeIndex(narratives)
  return {
    ...geojson,
    features: (geojson?.features ?? []).map((f) => {
      const p = f.properties ?? {}
      return { ...f, properties: { ...p, narrative: idx.get(joinKey(p.adm3_en, p.province)) ?? null } }
    }),
  }
}

export function isCity(feature) {
  return feature?.properties?.geo_level === 'City'
}

// Region layer: outline only (lets municipality fills show through); while loading, keep
// slice-1 solid fills so the screen never goes blank
export const REGION_OUTLINE = { fill: false, color: '#fca5a5', weight: 1.75 }
export function getRegionOutlineStyle(feature) {
  return isBicol(feature) ? REGION_OUTLINE : DARK
}

const MUN_PENDING = { fill: true, fillColor: '#1f2937', fillOpacity: 0.25, color: '#334151', weight: 1 }
const MUN_DECREASE = { fill: true, fillColor: '#3b82f6', fillOpacity: 0.6, color: '#fca5a5' } // approved: counter-hue for decreasing trends
const MUN_FLAT = { fill: true, fillColor: '#64748b', fillOpacity: 0.55, color: '#fca5a5' }

function trendBase(feature) {
  const t = feature?.properties?.narrative?.trend ?? {}
  if (t.direction === 'decreasing') return MUN_DECREASE
  if (t.direction === 'increasing') {
    const fill = trendColor(t.slope_c_per_year)
    if (fill) {
      return {
        fill: true,
        fillColor: fill,
        fillOpacity: 0.62,
        color: '#0b1220',
        weight: isCity(feature) ? 2.2 : 1.6,
      }
    }
  }
  return MUN_FLAT
}

function yearBase(feature, year) {
  const n = feature?.properties?.narrative
  const row = recordForYear(n?.series, year) ?? n?.latest
  const fill = yearColor(row?.mean_heat_index_c)
  if (!fill) return MUN_FLAT
  return {
    fill: true,
    fillColor: fill,
    fillOpacity: 0.62,
    color: '#0b1220',
    weight: isCity(feature) ? 2.2 : 1.6,
  }
}

// Daily branch: values arrive as Map<narrativeId, °C|null> for the selected
// day (null = no measurement that day). A missing day gets the distinct
// no-data veil — never a band colour, never interpolated.
function dayBase(feature, dayValues) {
  const id = feature?.properties?.narrative?.id
  const value = dayValues instanceof Map ? dayValues.get(id) : undefined
  const fill = (Number.isFinite(value) ? dayColor(value) : null) ?? DAY_NO_DATA
  return {
    fill: true,
    fillColor: fill,
    fillOpacity: 0.62,
    color: '#0b1220',
    weight: isCity(feature) ? 2.2 : 1.6,
  }
}

// Significance renders as border pattern (solid vs dashed), never by fill hue alone.
export function getMunicipalityStyle(
  feature,
  {
    selected = false,
    viewMode = 'trend',
    year = null,
    dayValues = null,
    hoveredProvince = null,
    selectedProvince = null,
  } = {},
) {
  const n = feature?.properties?.narrative
  if (!n) return MUN_PENDING
  const p = feature?.properties ?? {}
  const base =
    viewMode === 'year'
      ? yearBase(feature, year)
      : viewMode === 'day'
        ? dayBase(feature, dayValues)
        : trendBase(feature)
  const sig = n.trend?.is_significant
  // A municipality is revealed when its province is under pointer hover or is
  // the parent province of an active selection. Otherwise its fill is a subtle
  // tint and its internal boundary stroke is fully transparent.
  const revealed =
    (hoveredProvince &&
      normalizeName(p.province) === normalizeName(hoveredProvince)) ||
    (selectedProvince &&
      normalizeName(p.province) === normalizeName(selectedProvince))
  const style = {
    ...base,
    fillOpacity: revealed ? REVEALED_FILL_ALPHA : IDLE_MUNI_FILL_ALPHA,
    color: sig ? '#fca5a5' : '#cbd5e1',
    weight: sig ? (isCity(feature) ? 2.5 : 2) : (isCity(feature) ? 2 : 1.5),
    opacity: revealed ? 1 : 0,
    ...(sig ? {} : { dashArray: '4 3' }),
  }
  if (selected) {
    return { ...style, weight: style.weight + 1.5, color: SELECT_COLOUR }
  }
  return style
}
