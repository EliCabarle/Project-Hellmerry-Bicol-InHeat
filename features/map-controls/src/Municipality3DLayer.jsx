// Bicol In-Heat — 3D map entity. Separate from the Leaflet 2D entity: own renderer,
// own camera, own picking. Mounted only while renderMode === '3d'.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { featureKey, getMunicipalityStyle } from './gis/engine.js'
import { DEPTH_BASE, LIFT_MS, LIFT_RATIO, depthFor } from './gis/lift.js'
import { tooltipHtml } from './components/municipalityTooltip.js'
import { usePrefersReducedMotion } from './components/MapControlsOverlay.jsx'

const IMAGERY_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const LABELS_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'

const SRC = 'bih-muni'
const FILL = 'bih-muni-fill'
const LINE = 'bih-muni-line'
const DASH = 'bih-muni-line-dash'

const STYLE = {
  version: 8,
  sources: {
    imagery: {
      type: 'raster',
      tiles: [IMAGERY_URL],
      tileSize: 256,
      maxzoom: 18,
      attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
    },
    labels: { type: 'raster', tiles: [LABELS_URL], tileSize: 256, maxzoom: 18 },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#0b1220' } },
    { id: 'imagery', type: 'raster', source: 'imagery' },
    { id: 'labels', type: 'raster', source: 'labels', paint: { 'raster-opacity': 0.92 } },
  ],
}

const EMPTY = { type: 'FeatureCollection', features: [] }

function boundsOf(feature) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const walk = (c) => {
    if (typeof c?.[0] === 'number') {
      if (c[0] < minX) minX = c[0]
      if (c[1] < minY) minY = c[1]
      if (c[0] > maxX) maxX = c[0]
      if (c[1] > maxY) maxY = c[1]
    } else if (Array.isArray(c)) {
      c.forEach(walk)
    }
  }
  walk(feature?.geometry?.coordinates)
  return Number.isFinite(minX) ? [[minX, minY], [maxX, maxY]] : null
}

export default function Municipality3DLayer({
  joined,
  selectedKey,
  selectedFeature,
  viewMode = 'trend',
  year = null,
  initialView = null,
  resetToken = 0,
  onSelect,
  onReady,
  onUnavailable,
}) {
  const hostRef = useRef(null)
  const tipRef = useRef(null)
  const mapRef = useRef(null)
  const hoverRef = useRef(null)
  const selectedRef = useRef(selectedKey)
  const liftRef = useRef(new Map())
  const animRef = useRef(new Map())
  const rafRef = useRef(0)
  const yearRef = useRef(year)
  const selectRef = useRef(onSelect)
  const readyCb = useRef(onReady)
  const unavailableCb = useRef(onUnavailable)
  const viewRef = useRef(initialView)
  const reducedMotion = usePrefersReducedMotion()
  const reducedRef = useRef(reducedMotion)
  const [ready, setReady] = useState(false)

  yearRef.current = year
  selectRef.current = onSelect
  readyCb.current = onReady
  unavailableCb.current = onUnavailable
  reducedRef.current = reducedMotion

  // Colour and depth both come from the existing style + ramp; nothing is invented here.
  const data = useMemo(() => {
    const features = []
    const depths = new Map()
    const byKey = new Map()
    for (const [i, f] of (joined?.features ?? []).entries()) {
      // promoteId needs a unique id; a nameless feature would otherwise collapse the source.
      const key = featureKey(f) || `unnamed-${i}`
      const style = getMunicipalityStyle(f, { selected: false, viewMode, year })
      const depth = depthFor(f, viewMode, year)
      depths.set(key, depth)
      byKey.set(key, f)
      features.push({
        type: 'Feature',
        geometry: f.geometry,
        properties: {
          _key: key,
          _fill: style.fillColor ?? '#64748b',
          _line: style.color ?? '#fca5a5',
          _weight: style.weight ?? 1.5,
          _dash: style.dashArray ? 1 : 0,
          _depth: depth,
          _lift: 0,
        },
      })
    }
    return { collection: { type: 'FeatureCollection', features }, depths, byKey }
  }, [joined, viewMode, year])

  const dataRef = useRef(data)
  dataRef.current = data

  const setLifts = useCallback((values) => {
    const source = mapRef.current?.getSource(SRC)
    if (!source || values.size === 0) return
    source.updateData({
      update: [...values].map(([id, value]) => ({
        id,
        addOrUpdateProperties: [{ key: '_lift', value }],
      })),
    })
  }, [])

  const targetFor = useCallback((key) => {
    if (key == null) return 0
    const depth = dataRef.current.depths.get(key) ?? DEPTH_BASE
    return key === hoverRef.current || key === selectedRef.current ? depth * LIFT_RATIO : 0
  }, [])

  // Ease-out cubic, one rAF loop that stops as soon as nothing is animating.
  const step = useCallback(() => {
    const now = performance.now()
    const values = new Map()
    let active = false
    for (const [key, anim] of animRef.current) {
      const p = Math.min(1, (now - anim.start) / LIFT_MS)
      const eased = 1 - (1 - p) ** 3
      const value = anim.from + (anim.to - anim.from) * eased
      liftRef.current.set(key, value)
      values.set(key, value)
      if (p >= 1) animRef.current.delete(key)
      else active = true
    }
    if (values.size) setLifts(values)
    rafRef.current = active ? requestAnimationFrame(step) : 0
  }, [setLifts])

  const moveTo = useCallback(
    (key, to, { finishFirst = false } = {}) => {
      if (key == null) return
      const from = liftRef.current.get(key) ?? 0
      if (from === to) {
        animRef.current.delete(key)
        return
      }
      if (finishFirst || reducedRef.current) {
        animRef.current.delete(key)
        liftRef.current.set(key, to)
        setLifts(new Map([[key, to]]))
        return
      }
      animRef.current.set(key, { from, to, start: performance.now() })
      if (!rafRef.current) rafRef.current = requestAnimationFrame(step)
    },
    [setLifts, step],
  )

  const showTip = useCallback((event) => {
    const id = event.features?.[0]?.id
    const feature = dataRef.current.byKey.get(id)
    const tip = tipRef.current
    if (!feature || !tip) return
    tip.innerHTML = tooltipHtml(feature, { year: yearRef.current })
    tip.style.transform = `translate(${event.point.x + 14}px, ${event.point.y + 14}px)`
    tip.style.display = 'block'
  }, [])

  const hideTip = useCallback(() => {
    if (tipRef.current) tipRef.current.style.display = 'none'
  }, [])

  useEffect(() => {
    let map
    try {
      map = new maplibregl.Map({
        container: hostRef.current,
        style: STYLE,
        center: viewRef.current?.center ?? [123.5, 13.3],
        zoom: viewRef.current?.zoom ?? 8,
        pitch: 45,
        maxPitch: 60,
        attributionControl: { compact: true },
      })
    } catch {
      unavailableCb.current?.()
      return undefined
    }
    mapRef.current = map

    map.on('load', () => {
      map.addSource(SRC, { type: 'geojson', data: EMPTY, promoteId: '_key' })
      map.addLayer({
        id: FILL,
        type: 'fill-extrusion',
        source: SRC,
        paint: {
          'fill-extrusion-color': ['get', '_fill'],
          'fill-extrusion-height': ['+', ['get', '_depth'], ['get', '_lift']],
        },
      })
      map.addLayer({
        id: LINE,
        type: 'line',
        source: SRC,
        filter: ['==', ['get', '_dash'], 0],
        paint: {
          'line-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#67e8f9', ['get', '_line']],
          'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], ['+', ['get', '_weight'], 1.5], ['get', '_weight']],
        },
      })
      map.addLayer({
        id: DASH,
        type: 'line',
        source: SRC,
        filter: ['==', ['get', '_dash'], 1],
        paint: {
          'line-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#67e8f9', ['get', '_line']],
          'line-width': ['get', '_weight'],
          'line-dasharray': [4, 3],
        },
      })
      setReady(true)
      readyCb.current?.(map)
    })

    map.on('mousemove', FILL, (event) => {
      const id = event.features?.[0]?.id ?? null
      if (id === hoverRef.current) {
        showTip(event)
        return
      }
      const previous = hoverRef.current
      hoverRef.current = id
      map.getCanvas().style.cursor = id == null ? '' : 'pointer'
      if (previous != null) {
        map.setFeatureState({ source: SRC, id: previous }, { hover: false })
        // New hover wins outright: the old area snaps back instead of easing alongside.
        moveTo(previous, targetFor(previous), { finishFirst: true })
      }
      if (id != null) {
        map.setFeatureState({ source: SRC, id }, { hover: true })
        moveTo(id, targetFor(id))
      }
      showTip(event)
    })

    map.on('mouseleave', FILL, () => {
      const previous = hoverRef.current
      hoverRef.current = null
      map.getCanvas().style.cursor = ''
      hideTip()
      if (previous != null) {
        map.setFeatureState({ source: SRC, id: previous }, { hover: false })
        moveTo(previous, targetFor(previous))
      }
    })

    map.on('click', FILL, (event) => {
      const id = event.features?.[0]?.id
      if (id == null) return
      selectRef.current?.(id === selectedRef.current ? null : id)
    })

    return () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
      animRef.current.clear()
      liftRef.current = new Map()
      map.remove()
      mapRef.current = null
    }
    // Mount-only: the entity is created when 3D is selected and destroyed when it is not.
  }, [hideTip, moveTo, showTip, targetFor])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const source = map.getSource(SRC)
    if (!source) return
    animRef.current.clear()
    cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    source.setData(data.collection)
    const keep = new Map()
    for (const key of [hoverRef.current, selectedRef.current]) {
      if (key != null) keep.set(key, targetFor(key))
    }
    liftRef.current = keep
    setLifts(keep)
    if (selectedRef.current != null) {
      map.setFeatureState({ source: SRC, id: selectedRef.current }, { selected: true })
    }
  }, [data, ready, setLifts, targetFor])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const previous = selectedRef.current
    selectedRef.current = selectedKey
    if (previous != null && previous !== selectedKey) {
      map.setFeatureState({ source: SRC, id: previous }, { selected: false })
      if (previous !== hoverRef.current) moveTo(previous, targetFor(previous))
    }
    if (selectedKey != null) {
      map.setFeatureState({ source: SRC, id: selectedKey }, { selected: true })
      moveTo(selectedKey, targetFor(selectedKey))
    }
  }, [moveTo, ready, selectedKey, targetFor])

  // Reduced motion turning on mid-flight finishes every offset immediately.
  useEffect(() => {
    if (!reducedMotion) return
    const values = new Map()
    for (const [key, anim] of animRef.current) {
      liftRef.current.set(key, anim.to)
      values.set(key, anim.to)
    }
    animRef.current.clear()
    cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    if (values.size) setLifts(values)
  }, [reducedMotion, setLifts])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !selectedFeature) return
    const bounds = boundsOf(selectedFeature)
    if (!bounds) return
    map.fitBounds(bounds, { padding: 48, maxZoom: 13.5, duration: reducedRef.current ? 0 : 700 })
  }, [ready, selectedFeature])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || resetToken === 0) return
    const bounds = boundsOf(joined)
    if (!bounds) return
    map.fitBounds(bounds, { padding: 28, duration: reducedRef.current ? 0 : 650 })
  }, [joined, ready, resetToken])

  return (
    <div className="absolute inset-0 z-[450]">
      <div ref={hostRef} className="h-full w-full" />
      <div
        ref={tipRef}
        className="bih-tip pointer-events-none absolute left-0 top-0 hidden"
        aria-hidden="true"
      />
    </div>
  )
}
