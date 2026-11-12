// Progressive outline trace for the 3D entity. Pure maths only: no React, no MapLibre.
// The trace is a ribbon polygon at altitude, not a line: MapLibre 5 has no line
// elevation property and line layers depth-test against the extrusion.

export const TRACE_MS = 620 // camera settle is 700 ms, so the trace is complete first
export const TRACE_PX = 1.5 // on-screen ribbon width, converted to metres per frame

export function easeOutCubic(p) {
  return 1 - (1 - p) ** 3
}

// Exterior rings only: municipality polygons carry no meaningful holes at this scale.
// shortcut: interior holes are skipped, add them if an LGU ever has a real enclave.
export function ringsOf(geometry) {
  const out = []
  const add = (polygon) => {
    if (polygon?.[0]?.length > 1) out.push(polygon[0])
  }
  if (geometry?.type === 'Polygon') add(geometry.coordinates)
  else if (geometry?.type === 'MultiPolygon') (geometry.coordinates ?? []).forEach(add)
  return out
}

// Planar degree length is enough: it only parametrises the reveal.
export function measure(rings) {
  let total = 0
  for (const ring of rings) {
    for (let i = 1; i < ring.length; i++) {
      total += Math.hypot(ring[i][0] - ring[i - 1][0], ring[i][1] - ring[i - 1][1])
    }
  }
  return total
}

// The ring holding the vertex nearest the previous camera centre starts the trace there.
export function rotateToNearest(rings, centre) {
  if (!rings.length || !centre) return rings
  let best = { ring: -1, index: 0, distance: Infinity }
  rings.forEach((ring, r) =>
    ring.forEach((point, i) => {
      const distance = (point[0] - centre[0]) ** 2 + (point[1] - centre[1]) ** 2
      if (distance < best.distance) best = { ring: r, index: i, distance }
    }),
  )
  const ring = rings[best.ring]
  const closed = ring[ring.length - 1][0] === ring[0][0] && ring[ring.length - 1][1] === ring[0][1]
  const open = closed ? ring.slice(0, -1) : ring.slice()
  const rotated = [...open.slice(best.index), ...open.slice(0, best.index)]
  rotated.push(rotated[0])
  return [rotated, ...rings.filter((_, r) => r !== best.ring)]
}

// Points revealed after `length` degrees of travel, one polyline per ring.
export function slicePrefix(rings, length) {
  const out = []
  if (!(length > 0)) return rings.length ? [[rings[0][0]]] : out
  let remaining = length
  for (const ring of rings) {
    const points = [ring[0]]
    for (let i = 1; i < ring.length; i++) {
      const a = ring[i - 1]
      const b = ring[i]
      const segment = Math.hypot(b[0] - a[0], b[1] - a[1])
      if (segment >= remaining) {
        const t = segment === 0 ? 0 : remaining / segment
        points.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
        out.push(points)
        return out
      }
      remaining -= segment
      points.push(b)
    }
    out.push(points)
  }
  return out
}

const M_PER_DEG_LAT = 110540
const M_PER_DEG_LNG = 111320

// One quad per segment, extended by half a width at each end so corners close.
export function ribbon(prefixRings, widthMetres, lat) {
  const mLat = M_PER_DEG_LAT
  const mLng = M_PER_DEG_LNG * Math.max(0.01, Math.cos((lat * Math.PI) / 180))
  const half = widthMetres / 2
  const polygons = []
  for (const points of prefixRings) {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]
      const b = points[i]
      const dx = (b[0] - a[0]) * mLng
      const dy = (b[1] - a[1]) * mLat
      const length = Math.hypot(dx, dy)
      if (length === 0) continue
      const ux = dx / length
      const uy = dy / length
      const sideLng = (-uy * half) / mLng
      const sideLat = (ux * half) / mLat
      const alongLng = (ux * half) / mLng
      const alongLat = (uy * half) / mLat
      polygons.push([
        [
          [a[0] - alongLng + sideLng, a[1] - alongLat + sideLat],
          [b[0] + alongLng + sideLng, b[1] + alongLat + sideLat],
          [b[0] + alongLng - sideLng, b[1] + alongLat - sideLat],
          [a[0] - alongLng - sideLng, a[1] - alongLat - sideLat],
          [a[0] - alongLng + sideLng, a[1] - alongLat + sideLat],
        ],
      ])
    }
  }
  return polygons
}

// Metres per screen pixel, so the ribbon stays TRACE_PX wide at every zoom.
export function ribbonWidthMetres(lat, zoom) {
  return (TRACE_PX * 78271.5 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom
}
