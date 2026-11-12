import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import L from 'leaflet'
import { MapContainer, GeoJSON, TileLayer, useMap } from 'react-leaflet'
import raw from './data/ph-regions.geojson?raw'
import {
  loadRegions,
  findBicol,
  getRegionStyle,
  getRegionOutlineStyle,
  getMunicipalityStyle,
  joinNarratives,
  featureKey,
} from './gis/engine.js'
import { tooltipHtml } from './components/municipalityTooltip.js'
import './components/municipalityTooltip.css'
import MunicipalityLegend from './components/MunicipalityLegend.jsx'
import MapControlsOverlay, { usePrefersReducedMotion } from './components/MapControlsOverlay.jsx'
import MunicipalityInfoCard from './components/MunicipalityInfoCard.jsx'
import MunicipalityIndex from './components/MunicipalityIndex.jsx'
import { timelineStore } from './state/timelineStore.js'
import { COUNTRY_BOUNDS, STUDY_REGION_BOUNDS, MIN_ZOOM, MAX_ZOOM, BOUNDS_VISCOSITY } from './gis/countryFrame.js'

// 3D is a separate entity with its own renderer, so it is loaded on demand and
// never lands in the 2D bundle.
const Municipality3DLayer = lazy(() => import('./Municipality3DLayer.jsx'))

const geojson = JSON.parse(raw)

const IMAGERY_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const LABELS_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'

function MapViewport({ bicolFeature, selectedFeature, resetToken }) {
  const map = useMap()
  const reducedMotion = usePrefersReducedMotion()
  const fitted = useRef(false)

  useEffect(() => {
    if (!bicolFeature || fitted.current) return
    const bounds = L.geoJSON(bicolFeature).getBounds()
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [28, 28], animate: false })
      fitted.current = true
    }
  }, [bicolFeature, map])

  useEffect(() => {
    if (resetToken === 0 || !bicolFeature) return
    const bounds = L.geoJSON(bicolFeature).getBounds()
    if (!bounds.isValid()) return
    if (reducedMotion) map.fitBounds(bounds, { padding: [28, 28] })
    else map.flyToBounds(bounds, { padding: [28, 28], duration: 0.65 })
  }, [bicolFeature, map, reducedMotion, resetToken])

  useEffect(() => {
    if (!selectedFeature) return
    const bounds = L.geoJSON(selectedFeature).getBounds()
    if (!bounds.isValid()) return
    if (reducedMotion) map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13.5 })
    else map.flyToBounds(bounds, { padding: [48, 48], maxZoom: 13.5, duration: 0.7 })
  }, [map, reducedMotion, selectedFeature])

  return null
}

function ariaLabelFor(feature) {
  const p = feature?.properties ?? {}
  const name = p.adm3_en ?? 'Municipality'
  const province = p.province ? `, ${p.province}` : ''
  const t = p.narrative?.trend
  if (!t) return `${name}${province}. Trend data pending.`
  const slope = typeof t.slope_c_per_year === 'number'
    ? `${t.slope_c_per_year >= 0 ? '+' : ''}${t.slope_c_per_year.toFixed(3)} degrees Celsius per year`
    : 'unknown warming rate'
  return `${name}${province}. ${t.direction ?? 'flat'}, ${slope}, ${t.is_significant ? 'significant' : 'not significant'}.`
}

// react-leaflet does not re-run style() on state change. Keep one persistent
// GeoJSON layer and update styles in place; remounting 114 features on every
// selection made zoom feel janky.
function MunicipalityLayer({ joined, selectedKey, viewMode, year, onSelect }) {
  const layerRef = useRef(null)
  const stateRef = useRef({ selectedKey, viewMode, year })
  const selectRef = useRef(onSelect)
  const entryKey = joined?.features?.[0] ? featureKey(joined.features[0]) : null
  stateRef.current = { selectedKey, viewMode, year }
  selectRef.current = onSelect

  const styleFor = useCallback(
    (feature) =>
      getMunicipalityStyle(feature, {
        selected: featureKey(feature) === stateRef.current.selectedKey,
        viewMode: stateRef.current.viewMode,
        year: stateRef.current.year,
      }),
    [],
  )

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    // Roving tabindex: one municipality is reachable with Tab, then arrow keys
    // move through the map without adding 114 stops to the page.
    const tabbable = selectedKey ?? entryKey
    layer.eachLayer((child) => {
      child.setStyle(styleFor(child.feature))
      const el = child.getElement?.()
      if (el) el.setAttribute('tabindex', featureKey(child.feature) === tabbable ? '0' : '-1')
      if (featureKey(child.feature) === selectedKey) child.bringToFront()
    })
  }, [entryKey, joined, selectedKey, styleFor, viewMode, year])

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    layer.eachLayer((child) => {
      child.setTooltipContent(tooltipHtml(child.feature, { year }))
    })
  }, [joined, year])

  return (
    <GeoJSON
      key="bicol-municipalities"
      ref={layerRef}
      data={joined}
      style={styleFor}
      onEachFeature={(feature, layer) => {
        layer.bindTooltip(tooltipHtml(feature, { year: stateRef.current.year }), {
          sticky: true,
          className: 'bih-tip',
          direction: 'top',
          opacity: 1,
        })

        const select = () => {
          const key = featureKey(feature)
          const next = stateRef.current.selectedKey === key ? null : key
          selectRef.current?.(next)
        }

        layer.on('add', () => {
          const el = layer.getElement?.()
          if (!el) return
          const tabbableKey = stateRef.current.selectedKey ?? entryKey
          el.setAttribute('role', 'button')
          el.setAttribute('aria-label', ariaLabelFor(feature))
          el.setAttribute('tabindex', featureKey(feature) === tabbableKey ? '0' : '-1')

          const moveFocus = (delta) => {
            const svg = el.ownerSVGElement
            if (!svg) return
            const paths = Array.from(svg.querySelectorAll('path[role="button"]'))
            const at = paths.indexOf(el)
            if (at < 0) return
            paths[(at + delta + paths.length) % paths.length]?.focus()
          }

          el.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              select()
              return
            }
            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
              event.preventDefault()
              moveFocus(1)
              return
            }
            if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
              event.preventDefault()
              moveFocus(-1)
              return
            }
            if (event.key === 'Home') {
              event.preventDefault()
              const svg = el.ownerSVGElement
              svg?.querySelector('path[role="button"]')?.focus()
              return
            }
            if (event.key === 'End') {
              event.preventDefault()
              const paths = el.ownerSVGElement?.querySelectorAll('path[role="button"]')
              paths?.[paths.length - 1]?.focus()
            }
          })
          el.addEventListener('focus', () => {
            const style = styleFor(feature)
            layer.setStyle({ ...style, weight: style.weight + 1.5, color: '#f8fafc' })
            layer.openTooltip()
          })
          el.addEventListener('blur', () => {
            layer.setStyle(styleFor(feature))
            layer.closeTooltip()
          })
        })

        layer.on('mouseover', () => {
          const style = styleFor(feature)
          layer.setStyle({ ...style, weight: style.weight + 1, color: '#f8fafc' })
        })
        layer.on('mouseout', () => layer.setStyle(styleFor(feature)))
        layer.on('click', select)
      }}
    />
  )
}

export default function BicolMap({
  timestamps = [],
  timelineStore: store,
  layerRegistry = null,
  onLayerChange,
  onTimeChange,
  zoomLimits = { min: MIN_ZOOM, max: MAX_ZOOM },
  status = 'idle',
  error = null,
  reload,
  geojson: munGeojson = null,
  narratives = null,
  coverage = { withData: 0, total: 0 },
  // Cross-screen handoff (Dashboard "Show on map" / #muni= deep link). Key is a
  // province-qualified joinKey; token rises per request so re-clicking the same
  // LGU refires after a manual clear.
  initialSelectedKey = null,
  focusToken = 0,
}) {
  const regions = useMemo(() => loadRegions(geojson), [])
  const bicolFeature = useMemo(() => findBicol(geojson), [])
  const ready = status === 'ready' && munGeojson?.features?.length > 0
  const joined = useMemo(
    () => (ready ? joinNarratives(munGeojson, narratives) : null),
    [ready, munGeojson, narratives],
  )
  const activeStore = store ?? timelineStore
  const selectedIndex = useSyncExternalStore(
    activeStore.subscribe,
    () => activeStore.getState().index,
    () => activeStore.getState().index,
  )
  const derivedTimestamps = useMemo(() => {
    if (timestamps.length > 0) return timestamps
    const series = narratives?.municipalities?.[0]?.series
    return Array.isArray(series) ? series.map((row) => row.year) : []
  }, [narratives, timestamps])
  const latestYear = derivedTimestamps.length
    ? Number(derivedTimestamps[derivedTimestamps.length - 1])
    : narratives?.municipalities?.[0]?.latest?.year ?? null
  const selectedYear = derivedTimestamps.length
    ? Number(derivedTimestamps[Math.min(selectedIndex, derivedTimestamps.length - 1)])
    : latestYear
  const [viewMode, setViewMode] = useState('trend')
  const [selectedKey, setSelectedKey] = useState(null)
  const [indexOpen, setIndexOpen] = useState(false)
  const [resetToken, setResetToken] = useState(0)
  const [map, setMap] = useState(null)
  const [renderMode, setRenderMode] = useState('2d')
  const [map3d, setMap3d] = useState(null)
  const [view3d, setView3d] = useState(null)

  // Hand the current 2D camera to the 3D entity so toggling does not jump.
  const changeRenderMode = (mode) => {
    if (mode === renderMode) return
    if (mode === '3d') {
      const center = map?.getCenter()
      setView3d({ center: center ? [center.lng, center.lat] : [123.5, 13.3], zoom: map?.getZoom() ?? 8 })
    } else {
      setMap3d(null)
    }
    setRenderMode(mode)
  }

  // Applies the cross-screen focus once per token, never fighting internal
  // selection afterwards.
  useEffect(() => {
    if (focusToken && initialSelectedKey) setSelectedKey(initialSelectedKey)
  }, [focusToken, initialSelectedKey])

  const displayYear = viewMode === 'year' ? selectedYear : null
  const selectedFeature = useMemo(
    () => (selectedKey ? joined?.features?.find((f) => featureKey(f) === selectedKey) ?? null : null),
    [joined, selectedKey],
  )

  useEffect(() => {
    const onEscape = (event) => {
      if (event.key !== 'Escape') return
      setSelectedKey(null)
      setIndexOpen(false)
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [])

  const resetView = () => {
    setSelectedKey(null)
    setResetToken((token) => token + 1)
  }

  return (
    <div className="relative h-full w-full">
      <MapContainer
        ref={setMap}
        center={[13.3, 123.5]}
        zoom={Math.max(8, MIN_ZOOM)}
        role="region"
        aria-label="Bicol municipality heat map"
        minZoom={zoomLimits?.min ?? MIN_ZOOM}
        maxZoom={zoomLimits?.max ?? MAX_ZOOM}
        zoomControl={false}
        attributionControl
        zoomSnap={0.5}
        zoomDelta={0.5}
        maxBounds={COUNTRY_BOUNDS}
        maxBoundsViscosity={BOUNDS_VISCOSITY}
        className="bih-map-frame h-full w-full"
      >
        <TileLayer
          url={IMAGERY_URL}
          attribution="Imagery © Esri, Maxar, Earthstar Geographics"
          maxZoom={18}
          maxNativeZoom={18}
          noWrap={true}
        />
        <TileLayer url={LABELS_URL} maxZoom={18} opacity={0.92} noWrap={true} />

        {renderMode === '2d' && (
          <MapViewport
            bicolFeature={bicolFeature}
            selectedFeature={selectedFeature}
            resetToken={resetToken}
          />
        )}

        {/* loading: solid region fills; ready: outline only so satellite and municipality fills show */}
        <GeoJSON data={geojson} style={ready ? getRegionOutlineStyle : getRegionStyle} />

        {renderMode === '2d' && ready && joined && (
          <MunicipalityLayer
            joined={joined}
            selectedKey={selectedKey}
            viewMode={viewMode}
            year={displayYear}
            onSelect={setSelectedKey}
          />
        )}
      </MapContainer>

      {renderMode === '3d' && ready && joined && (
        <Suspense fallback={null}>
          <Municipality3DLayer
            joined={joined}
            selectedKey={selectedKey}
            selectedFeature={selectedFeature}
            viewMode={viewMode}
            year={displayYear}
            initialView={view3d}
            resetToken={resetToken}
            onSelect={setSelectedKey}
            onReady={setMap3d}
            onUnavailable={() => setRenderMode('2d')}
          />
        </Suspense>
      )}

      <MunicipalityLegend
        coverage={coverage}
        viewMode={viewMode}
        year={viewMode === 'year' ? selectedYear : latestYear}
        onBrowse={() => setIndexOpen(true)}
      />

      {ready && (
        <MunicipalityInfoCard feature={selectedFeature} year={displayYear} onClose={() => setSelectedKey(null)} />
      )}

      {indexOpen && (
        <MunicipalityIndex
          features={joined?.features ?? []}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
          onClose={() => setIndexOpen(false)}
        />
      )}

      {status === 'loading' && (
        <div
          role="status"
          aria-busy="true"
          className="pointer-events-none absolute left-1/2 top-3 z-[600] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-white/10 bg-heat-surface/90 px-3 py-2 text-xs text-slate-300 shadow-hud backdrop-blur"
        >
          <span className="bih-spinner" aria-hidden="true" />
          Loading satellite view and municipality data…
        </div>
      )}

      {status === 'error' && (
        <div
          role="alert"
          className="absolute left-1/2 top-16 z-[620] w-[min(22rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-xl border border-heat-hot/60 bg-heat-surface/95 px-3 py-2.5 text-sm text-slate-200 shadow-hud backdrop-blur"
        >
          <div className="font-semibold">Could not load municipality data</div>
          <div className="mb-2 text-xs text-slate-400">{error}</div>
          <button
            type="button"
            onClick={() => reload?.()}
            className="cursor-pointer rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber"
          >
            Try again
          </button>
        </div>
      )}

      {status === 'ready' && !ready && (
        <div className="pointer-events-none absolute left-1/2 top-16 z-[600] -translate-x-1/2 rounded-xl border border-white/10 bg-heat-surface/90 px-3 py-2 text-sm text-slate-300 shadow-hud backdrop-blur">
          No municipality boundaries found
        </div>
      )}

      <MapControlsOverlay
        map={renderMode === '3d' ? map3d : map}
        timestamps={derivedTimestamps}
        store={activeStore}
        layerRegistry={layerRegistry}
        onLayerChange={onLayerChange}
        onTimeChange={onTimeChange}
        onReset={resetView}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        renderMode={renderMode}
        onRenderModeChange={changeRenderMode}
        zoomLimits={zoomLimits}
      />
    </div>
  )
}
