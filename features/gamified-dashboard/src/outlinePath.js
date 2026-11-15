// Municipality outline projection: GeoJSON rings -> SVG path strings for the
// finder cards. Pure, no React. Verified fact (11-13-2026): the 114 adm3
// features hold only 2,626 ring points (median 21, max 49) — no decimation is
// needed, so don't "optimise" this into lossy simplification later.

import { featureKey } from '../../map-controls/src/gis/engine.js'

const VIEW = 100
const PAD = 6

// GeoJSON (lon,lat, lat up) -> SVG (x,y, y down). One index entry per feature,
// keyed by featureKey so it joins to narratives via joinKey.
export function buildOutlineIndex(geojson) {
  const idx = new Map()
  for (const feature of geojson?.features ?? []) {
    const key = featureKey(feature)
    if (!key || idx.has(key)) continue
    idx.set(key, projectGeometry(feature?.geometry))
  }
  return idx
}

export function projectGeometry(geometry) {
  const rings = polygonsOf(geometry)
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const ring of rings) {
    for (const point of ring) {
      const lon = point?.[0]
      const lat = point?.[1]
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue
      if (lon < minX) minX = lon
      if (lat < minY) minY = lat
      if (lon > maxX) maxX = lon
      if (lat > maxY) maxY = lat
    }
  }

  const degenerate = !Number.isFinite(minX)
  const dx = degenerate ? 0 : maxX - minX
  const dy = degenerate ? 0 : maxY - minY
  const cx = degenerate ? 0 : (minX + maxX) / 2
  const cy = degenerate ? 0 : (minY + maxY) / 2
  const scale = dx > 0 && dy > 0 ? Math.min((VIEW - 2 * PAD) / dx, (VIEW - 2 * PAD) / dy) : 1

  const project = ([lon, lat]) => {
    // Degenerate axes centre on the stage midline; y flips so north stays up.
    const x = dx > 0 ? 50 + (lon - cx) * scale : 50
    const y = dy > 0 ? 50 + (cy - lat) * scale : 50
    return `${r1(x)} ${r1(y)}`
  }

  const d = rings
    .map((ring) => {
      const points = ring.filter((p) => Number.isFinite(p?.[0]) && Number.isFinite(p?.[1]))
      if (points.length === 0) return null
      const [head, ...tail] = points
      return `M${project(head)} L${tail.map(project).join(' L')} Z`
    })
    .filter(Boolean)
    .join(' ')

  return { d, viewBox: `0 0 ${VIEW} ${VIEW}`, fillRule: 'evenodd' }
}

function polygonsOf(geometry) {
  if (geometry?.type === 'Polygon') return geometry.coordinates ?? []
  if (geometry?.type === 'MultiPolygon') return (geometry.coordinates ?? []).flat()
  return []
}

const r1 = (v) => Math.round(v * 10) / 10
