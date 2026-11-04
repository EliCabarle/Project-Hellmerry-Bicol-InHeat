// Bicol In-Heat — map-controls GIS engine (slices 1 + 3)
// Pure functions only: boundary normalization, narrative join, styling. No React, no Leaflet here.
// Boundaries: geoBoundaries PHL ADM1 (simplified) — CC BY 4.0, computed 2026-11-10.
// Municipality boundaries: geoBoundaries (PSA/PSGC-aligned, adm3) — CC BY 4.0 (same note as slice 1).
// Fallback used pending PSA/PSGC official source verification at h6 (CONCEPT 8/13).

const HIGHLIGHT = {
  // Region V / Bicol — heat palette
  fill: true,
  fillColor: '#ef4444',
  fillOpacity: 0.55,
  color: '#fca5a5',
  weight: 2,
}

const DARK = {
  // every other region — darker shade
  fill: true,
  fillColor: '#1f2937',
  fillOpacity: 0.7,
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
export const REGION_OUTLINE = { fill: false, color: '#fca5a5', weight: 2 }
export function getRegionOutlineStyle(feature) {
  return isBicol(feature) ? REGION_OUTLINE : DARK
}

const MUN_PENDING = { fill: true, fillColor: '#1f2937', fillOpacity: 0.25, color: '#334151', weight: 1 }
const MUN_INCREASE = { fill: true, fillColor: '#ef4444', fillOpacity: 0.55, color: '#fca5a5' }
const MUN_DECREASE = { fill: true, fillColor: '#3b82f6', fillOpacity: 0.55, color: '#fca5a5' } // approved: counter-hue for decreasing trends
const MUN_FLAT = { fill: true, fillColor: '#64748b', fillOpacity: 0.55, color: '#fca5a5' }

// Significance renders as border pattern (solid vs dashed), never by fill hue alone.
export function getMunicipalityStyle(feature, { selected = false } = {}) {
  const n = feature?.properties?.narrative
  if (!n) return MUN_PENDING
  const dir = n.trend?.direction
  const base = dir === 'increasing' ? MUN_INCREASE : dir === 'decreasing' ? MUN_DECREASE : MUN_FLAT
  const sig = n.trend?.is_significant
  const style = {
    ...base,
    color: sig ? '#fca5a5' : '#fca5a5',
    weight: sig ? (isCity(feature) ? 2.5 : 2) : (isCity(feature) ? 2 : 1.5),
    ...(sig ? {} : { dashArray: '4 3' }),
  }
  if (selected) {
    return { ...style, weight: style.weight + 1.5, color: '#ffffff' }
  }
  return style
}
