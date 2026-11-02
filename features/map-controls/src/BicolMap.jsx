import { useEffect } from 'react'
import L from 'leaflet'
import { MapContainer, GeoJSON, Tooltip, useMap } from 'react-leaflet'
import raw from './data/ph-regions.geojson?raw'
import { loadRegions, findBicol, getRegionStyle } from './gis/engine.js'

const geojson = JSON.parse(raw)

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

export default function BicolMap() {
  const regions = loadRegions(geojson)
  return (
    <MapContainer
      center={[13.3, 123.5]}
      zoom={6}
      attributionControl={false}
      className="h-full w-full"
    >
      <FitBicol />
      <GeoJSON
        data={geojson}
        style={getRegionStyle}
        onEachFeature={(feature, layer) => {
          layer.bindTooltip(feature.properties?.shapeName ?? '', { sticky: true })
        }}
      />
      <div className="pointer-events-none absolute top-3 left-3 z-[500] rounded bg-heat-bg/80 px-3 py-2 text-sm text-slate-200">
        <span className="font-semibold text-heat-hot">
          {regions.filter((r) => r.isBicol).length} region highlighted:
        </span>{' '}
        Bicol (Region V) — the rest of the Philippines shaded dark
      </div>
    </MapContainer>
  )
}
