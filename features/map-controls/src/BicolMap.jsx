import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import { MapContainer, GeoJSON, Tooltip, useMap } from 'react-leaflet'
import raw from './data/ph-regions.geojson?raw'
import {
  loadRegions,
  findBicol,
  getRegionStyle,
  getRegionOutlineStyle,
  getMunicipalityStyle,
  joinNarratives,
  joinKey,
} from './gis/engine.js'
import { tooltipHtml } from './components/municipalityTooltip.js'
import './components/municipalityTooltip.css'
import MunicipalityLegend from './components/MunicipalityLegend.jsx'
import MapControlsOverlay from './components/MapControlsOverlay.jsx'

const geojson = JSON.parse(raw)

const keyOf = (feature) => {
  const p = feature?.properties ?? {}
  return joinKey(p.adm3_en, p.province) || p.shapeName || ''
}

function FitBicol() {
  const map = useMap()
  useEffect(() => {
    const bicol = findBicol(geojson)
    if (bicol) {
      const bounds = L.geoJSON(bicol).getBounds()
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24] })
    }
  }, [map])
  return null
}

// react-leaflet does not re-run style() on state change; remounting the layer is
// cheap at 114 features and guarantees the selection highlight applies
function MunicipalityLayer({ joined, selectedKey, onSelect }) {
  return (
    <GeoJSON
      key={selectedKey ?? 'none'}
      data={joined}
      style={(f) => getMunicipalityStyle(f, { selected: keyOf(f) === selectedKey })}
      onEachFeature={(feature, layer) => {
        layer.bindTooltip(tooltipHtml(feature), { sticky: true, className: 'bih-tip' })
        layer.on('mouseover', () => layer.setStyle({ weight: (layer.options.weight ?? 1) + 1 }))
        layer.on('mouseout', () => layer.setStyle(getMunicipalityStyle(feature, { selected: keyOf(feature) === selectedKey })))
        layer.on('click', () => {
          const k = keyOf(feature)
          onSelect(selectedKey === k ? null : k)
          layer.openTooltip()
        })
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
  zoomLimits = { min: 2, max: 18 },
  status = 'idle',
  error = null,
  reload,
  geojson: munGeojson = null,
  narratives = null,
  coverage = { withData: 0, total: 0 },
}) {
  const regions = loadRegions(geojson)
  const ready = status === 'ready' && munGeojson?.features?.length > 0
  const joined = useMemo(
    () => (ready ? joinNarratives(munGeojson, narratives) : null),
    [ready, munGeojson, narratives],
  )
  const [selectedKey, setSelectedKey] = useState(null)

  return (
    <MapContainer
      center={[13.3, 123.5]}
      zoom={6}
      attributionControl={false}
      className="h-full w-full"
    >
      <FitBicol />
      {/* loading: slice-1 solid fills; ready: outline only so municipality fills show */}
      <GeoJSON
        data={geojson}
        style={ready ? getRegionOutlineStyle : getRegionStyle}
      />
      {ready && (
        <MunicipalityLayer
          joined={joined}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
        />
      )}
      <div className="pointer-events-none absolute top-3 left-3 z-[500] rounded bg-heat-bg/80 px-3 py-2 text-sm text-slate-200">
        <span className="font-semibold text-heat-hot">
          {regions.filter((r) => r.isBicol).length} region highlighted:
        </span>{' '}
        Bicol (Region V) — the rest of the Philippines shaded dark
      </div>
      {status === 'loading' && (
        <div
          aria-busy="true"
          className="pointer-events-none absolute top-14 left-3 z-[600] rounded border border-slate-700 bg-heat-bg/80 px-3 py-2 text-sm text-slate-300"
        >
          Loading municipality data…
        </div>
      )}
      {status === 'error' && (
        <div
          role="alert"
          className="absolute top-14 left-3 z-[600] rounded border border-heat-hot bg-heat-bg/90 px-3 py-2 text-sm text-slate-200"
        >
          <div className="font-semibold">Could not load municipality data</div>
          <div className="mb-2 text-slate-400">{error}</div>
          <button
            type="button"
            onClick={() => reload?.()}
            className="cursor-pointer rounded bg-heat-hot px-2 py-1 text-xs font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            Try again
          </button>
        </div>
      )}
      {status === 'ready' && !ready && (
        <div className="pointer-events-none absolute top-14 left-3 z-[600] rounded border border-slate-700 bg-heat-bg/80 px-3 py-2 text-sm text-slate-300">
          No municipality boundaries found
        </div>
      )}
      {ready && <MunicipalityLegend coverage={coverage} />}
      <MapControlsOverlay
        timestamps={timestamps}
        store={store}
        layerRegistry={layerRegistry}
        onLayerChange={onLayerChange}
        onTimeChange={onTimeChange}
        zoomLimits={zoomLimits}
      />
    </MapContainer>
  )
}
