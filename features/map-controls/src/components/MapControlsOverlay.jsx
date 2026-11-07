// Bicol In-Heat — map-controls historical time + layer overlay.
// Sibling of <MapContainer>; the host passes the Leaflet map instance for zoom,
// so the overlay never relies on React context from outside its provider.
// Layer toggles go through the layer-registry seam; layer-uhi-terrain's registry
// is not shipped yet, so the host can pass layerRegistry and/or onLayerChange.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  PLAYBACK_MS,
  canToggleLayer,
  clampIndex,
  clampZoom,
  formatTimestamp,
  timelineStore,
} from '../state/timelineStore.js'
import {
  IconChevronLeft,
  IconChevronRight,
  IconLayers,
  IconMinus,
  IconPause,
  IconPlay,
  IconPlus,
  IconReset,
  IconThermometer,
  IconTrend,
} from './Icons.jsx'

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

export function usePrefersReducedMotion() {
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
  'pointer-events-auto rounded-xl border border-white/10 bg-heat-surface/90 text-slate-100 shadow-hud backdrop-blur-md'
const BTN =
  'inline-flex cursor-pointer items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-slate-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber focus-visible:ring-offset-2 focus-visible:ring-offset-heat-deep'
const ICON_BTN = `${BTN} h-9 w-9`

function ModeButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber ${
        active ? 'bg-heat-amber text-slate-950' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
      }`}
    >
      {children}
    </button>
  )
}

function TimeScrubber({ store, reducedMotion, viewMode, onViewModeChange }) {
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
    <div role="group" aria-label="Historical time controls" className={`${GLASS} flex w-full flex-col gap-2 px-3 py-2.5 sm:px-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Historical time</span>
          <span className="font-mono text-sm font-semibold text-slate-100" aria-live="polite">
            {current || 'No data'}
          </span>
        </div>
        <div role="group" aria-label="Map data mode" className="flex items-center rounded-lg border border-white/10 bg-black/25 p-0.5">
          <ModeButton active={viewMode === 'trend'} onClick={() => onViewModeChange?.('trend')}>
            <IconTrend className="h-3.5 w-3.5" />
            Trend
          </ModeButton>
          <ModeButton active={viewMode === 'year'} onClick={() => onViewModeChange?.('year')}>
            <IconThermometer className="h-3.5 w-3.5" />
            Year
          </ModeButton>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous year"
          disabled={!canStep}
          onClick={() => {
            onViewModeChange?.('year')
            actions.prev()
          }}
          className={ICON_BTN}
        >
          <IconChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={playing ? 'Pause playback' : 'Play playback'}
          aria-pressed={playing}
          disabled={!canStep || reducedMotion}
          title={reducedMotion ? 'Autoplay is off because your system prefers reduced motion' : undefined}
          onClick={() => {
            onViewModeChange?.('year')
            actions.toggle()
          }}
          className={ICON_BTN}
        >
          {playing ? <IconPause className="h-4 w-4" /> : <IconPlay className="h-4 w-4" />}
        </button>
        <button
          type="button"
          aria-label="Next year"
          disabled={!canStep}
          onClick={() => {
            onViewModeChange?.('year')
            actions.next()
          }}
          className={ICON_BTN}
        >
          <IconChevronRight className="h-4 w-4" />
        </button>
        <input
          type="range"
          min={0}
          max={Math.max(count - 1, 0)}
          step={1}
          value={count ? safeIndex : 0}
          disabled={!canStep}
          aria-label="Selected historical year"
          aria-valuetext={valueText}
          onChange={(event) => {
            onViewModeChange?.('year')
            actions.seek(Number(event.target.value))
          }}
          className="bih-range w-full cursor-pointer disabled:cursor-not-allowed"
        />
      </div>

      <div className="flex justify-between font-mono text-[10px] text-slate-500">
        <span>{first}</span>
        <span>{last}</span>
      </div>
    </div>
  )
}

function ZoomPanel({ map, limits, onReset }) {
  const min = limits?.min ?? 2
  const max = limits?.max ?? 18
  const [zoom, setZoom] = useState(() => map?.getZoom() ?? min)
  const targetRef = useRef(map?.getZoom() ?? min)

  useEffect(() => {
    if (!map) return
    targetRef.current = map.getZoom()
    setZoom(map.getZoom())
    const onZoomEnd = () => {
      targetRef.current = map.getZoom()
      setZoom(map.getZoom())
    }
    map.on('zoomend', onZoomEnd)
    return () => {
      map.off('zoomend', onZoomEnd)
    }
  }, [map])

  // Rapid clicks must stack from the pending target, not the mid-animation zoom,
  // otherwise a burst of clicks gets stuck below max.
  const step = (delta) => {
    if (!map) return
    const next = clampZoom((targetRef.current ?? map.getZoom()) + delta, min, max)
    targetRef.current = next
    map.setZoom(next)
  }

  return (
    <div role="group" aria-label="Map zoom" className={`${GLASS} flex items-center gap-0.5 p-1`}>
      <button
        type="button"
        aria-label="Zoom out"
        disabled={zoom <= Math.min(min, max)}
        onClick={() => step(-1)}
        className={ICON_BTN}
      >
        <IconMinus className="h-4 w-4" />
      </button>
      <span className="min-w-9 text-center font-mono text-[10px] text-slate-400" aria-live="polite">
        z{Number(zoom).toFixed(1)}
      </span>
      <button
        type="button"
        aria-label="Zoom in"
        disabled={zoom >= Math.max(min, max)}
        onClick={() => step(1)}
        className={ICON_BTN}
      >
        <IconPlus className="h-4 w-4" />
      </button>
      <span className="mx-0.5 h-5 w-px bg-white/10" aria-hidden="true" />
      <button type="button" aria-label="Reset view to Bicol" onClick={onReset} className={ICON_BTN}>
        <IconReset className="h-4 w-4" />
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
    <div role="group" aria-label="Map layers" className={`${GLASS} flex flex-col gap-1 p-1.5`}>
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
            className={`${BTN} justify-start gap-2 px-2 py-1.5 text-left text-xs ${on ? 'bg-white/10' : ''}`}
          >
            <IconLayers className="h-3.5 w-3.5 text-slate-400" />
            <span>{layer.label ?? layer.id}</span>
            {kind ? <span className="ml-1 text-[10px] text-slate-500">{kind}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

export default function MapControlsOverlay({
  map = null,
  timestamps = [],
  store = timelineStore,
  layerRegistry = null,
  onLayerChange,
  onTimeChange,
  onReset,
  viewMode = 'trend',
  onViewModeChange,
  zoomLimits = { min: 7, max: 18 },
}) {
  const actions = useTimelineActions(store)
  const selected = useTimelineState(selectTimestamps, store)
  const index = useTimelineState(selectIndex, store)
  const playing = useTimelineState(selectPlaying, store)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    const previousCount = store.getState().timestamps.length
    actions.setTimestamps(timestamps)
    // Open on the latest year, not 1981, when the data first arrives.
    if (previousCount === 0 && timestamps.length > 0) actions.seek(timestamps.length - 1)
  }, [actions, store, timestamps])

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
      <div className="flex items-start justify-end">
        <div className="flex flex-col items-end gap-2">
          <LayerPanel registry={layerRegistry} onLayerChange={onLayerChange} />
          <ZoomPanel map={map} limits={zoomLimits} onReset={onReset} />
        </div>
      </div>
      <div className="w-full max-w-2xl self-center">
        <TimeScrubber
          store={store}
          reducedMotion={reducedMotion}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
        />
      </div>
    </div>
  )
}
