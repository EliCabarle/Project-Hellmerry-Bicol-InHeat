// Bicol In-Heat — map-controls historical time + layer overlay (slice 2)
// Mounted inside <MapContainer> (uses useMap), never touches the app shell.
// Layer toggles go through the layer-registry seam; layer-uhi-terrain's registry
// is not shipped yet, so the host can pass layerRegistry and/or onLayerChange.

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { useMap } from 'react-leaflet'
import {
  PLAYBACK_MS,
  canToggleLayer,
  clampIndex,
  clampZoom,
  formatTimestamp,
  timelineStore,
} from '../state/timelineStore.js'

// Selectors are module-level so getSnapshot stays stable. They must return a
// primitive or a reference that only changes when the slice changes.
const selectTimestamps = (s) => s.timestamps
const selectIndex = (s) => s.index
const selectPlaying = (s) => s.playing

export function useTimelineState(selector = (s) => s, store = timelineStore) {
  const getSnapshot = useCallback(() => selector(store.getState()), [selector, store])
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot)
}

// Single seam for swapping in a core store later: components only ever call these.
export function useTimelineActions(store = timelineStore) {
  return store.actions
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (event) => setReduced(event.matches)
    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else mq.addListener(onChange)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange)
      else mq.removeListener(onChange)
    }
  }, [])
  return reduced
}

const GLASS =
  'pointer-events-auto rounded-lg border border-slate-700 bg-slate-900/80 text-slate-100 shadow-lg backdrop-blur'
const BTN =
  'rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900'

function TimeScrubber({ store, reducedMotion }) {
  const timestamps = useTimelineState(selectTimestamps, store)
  const index = useTimelineState(selectIndex, store)
  const playing = useTimelineState(selectPlaying, store)
  const actions = useTimelineActions(store)

  const count = timestamps.length
  const canStep = count > 1
  const safeIndex = clampIndex(index, count)
  const current = count ? formatTimestamp(timestamps[safeIndex]) : ''
  const first = count ? formatTimestamp(timestamps[0]) : '—'
  const last = count ? formatTimestamp(timestamps[count - 1]) : '—'
  const valueText = count
    ? `${current} (${safeIndex + 1} of ${count})`
    : 'No timestamps available'

  return (
    <div role="group" aria-label="Historical time controls" className={`${GLASS} flex w-full flex-col gap-2 p-3`}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold">Historical time</span>
        <span className="text-slate-300" aria-live="polite">
          {current || 'No data'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" aria-label="Previous timestamp" disabled={!canStep} onClick={() => actions.prev()} className={BTN}>
          ◀
        </button>
        <button
          type="button"
          aria-label={playing ? 'Pause playback' : 'Play playback'}
          aria-pressed={playing}
          disabled={!canStep || reducedMotion}
          title={reducedMotion ? 'Autoplay is off because your system prefers reduced motion' : undefined}
          onClick={() => actions.toggle()}
          className={BTN}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <button type="button" aria-label="Next timestamp" disabled={!canStep} onClick={() => actions.next()} className={BTN}>
          ▶❚
        </button>
        <input
          type="range"
          min={0}
          max={Math.max(count - 1, 0)}
          step={1}
          value={count ? safeIndex : 0}
          disabled={!canStep}
          aria-label="Selected historical timestamp"
          aria-valuetext={valueText}
          onChange={(event) => actions.seek(Number(event.target.value))}
          className="h-2 w-full cursor-pointer accent-slate-300 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
        />
      </div>

      <div className="flex justify-between text-[11px] text-slate-400">
        <span>{first}</span>
        <span>{last}</span>
      </div>
    </div>
  )
}

function ZoomPanel({ limits }) {
  const map = useMap()
  const min = limits?.min ?? 2
  const max = limits?.max ?? 18
  const [zoom, setZoom] = useState(() => map.getZoom())

  useEffect(() => {
    const onZoomEnd = () => setZoom(map.getZoom())
    map.on('zoomend', onZoomEnd)
    return () => {
      map.off('zoomend', onZoomEnd)
    }
  }, [map])

  const step = (delta) => map.setZoom(clampZoom(map.getZoom() + delta, min, max))

  return (
    <div role="group" aria-label="Map zoom" className={`${GLASS} flex items-center gap-1 p-1`}>
      <button type="button" aria-label="Zoom out" disabled={zoom <= Math.min(min, max)} onClick={() => step(-1)} className={BTN}>
        −
      </button>
      <span className="min-w-8 text-center text-xs text-slate-300" aria-live="polite">
        {zoom}
      </span>
      <button type="button" aria-label="Zoom in" disabled={zoom >= Math.max(min, max)} onClick={() => step(1)} className={BTN}>
        +
      </button>
    </div>
  )
}

const KIND_LABELS = {
  'heat-index': 'Heat index (felt)',
  lst: 'Land surface temp (LST)',
  canopy: 'Tree cover',
  'land-cover': 'Land cover',
  terrain: 'Terrain',
}

function LayerPanel({ registry, onLayerChange }) {
  const [local, setLocal] = useState({})
  // Only layers the host/registry actually supports — no invented overlays.
  const layers = Array.isArray(registry?.layers) ? registry.layers.filter((layer) => layer?.id) : []
  if (layers.length === 0) return null

  const isOn = (id) =>
    typeof registry?.isActive === 'function' ? Boolean(registry.isActive(id)) : Boolean(local[id])

  const toggle = (id) => {
    if (!canToggleLayer(registry, id, onLayerChange)) return
    const next = !isOn(id)
    if (typeof registry?.setActive === 'function') registry.setActive(id, next)
    else onLayerChange(id, next)
    setLocal((current) => ({ ...current, [id]: next }))
  }

  return (
    <div role="group" aria-label="Map layers" className={`${GLASS} flex flex-col gap-1 p-2`}>
      {layers.map((layer) => {
        const on = isOn(layer.id)
        const kind = KIND_LABELS[layer.kind] ?? ''
        return (
          <button
            key={layer.id}
            type="button"
            aria-pressed={on}
            disabled={!canToggleLayer(registry, layer.id, onLayerChange)}
            onClick={() => toggle(layer.id)}
            className={`${BTN} text-left ${on ? 'border-slate-300 bg-slate-700' : ''}`}
          >
            <span>{layer.label ?? layer.id}</span>
            {kind ? <span className="ml-2 text-[11px] text-slate-400">{kind}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

export default function MapControlsOverlay({
  timestamps = [],
  store = timelineStore,
  layerRegistry = null,
  onLayerChange,
  onTimeChange,
  zoomLimits = { min: 2, max: 18 },
}) {
  const actions = useTimelineActions(store)
  const selected = useTimelineState(selectTimestamps, store)
  const index = useTimelineState(selectIndex, store)
  const playing = useTimelineState(selectPlaying, store)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    actions.setTimestamps(timestamps)
  }, [actions, timestamps])

  // Existing feature contract: publish selected time/index to the host/layers.
  useEffect(() => {
    if (typeof onTimeChange === 'function') onTimeChange(selected[index] ?? null, index)
  }, [index, onTimeChange, selected])

  // Playback timer — 900 ms, loops via store wrap, cleaned up on pause/unmount.
  useEffect(() => {
    if (!playing || reducedMotion || selected.length < 2) return
    const timer = setInterval(() => actions.tick(), PLAYBACK_MS)
    return () => clearInterval(timer)
  }, [actions, playing, reducedMotion, selected.length])

  return (
    <div className="pointer-events-none absolute inset-0 z-[700] flex flex-col justify-between p-3">
      <div className="flex justify-end">
        <div className="flex flex-col items-end gap-2">
          <LayerPanel registry={layerRegistry} onLayerChange={onLayerChange} />
          <ZoomPanel limits={zoomLimits} />
        </div>
      </div>
      <div className="w-full max-w-xl self-center">
        <TimeScrubber store={store} reducedMotion={reducedMotion} />
      </div>
    </div>
  )
}
