// Bicol In-Heat — map-controls historical time + layer overlay.
// Sibling of <MapContainer>; the host passes the Leaflet map instance for zoom,
// so the overlay never relies on React context from outside its provider.
// Layer toggles go through the layer-registry seam; layer-uhi-terrain's registry
// is not shipped yet, so the host can pass layerRegistry and/or onLayerChange.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  DAY_PLAY_MS,
  DAY_STEP_CHOICES,
  PLAYBACK_MS,
  canToggleLayer,
  clampIndex,
  clampZoom,
  formatTimestamp,
  timelineStore,
} from "../state/timelineStore.js";
import {
  addDays,
  dateFromDayOfYear,
  dayOfYear,
  daysInYear,
  isValidISO,
  parseDateQuery,
  resolveQuery,
  spelledDate,
} from "../state/dateModel.js";
import { DAILY_MISSING_REASON } from "../data/dailyStore.js";
import {
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
  IconLayers,
  IconMinus,
  IconPause,
  IconPlay,
  IconPlus,
  IconReset,
  IconRobot,
  IconSearch,
  IconThermometer,
  IconTrend,
} from "./Icons.jsx";

// Selectors are module-level so getSnapshot stays stable. They must return a
// primitive or a reference that only changes when the slice changes.
const selectTimestamps = (s) => s.timestamps;
const selectIndex = (s) => s.index;
const selectPlaying = (s) => s.playing;
const selectDate = (s) => s.date;
const selectViewMode = (s) => s.viewMode;
const selectDayStep = (s) => s.dayStep;
const selectRangeMin = (s) => s.range?.min ?? null;
const selectRangeMax = (s) => s.range?.max ?? null;

export function useTimelineState(selector = (s) => s, store = timelineStore) {
  const getSnapshot = useCallback(
    () => selector(store.getState()),
    [selector, store],
  );
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

// Single seam for swapping in a core store later: components only ever call these.
export function useTimelineActions(store = timelineStore) {
  return store.actions;
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    )
      return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event) => setReduced(event.matches);
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);
  return reduced;
}

const GLASS =
  "pointer-events-auto rounded-xl border border-white/10 bg-heat-surface/90 text-slate-100 shadow-hud backdrop-blur-md";
const BTN =
  "inline-flex cursor-pointer items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-slate-200 bih-btn hover:bg-white/10";
const ICON_BTN = `${BTN} h-9 w-9`;
const SMALL_BTN = `${BTN} h-8 px-2 text-[11px] font-semibold`;
const SEARCH_INPUT =
  "w-full min-w-0 rounded-md border border-white/10 bg-black/25 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber";

function ModeButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold bih-btn ${
        active ? "bg-heat-amber text-slate-950" : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

const SEARCH_PLACEHOLDER = "2019-04-23, Apr 2019, 2019";

function DateSearch({ actions, rangeMin, rangeMax, dailyReady }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState(null); // {kind:'ok'|'error', message}

  const submit = (event) => {
    event.preventDefault();
    const parsed = parseDateQuery(text, { min: rangeMin, max: rangeMax });
    if (parsed.error) {
      setStatus({
        kind: "error",
        message: `${parsed.error} ${parsed.hint ?? ""}`.trim(),
      });
      return;
    }
    if (!dailyReady) {
      // No daily files: land on the year, say why, never invent a value.
      actions.setYear(parsed.y);
      setStatus({
        kind: "ok",
        message: `${DAILY_MISSING_REASON} — showing ${parsed.y} as a year only.`,
      });
      return;
    }
    const resolved = resolveQuery(parsed);
    actions.setDate(resolved.iso);
    setStatus({ kind: "ok", message: resolved.notice });
  };

  return (
    <form role="search" onSubmit={submit} className="flex flex-col gap-1.5">
      <label htmlFor="bih-date-search" className="sr-only">
        Search a date, month or year
      </label>
      <div className="flex items-center gap-1.5">
        <IconSearch className="pointer-events-none h-3.5 w-3.5 shrink-0 text-slate-500" />
        <input
          id="bih-date-search"
          type="search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setText("");
              setStatus(null);
            }
          }}
          placeholder={SEARCH_PLACEHOLDER}
          autoComplete="off"
          className={SEARCH_INPUT}
        />
        <button type="submit" className={`${SMALL_BTN} shrink-0`}>
          Go
        </button>
      </div>
      <div
        role="status"
        aria-live="polite"
        className="min-h-4 text-[10px] leading-4"
      >
        {status ? (
          <span
            className={
              status.kind === "error" ? "text-heat-hot" : "text-slate-400"
            }
          >
            {status.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}

function DayPanel({
  store,
  reducedMotion,
  dailyReady,
  dailyReason,
  onHeightChange,
}) {
  const date = useTimelineState(selectDate, store);
  const dayStep = useTimelineState(selectDayStep, store);
  const playing = useTimelineState(selectPlaying, store);
  const rangeMin = useTimelineState(selectRangeMin, store);
  const rangeMax = useTimelineState(selectRangeMax, store);
  const index = useTimelineState(selectIndex, store);
  const timestamps = useTimelineState(selectTimestamps, store);
  const actions = useTimelineActions(store);
  const rootRef = useRef(null);

  // Measure this panel so the info card can clear it without a hard-coded offset.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const publish = () => onHeightChange?.(el.offsetHeight);
    publish();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => ro.disconnect();
  }, [onHeightChange]);

  const disabled = !dailyReady;
  const year = date ? Number(date.slice(0, 4)) : null;
  const doy = date ? dayOfYear(date) : 1;
  const maxDoy = year ? daysInYear(year) : 366;
  const safeIndex = clampIndex(index, timestamps.length);
  const currentYear = timestamps.length
    ? Number(formatTimestamp(timestamps[safeIndex]).slice(0, 4))
    : null;
  const valueText = date ? spelledDate(date) : "No date selected";

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label="Day view controls"
      className={`${GLASS} flex w-full flex-col gap-2 px-3 py-2.5 sm:px-4`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className={SMALL_BTN}
          disabled={disabled}
          onClick={() => actions.stepDay(-1)}
          aria-label="Previous day"
        >
          −1 day
        </button>
        <button
          type="button"
          className={SMALL_BTN}
          disabled={disabled}
          onClick={() => actions.stepDay(1)}
          aria-label="Next day"
        >
          +1 day
        </button>
        <span className="mx-0.5 h-5 w-px bg-white/10" aria-hidden="true" />
        <button
          type="button"
          className={SMALL_BTN}
          disabled={year === null}
          onClick={() => actions.setYear(year - 1)}
          aria-label="Previous year"
        >
          −1 year
        </button>
        <button
          type="button"
          className={SMALL_BTN}
          disabled={year === null}
          onClick={() => actions.setYear(year + 1)}
          aria-label="Next year"
        >
          +1 year
        </button>
        <label htmlFor="bih-date-picker" className="sr-only">
          Selected date
        </label>
        <input
          id="bih-date-picker"
          type="date"
          value={date ?? ""}
          min={rangeMin ?? undefined}
          max={rangeMax ?? undefined}
          disabled={disabled}
          onChange={(event) => {
            const v = event.target.value;
            if (isValidISO(v)) actions.setDate(v);
          }}
          className={`${SEARCH_INPUT} w-auto flex-1 font-mono`}
        />
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="bih-day-slider" className="sr-only">
          Day of year
        </label>
        <input
          id="bih-day-slider"
          type="range"
          min={1}
          max={maxDoy}
          step={1}
          value={doy}
          disabled={disabled}
          aria-valuetext={valueText}
          onChange={(event) => {
            const iso = dateFromDayOfYear(year, Number(event.target.value));
            if (iso) actions.setDate(iso);
          }}
          className="bih-range w-full cursor-pointer disabled:cursor-not-allowed"
        />
        <button
          type="button"
          aria-label={playing ? "Pause day playback" : "Play day playback"}
          aria-pressed={playing}
          disabled={disabled || reducedMotion}
          title={
            reducedMotion
              ? "Autoplay is off because your system prefers reduced motion"
              : undefined
          }
          onClick={() => actions.toggle()}
          className={ICON_BTN}
        >
          {playing ? (
            <IconPause className="h-4 w-4" />
          ) : (
            <IconPlay className="h-4 w-4" />
          )}
        </button>
        <label htmlFor="bih-day-speed" className="sr-only">
          Playback speed in days per tick
        </label>
        <select
          id="bih-day-speed"
          value={dayStep}
          disabled={disabled}
          onChange={(event) => actions.setDayStep(Number(event.target.value))}
          className="h-9 shrink-0 cursor-pointer rounded-md border border-white/10 bg-black/25 px-1.5 text-[11px] text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-amber disabled:cursor-not-allowed disabled:opacity-40"
        >
          {DAY_STEP_CHOICES.map((n) => (
            <option key={n} value={n}>
              {n} day{DAY_STEP_CHOICES.length > 1 && n > 1 ? "s" : ""}/tick
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-between font-mono text-[10px] text-slate-500">
        <span>{year ? `${year}-01-01` : "—"}</span>
        <span aria-live="polite" className="text-slate-300">
          {valueText}
        </span>
        <span>{year ? `${year}-12-31` : "—"}</span>
      </div>

      {currentYear !== null && currentYear !== year ? (
        <div className="text-[10px] text-slate-500">
          Year slider is on {currentYear}; day controls show {year ?? "—"}.
        </div>
      ) : null}

      {disabled && dailyReason ? (
        <div className="rounded-md border border-white/10 bg-black/25 px-2 py-1.5 text-[11px] text-slate-400">
          {dailyReason}
        </div>
      ) : null}

      <DateSearch
        actions={actions}
        rangeMin={rangeMin}
        rangeMax={rangeMax}
        dailyReady={dailyReady}
      />
    </div>
  );
}

function TimeScrubber({
  store,
  reducedMotion,
  viewMode,
  onViewModeChange,
  renderMode,
  onRenderModeChange,
  onHeightChange,
  dailyReady,
  dailyReason,
}) {
  const timestamps = useTimelineState(selectTimestamps, store);
  const index = useTimelineState(selectIndex, store);
  const playing = useTimelineState(selectPlaying, store);
  const actions = useTimelineActions(store);
  const rootRef = useRef(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const publish = () => onHeightChange?.(el.offsetHeight);
    publish();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => ro.disconnect();
  }, [onHeightChange]);

  const count = timestamps.length;
  const canStep = count > 1;
  const safeIndex = clampIndex(index, count);
  const current = count ? formatTimestamp(timestamps[safeIndex]) : "";
  const first = count ? formatTimestamp(timestamps[0]) : "—";
  const last = count ? formatTimestamp(timestamps[count - 1]) : "—";
  const valueText = count
    ? `${current} (${safeIndex + 1} of ${count})`
    : "No timestamps available";

  if (viewMode === "day") {
    return (
      <div ref={rootRef} className="w-full">
        <DayPanel
          store={store}
          reducedMotion={reducedMotion}
          dailyReady={dailyReady}
          dailyReason={dailyReason}
          onHeightChange={onHeightChange}
        />
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label="Historical time controls"
      className={`${GLASS} flex w-full flex-col gap-2 px-3 py-2.5 sm:px-4`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Historical time
          </span>
          <span
            className="font-mono text-sm font-semibold text-slate-100"
            aria-live="polite"
          >
            {current || "No data"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="Map data mode"
            className="flex items-center rounded-lg border border-white/10 bg-black/25 p-0.5"
          >
            <ModeButton
              active={viewMode === "trend"}
              onClick={() => onViewModeChange?.("trend")}
            >
              <IconTrend className="h-3.5 w-3.5" />
              Trend
            </ModeButton>
            <ModeButton
              active={viewMode === "year"}
              onClick={() => onViewModeChange?.("year")}
            >
              <IconThermometer className="h-3.5 w-3.5" />
              Year
            </ModeButton>
          </div>
          <div
            role="group"
            aria-label="Map view"
            className="flex items-center rounded-lg border border-white/10 bg-black/25 p-0.5"
          >
            <ModeButton
              active={renderMode === "2d"}
              onClick={() => onRenderModeChange?.("2d")}
            >
              2D
            </ModeButton>
            <ModeButton
              active={renderMode === "3d"}
              onClick={() => onRenderModeChange?.("3d")}
            >
              3D
            </ModeButton>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous year"
          disabled={!canStep}
          onClick={() => {
            onViewModeChange?.("year");
            actions.prev();
          }}
          className={ICON_BTN}
        >
          <IconChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={playing ? "Pause playback" : "Play playback"}
          aria-pressed={playing}
          disabled={!canStep || reducedMotion}
          title={
            reducedMotion
              ? "Autoplay is off because your system prefers reduced motion"
              : undefined
          }
          onClick={() => {
            onViewModeChange?.("year");
            actions.toggle();
          }}
          className={ICON_BTN}
        >
          {playing ? (
            <IconPause className="h-4 w-4" />
          ) : (
            <IconPlay className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          aria-label="Next year"
          disabled={!canStep}
          onClick={() => {
            onViewModeChange?.("year");
            actions.next();
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
            onViewModeChange?.("year");
            actions.seek(Number(event.target.value));
          }}
          className="bih-range w-full cursor-pointer disabled:cursor-not-allowed"
        />
      </div>

      <div className="flex justify-between font-mono text-[10px] text-slate-500">
        <span>{first}</span>
        <span>{last}</span>
      </div>
    </div>
  );
}

// The mode switcher must also be reachable from Day view (it lives inside the
// trend/year panel otherwise), so Day renders a slim header with the same trio.
function DayModeHeader({
  viewMode,
  onViewModeChange,
  renderMode,
  onRenderModeChange,
}) {
  return (
    <div className="pointer-events-auto flex items-center gap-2">
      <div
        role="group"
        aria-label="Map data mode"
        className="inline-flex items-center rounded-lg border border-white/10 bg-heat-surface/90 p-0.5 shadow-hud backdrop-blur-md"
      >
        <ModeButton
          active={viewMode === "trend"}
          onClick={() => onViewModeChange?.("trend")}
        >
          <IconTrend className="h-3.5 w-3.5" />
          Trend
        </ModeButton>
        <ModeButton
          active={viewMode === "year"}
          onClick={() => onViewModeChange?.("year")}
        >
          <IconThermometer className="h-3.5 w-3.5" />
          Year
        </ModeButton>
        <ModeButton
          active={viewMode === "day"}
          onClick={() => onViewModeChange?.("day")}
        >
          Day
        </ModeButton>
      </div>
      <div
        role="group"
        aria-label="Map view"
        className="inline-flex items-center rounded-lg border border-white/10 bg-heat-surface/90 p-0.5 shadow-hud backdrop-blur-md"
      >
        <ModeButton
          active={renderMode === "2d"}
          onClick={() => onRenderModeChange?.("2d")}
        >
          2D
        </ModeButton>
        <ModeButton
          active={renderMode === "3d"}
          onClick={() => onRenderModeChange?.("3d")}
        >
          3D
        </ModeButton>
      </div>
    </div>
  );
}

function ZoomPanel({ map, limits, onReset }) {
  const min = limits?.min ?? 2;
  const max = limits?.max ?? 18;
  const [zoom, setZoom] = useState(() => map?.getZoom() ?? min);
  const targetRef = useRef(map?.getZoom() ?? min);

  useEffect(() => {
    if (!map) return;
    targetRef.current = map.getZoom();
    setZoom(map.getZoom());
    const onZoomEnd = () => {
      targetRef.current = map.getZoom();
      setZoom(map.getZoom());
    };
    map.on("zoomend", onZoomEnd);
    return () => {
      map.off("zoomend", onZoomEnd);
    };
  }, [map]);

  // Rapid clicks must stack from the pending target, not the mid-animation zoom,
  // otherwise a burst of clicks gets stuck below max.
  const step = (delta) => {
    if (!map) return;
    const next = clampZoom(
      (targetRef.current ?? map.getZoom()) + delta,
      min,
      max,
    );
    targetRef.current = next;
    map.setZoom(next);
  };

  return (
    <div
      role="group"
      aria-label="Map zoom"
      className={`${GLASS} flex flex-col gap-0.5 p-1`}
    >
      <button
        type="button"
        aria-label="Zoom in"
        disabled={zoom >= Math.max(min, max)}
        onClick={() => step(1)}
        className={ICON_BTN}
      >
        <IconPlus className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Zoom out"
        disabled={zoom <= Math.min(min, max)}
        onClick={() => step(-1)}
        className={ICON_BTN}
      >
        <IconMinus className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Reset view to Bicol"
        onClick={onReset}
        className={ICON_BTN}
      >
        <IconReset className="h-4 w-4" />
      </button>
      <span
        aria-live="polite"
        className="text-center font-mono text-[11px] leading-3 text-slate-400"
      >
        {Number(zoom).toFixed(1)}
      </span>
    </div>
  );
}

const FAB_BTN =
  `${BTN} pointer-events-auto h-11 w-11 shrink-0`; // 44 px touch target on coarse pointers

function FabButton({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={FAB_BTN}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

function FabColumn({ onToggleIndex, onOpenChatbot }) {
  return (
    <div className="flex flex-col gap-2">
      <FabButton
        icon={IconSearch}
        label="Find a municipality"
        onClick={onToggleIndex}
      />
      <FabButton
        icon={IconRobot}
        label="Open chatbot"
        onClick={onOpenChatbot}
      />
    </div>
  );
}

const KIND_LABELS = {
  "heat-index": "Heat index (felt)",
  lst: "Land surface temp (LST)",
  canopy: "Tree cover",
  "land-cover": "Land cover",
  terrain: "Terrain",
};

function LayerPanel({ registry, onLayerChange }) {
  const [local, setLocal] = useState({});
  // Only layers the host/registry actually supports — no invented overlays.
  const layers = Array.isArray(registry?.layers)
    ? registry.layers.filter((layer) => layer?.id)
    : [];
  if (layers.length === 0) return null;

  const isOn = (id) =>
    typeof registry?.isActive === "function"
      ? Boolean(registry.isActive(id))
      : Boolean(local[id]);

  const toggle = (id) => {
    if (!canToggleLayer(registry, id, onLayerChange)) return;
    const next = !isOn(id);
    if (typeof registry?.setActive === "function") registry.setActive(id, next);
    else onLayerChange(id, next);
    setLocal((current) => ({ ...current, [id]: next }));
  };

  return (
    <div
      role="group"
      aria-label="Map layers"
      className={`${GLASS} flex flex-col gap-1 p-1.5`}
    >
      {layers.map((layer) => {
        const on = isOn(layer.id);
        const kind = KIND_LABELS[layer.kind] ?? "";
        return (
          <button
            key={layer.id}
            type="button"
            aria-pressed={on}
            disabled={!canToggleLayer(registry, layer.id, onLayerChange)}
            onClick={() => toggle(layer.id)}
            className={`${BTN} justify-start gap-2 px-2 py-1.5 text-left text-xs ${on ? "bg-white/10" : ""}`}
          >
            <IconLayers className="h-3.5 w-3.5 text-slate-400" />
            <span>{layer.label ?? layer.id}</span>
            {kind ? (
              <span className="ml-1 text-[10px] text-slate-500">{kind}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export default function MapControlsOverlay({
  map = null,
  timestamps = [],
  store = timelineStore,
  layerRegistry = null,
  onLayerChange,
  onTimeChange,
  onReset,
  viewMode = "trend",
  onViewModeChange,
  renderMode = "2d",
  onRenderModeChange,
  zoomLimits = { min: 7, max: 18 },
  dailyReady = false,
  dailyReason = null,
  onHeightChange,
  onToggleIndex = null,
  onOpenChatbot = null,
}) {
  const actions = useTimelineActions(store);
  const selected = useTimelineState(selectTimestamps, store);
  const index = useTimelineState(selectIndex, store);
  const playing = useTimelineState(selectPlaying, store);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const previousCount = store.getState().timestamps.length;
    actions.setTimestamps(timestamps);
    // Open on the latest year, not 1981, when the data first arrives.
    if (previousCount === 0 && timestamps.length > 0)
      actions.seek(timestamps.length - 1);
  }, [actions, store, timestamps]);

  // Existing feature contract: publish selected time/index to the host/layers.
  useEffect(() => {
    if (typeof onTimeChange === "function")
      onTimeChange(selected[index] ?? null, index);
  }, [index, onTimeChange, selected]);

  // Playback timer: years wrap via store tick; days step at DAY_PLAY_MS and
  // stop at Dec 31 inside dayTick. Reduced motion disables both buttons and
  // this clock.
  useEffect(() => {
    if (!playing || reducedMotion) return undefined;
    if (viewMode === "day") {
      const timer = setInterval(() => actions.dayTick(), DAY_PLAY_MS);
      return () => clearInterval(timer);
    }
    if (selected.length < 2) return undefined;
    const timer = setInterval(() => actions.tick(), PLAYBACK_MS);
    return () => clearInterval(timer);
  }, [actions, playing, reducedMotion, selected.length, viewMode]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[700] flex flex-col p-3">
      {/* top-right: LGU/chatbot FAB column + layer panel + day-mode header,
          all stacked under the shell's fixed floating navbar. Mobile: the row
          padding clears the navbar (root's own p-3 already gives 12 px, so
          4 rem + 12 px = 76 px = navbar bottom + 12 px gap). lg+ the row
          padding is 0 so the FABs sit at the root's 12 px edge — the same top
          line as the search panel (MunicipalityIndex, top 0.75 rem) and the
          legend. */}
      <div className="flex items-start justify-end w-full pt-[calc(4rem+env(safe-area-inset-top))] lg:pt-0">
        <div className="flex flex-col items-end gap-2">
          <FabColumn onToggleIndex={onToggleIndex} onOpenChatbot={onOpenChatbot} />
          <LayerPanel registry={layerRegistry} onLayerChange={onLayerChange} />
          {viewMode === "day" ? (
            <DayModeHeader
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
              renderMode={renderMode}
              onRenderModeChange={onRenderModeChange}
            />
          ) : null}
        </div>
      </div>
      {/* middle band: vertical zoom stack (left), bottom-aligned just above
          the timeline panel */}
      <div className="flex-1 w-full flex items-end">
        <ZoomPanel map={map} limits={zoomLimits} onReset={onReset} />
      </div>
      {/* bottom center: timeline scrubber */}
      <div className="w-full max-w-2xl self-center">
        <TimeScrubber
          store={store}
          reducedMotion={reducedMotion}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          renderMode={renderMode}
          onRenderModeChange={onRenderModeChange}
          onHeightChange={onHeightChange}
          dailyReady={dailyReady}
          dailyReason={dailyReason}
        />
      </div>
    </div>
  );
}
