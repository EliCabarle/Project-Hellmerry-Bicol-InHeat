// Bicol In-Heat — map-controls GIS engine (slice 1)
// Pure functions only: boundary normalization + styling. No React, no Leaflet here.
// Boundaries: geoBoundaries PHL ADM1 (simplified) — CC BY 4.0, computed 2026-11-10.
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
