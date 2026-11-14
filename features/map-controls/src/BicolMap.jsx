import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import L from "leaflet";
import { MapContainer, GeoJSON, TileLayer, useMap } from "react-leaflet";
import raw from "./data/ph-regions.geojson?raw";
import {
  loadRegions,
  findBicol,
  getRegionStyle,
  getRegionOutlineStyle,
  getMunicipalityStyle,
  joinNarratives,
  featureKey,
} from "./gis/engine.js";
import { tooltipHtml } from "./components/municipalityTooltip.js";
import "./components/municipalityTooltip.css";
import "./components/satelliteTheme.css";
import MunicipalityLegend from "./components/MunicipalityLegend.jsx";
import MapControlsOverlay, {
  usePrefersReducedMotion,
} from "./components/MapControlsOverlay.jsx";
import MunicipalityInfoCard from "./components/MunicipalityInfoCard.jsx";
import MunicipalityIndex from "./components/MunicipalityIndex.jsx";
import { timelineStore } from "./state/timelineStore.js";
import {
  COUNTRY_BOUNDS,
  STUDY_REGION_BOUNDS,
  MIN_ZOOM,
  MAX_ZOOM,
  BOUNDS_VISCOSITY,
  START_ZOOM,
  FLIGHT_MS,
} from "./gis/countryFrame.js";
import { entryDelays, ENTRY_DURATION_MS } from "./gis/entry.js";

// 3D is a separate entity with its own renderer, so it is loaded on demand and
// never lands in the 2D bundle.
const Municipality3DLayer = lazy(() => import("./Municipality3DLayer.jsx"));
import { dayOfYear } from "./state/dateModel.js";
import {
  DAILY_MISSING_REASON,
  dailyStore,
  valuesForDay,
} from "./data/dailyStore.js";

const geojson = JSON.parse(raw);

// Clay world basemap: Esri Light Gray Canvas (keyless) + its label overlay, so
// the map reads as soft paper under the pastel surfaces instead of satellite.
const IMAGERY_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";
const LABELS_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}";

// Satellite basemap: Esri World Imagery + its place/boundary reference overlay.
// Same keyless provider family as the clay basemap, so the two modes swap
// without changing attribution rules. Satellite mode also flips the map chrome
// to dark glassmorphism (see satelliteTheme.css).
const SATELLITE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const SATELLITE_LABELS_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

// Country framing centre, derived from the single country-bounds source.
const COUNTRY_CENTER = [
  (COUNTRY_BOUNDS[0][0] + COUNTRY_BOUNDS[1][0]) / 2,
  (COUNTRY_BOUNDS[0][1] + COUNTRY_BOUNDS[1][1]) / 2,
];

function MapViewport({ bicolFeature, selectedFeature, resetToken }) {
  const map = useMap();
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (resetToken === 0 || !bicolFeature) return;
    const bounds = L.geoJSON(bicolFeature).getBounds();
    if (!bounds.isValid()) return;
    if (reducedMotion) map.fitBounds(bounds, { padding: [28, 28] });
    else map.flyToBounds(bounds, { padding: [28, 28], duration: 0.55 });
  }, [bicolFeature, map, reducedMotion, resetToken]);

  useEffect(() => {
    if (!selectedFeature) return;
    const bounds = L.geoJSON(selectedFeature).getBounds();
    if (!bounds.isValid()) return;
    if (reducedMotion)
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13.5 });
    else
      map.flyToBounds(bounds, {
        padding: [48, 48],
        maxZoom: 13.5,
        duration: 0.55,
      });
  }, [map, reducedMotion, selectedFeature]);

  return null;
}

function ariaLabelFor(feature) {
  const p = feature?.properties ?? {};
  const name = p.adm3_en ?? "Municipality";
  const province = p.province ? `, ${p.province}` : "";
  const t = p.narrative?.trend;
  if (!t) return `${name}${province}. Trend data pending.`;
  const slope =
    typeof t.slope_c_per_year === "number"
      ? `${t.slope_c_per_year >= 0 ? "+" : ""}${t.slope_c_per_year.toFixed(3)} degrees Celsius per year`
      : "unknown warming rate";
  return `${name}${province}. ${t.direction ?? "flat"}, ${slope}, ${t.is_significant ? "significant" : "not significant"}.`;
}

// react-leaflet does not re-run style() on state change. Keep one persistent
// GeoJSON layer and update styles in place; remounting 114 features on every
// selection made zoom feel janky.
function MunicipalityLayer({
  joined,
  selectedKey,
  viewMode,
  year,
  date,
  dayValues,
  onSelect,
  triggerStagger,
  hoveredProvince,
  selectedProvince,
  provinceCounts,
  onProvinceHover,
}) {
  const map = useMap();
  const layerRef = useRef(null);
  const stateRef = useRef({
    selectedKey,
    viewMode,
    year,
    date,
    dayValues,
    hoveredProvince,
    selectedProvince,
  });
  const selectRef = useRef(onSelect);
  const prevHoveredRef = useRef(null);
  const prevSelectedRef = useRef(null);
  const entryKey = joined?.features?.[0]
    ? featureKey(joined.features[0])
    : null;
  const reducedMotion = usePrefersReducedMotion();
  stateRef.current = {
    selectedKey,
    viewMode,
    year,
    date,
    dayValues,
    hoveredProvince,
    selectedProvince,
  };
  selectRef.current = onSelect;

  const styleFor = useCallback(
    (feature) =>
      getMunicipalityStyle(feature, {
        selected: featureKey(feature) === stateRef.current.selectedKey,
        viewMode: stateRef.current.viewMode,
        year: stateRef.current.year,
        dayValues: stateRef.current.dayValues,
        hoveredProvince: stateRef.current.hoveredProvince,
        selectedProvince: stateRef.current.selectedProvince,
      }),
    [],
  );

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    // Roving tabindex: one municipality is reachable with Tab, then arrow keys
    // move through the map without adding 114 stops to the page.
    const tabbable = selectedKey ?? entryKey;
    // Only re-style features whose province entered or exited hover/selection.
    const changedProvinces = new Set();
    const prevHovered = prevHoveredRef.current;
    const prevSelected = prevSelectedRef.current;
    if (prevHovered !== hoveredProvince) {
      if (prevHovered) changedProvinces.add(prevHovered);
      if (hoveredProvince) changedProvinces.add(hoveredProvince);
    }
    if (prevSelected !== selectedProvince) {
      if (prevSelected) changedProvinces.add(prevSelected);
      if (selectedProvince) changedProvinces.add(selectedProvince);
    }
    prevHoveredRef.current = hoveredProvince;
    prevSelectedRef.current = selectedProvince;
    layer.eachLayer((child) => {
      const prov = child.feature?.properties?.province;
      if (!changedProvinces.size || changedProvinces.has(prov)) {
        child.setStyle(styleFor(child.feature));
      }
      const el = child.getElement?.();
      if (el)
        el.setAttribute(
          "tabindex",
          featureKey(child.feature) === tabbable ? "0" : "-1",
        );
      if (featureKey(child.feature) === selectedKey) child.bringToFront();
    });
  }, [
    entryKey,
    joined,
    selectedKey,
    styleFor,
    hoveredProvince,
    selectedProvince,
    viewMode,
    year,
    dayValues,
  ]);

  // Staggered opacity reveal strictly on 3D→2D switch: areas fade in top-down
  // in one capped wave, then hold at full opacity. Never on initial mount,
  // never on a year/scrub change. Reduced motion skips it entirely.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || reducedMotion || !triggerStagger) return;
    const items = [];
    layer.eachLayer((child) => {
      const el = child.getElement?.();
      if (el) items.push(child);
    });
    // Centroid north-to-south (top-down), same order as the 3D wave.
    items.sort(
      (a, b) => b.getBounds().getCenter().lat - a.getBounds().getCenter().lat,
    );
    const delays = entryDelays(items.length);
    items.forEach((child, i) => {
      const el = child.getElement();
      el.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        {
          duration: ENTRY_DURATION_MS,
          delay: delays[i],
          easing: "cubic-bezier(0.215, 0.61, 0.355, 1)", // easeOutCubic
          fill: "backwards",
        },
      );
    });
  }, [triggerStagger, reducedMotion]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.eachLayer((child) => {
      child.setTooltipContent(
        tooltipHtml(child.feature, {
          year,
          viewMode,
          date,
          dayValues,
          provinceCount: provinceCounts.get(child.feature?.properties?.province),
        }),
      );
    });
  }, [joined, year, viewMode, date, dayValues, provinceCounts]);

  // Tooltips were only closed by the pointer leaving a path, which never fires
  // when the camera moves under a stationary pointer — so a wheel-zoom left one
  // card per hover stacked on screen. A camera move invalidates whatever is
  // under the cursor, so clear the tooltips there.
  useEffect(() => {
    const closeAll = () => {
      layerRef.current?.eachLayer((child) => child.closeTooltip());
      // Reclaim tooltips orphaned when the layer group was rebuilt.
      map
        .getPane("tooltipPane")
        ?.querySelectorAll(".leaflet-tooltip")
        .forEach((el) => el.remove());
    };
    map.on("zoomstart", closeAll);
    map.on("movestart", closeAll);
    return () => {
      map.off("zoomstart", closeAll);
      map.off("movestart", closeAll);
    };
  }, [map]);

  return (
    <GeoJSON
      key="bicol-municipalities"
      ref={layerRef}
      data={joined}
      style={styleFor}
      onEachFeature={(feature, layer) => {
        layer.bindTooltip(
          tooltipHtml(feature, {
            ...stateRef.current,
            year: stateRef.current.year,
            provinceCount: provinceCounts.get(feature?.properties?.province),
          }),
          {
            sticky: true,
            className: "bih-tip",
            direction: "top",
            opacity: 1,
          },
        );

        const select = () => {
          const key = featureKey(feature);
          const next = stateRef.current.selectedKey === key ? null : key;
          selectRef.current?.(next);
        };

        layer.on("add", () => {
          const el = layer.getElement?.();
          if (!el) return;
          const tabbableKey = stateRef.current.selectedKey ?? entryKey;
          el.setAttribute("role", "button");
          el.setAttribute("aria-label", ariaLabelFor(feature));
          el.setAttribute(
            "tabindex",
            featureKey(feature) === tabbableKey ? "0" : "-1",
          );

          const moveFocus = (delta) => {
            const svg = el.ownerSVGElement;
            if (!svg) return;
            const paths = Array.from(
              svg.querySelectorAll('path[role="button"]'),
            );
            const at = paths.indexOf(el);
            if (at < 0) return;
            paths[(at + delta + paths.length) % paths.length]?.focus();
          };

          el.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              select();
              return;
            }
            if (event.key === "ArrowRight" || event.key === "ArrowDown") {
              event.preventDefault();
              moveFocus(1);
              return;
            }
            if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
              event.preventDefault();
              moveFocus(-1);
              return;
            }
            if (event.key === "Home") {
              event.preventDefault();
              const svg = el.ownerSVGElement;
              svg?.querySelector('path[role="button"]')?.focus();
              return;
            }
            if (event.key === "End") {
              event.preventDefault();
              const paths = el.ownerSVGElement?.querySelectorAll(
                'path[role="button"]',
              );
              paths?.[paths.length - 1]?.focus();
            }
          });
          el.addEventListener("focus", () => {
            const style = styleFor(feature);
            layer.setStyle({
              ...style,
              weight: style.weight + 1.5,
              color: "#1E1B4B",
              opacity: 1,
            });
            layer.openTooltip();
          });
          el.addEventListener("blur", () => {
            layer.setStyle(styleFor(feature));
            layer.closeTooltip();
          });
        });

        layer.on("mouseover", () => {
          onProvinceHover(feature?.properties?.province ?? null);
          const style = styleFor(feature);
          layer.setStyle({
            ...style,
            weight: style.weight + 1,
            color: "#1E1B4B",
          });
        });
        // Don't clear hoveredProvince on feature mouseout: moving between
        // municipalities in the same province would otherwise flash the map
        // blank (mouseout → null → mouseover → province). Cleared on map
        // mouseleave instead, so the province stays revealed while sweeping.
        layer.on("mouseout", () => layer.setStyle(styleFor(feature)));
        layer.on("click", select);
      }}
    />
  );
}

export default function BicolMap({
  timestamps = [],
  timelineStore: store,
  layerRegistry = null,
  onLayerChange,
  onTimeChange,
  zoomLimits = { min: MIN_ZOOM, max: MAX_ZOOM },
  status = "idle",
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
  // Optional cross-boundary hooks supplied by the shell. All optional —
  // BicolMap renders identically without them.
  onOpenChatbot = null,
  onToggleIndex = null,
}) {
  const handleToggleIndex = onToggleIndex ?? (() => setIndexOpen((open) => !open))
  const regions = useMemo(() => loadRegions(geojson), []);
  const bicolFeature = useMemo(() => findBicol(geojson), []);
  const ready = status === "ready" && munGeojson?.features?.length > 0;
  const joined = useMemo(
    () => (ready ? joinNarratives(munGeojson, narratives) : null),
    [ready, munGeojson, narratives],
  );
  // Province -> LGU count, for the hover tooltip badge.
  const provinceCounts = useMemo(() => {
    const counts = new Map();
    for (const f of joined?.features ?? []) {
      const p = f.properties?.province;
      if (p) counts.set(p, (counts.get(p) ?? 0) + 1);
    }
    return counts;
  }, [joined]);
  const activeStore = store ?? timelineStore;
  const selectedIndex = useSyncExternalStore(
    activeStore.subscribe,
    () => activeStore.getState().index,
    () => activeStore.getState().index,
  );
  const viewMode = useSyncExternalStore(
    activeStore.subscribe,
    () => activeStore.getState().viewMode,
    () => activeStore.getState().viewMode,
  );
  const date = useSyncExternalStore(
    activeStore.subscribe,
    () => activeStore.getState().date,
    () => activeStore.getState().date,
  );
  const derivedTimestamps = useMemo(() => {
    if (timestamps.length > 0) return timestamps;
    const series = narratives?.municipalities?.[0]?.series;
    return Array.isArray(series) ? series.map((row) => row.year) : [];
  }, [narratives, timestamps]);
  const latestYear = derivedTimestamps.length
    ? Number(derivedTimestamps[derivedTimestamps.length - 1])
    : (narratives?.municipalities?.[0]?.latest?.year ?? null);
  const selectedYear = derivedTimestamps.length
    ? Number(
        derivedTimestamps[
          Math.min(selectedIndex, derivedTimestamps.length - 1)
        ],
      )
    : latestYear;
  const [selectedKey, setSelectedKey] = useState(null);
  // A selection restored from a URL/history on first load is not a user action,
  // so the pulse stays silent for it. Subsequent user selections pulse normally.
  const initialFocusKey =
    focusToken && initialSelectedKey ? initialSelectedKey : null;
  const [hoveredProvince, setHoveredProvince] = useState(null);
  const [indexOpen, setIndexOpen] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [map, setMap] = useState(null);
  const [renderMode, setRenderMode] = useState("2d");
  const [map3d, setMap3d] = useState(null);
  const [view3d, setView3d] = useState(null);
  // Basemap is a display choice, independent of the 2D/3D renderer: satellite is
  // the default on open (dark imagery + dark glass chrome), vector is the light
  // clay world. The UI theme (light/dark) is separate and owned by the shell.
  const [basemap, setBasemap] = useState("satellite");

  // Remembers the opening flight happened so it never replays this session.
  const opened = useRef(false);
  // True only on the render right after a 3D→2D switch: the 2D stagger plays
  // strictly on mode switch, never on initial mount or on a scrub.
  const switchTo2dFrom3d = useRef(false);
  const reducedMotion = usePrefersReducedMotion();

  // Hand the current 2D camera to the 3D entity so toggling does not jump.
  const changeRenderMode = (mode) => {
    if (mode === renderMode) return;
    if (mode === "3d") {
      const center = map?.getCenter();
      setView3d({
        center: center ? [center.lng, center.lat] : [123.5, 13.3],
        zoom: map?.getZoom() ?? 8,
      });
    } else {
      setMap3d(null);
    }
    // The 2D stagger plays strictly when entering 2D from 3D.
    switchTo2dFrom3d.current = renderMode === "3d" && mode === "2d";
    setRenderMode(mode);
  };
  // Measured height of the timeline panel (px) — the info card clears it.
  const [overlayHeight, setOverlayHeight] = useState(0);
  const onOverlayHeightChange = useCallback((h) => setOverlayHeight(h), []);
  const changeViewMode = useCallback(
    (mode) => activeStore.actions.setViewMode(mode),
    [activeStore],
  );

  // Range comes from the data period — every day clamp/search bound derives from it.
  useEffect(() => {
    const period = narratives?.meta?.period;
    if (period?.start && period?.end)
      activeStore.actions.setRange(period.start, period.end);
  }, [activeStore, narratives]);

  // Daily data: index once, then only the selected year's file (LRU keeps 3).
  const [dailyIndex, setDailyIndex] = useState(null);
  useEffect(() => {
    let alive = true;
    dailyStore.loadIndex().then((s) => {
      if (alive) setDailyIndex(s);
    });
    return () => {
      alive = false;
    };
  }, []);
  const [dailyYear, setDailyYear] = useState(null); // {year, ...yearState}
  const dailyReady = dailyIndex?.status === "ready";
  const dailyReason =
    dailyIndex?.status === "ready"
      ? null
      : dailyIndex?.status === "missing"
        ? DAILY_MISSING_REASON
        : dailyIndex?.status === "error"
          ? "Daily data couldn't be loaded"
          : "Loading daily data…";
  useEffect(() => {
    if (!dailyReady || viewMode !== "day" || !date) return undefined;
    let alive = true;
    const y = Number(date.slice(0, 4));
    dailyStore.loadYear(y).then((s) => {
      if (alive) setDailyYear({ year: y, ...s });
    });
    return () => {
      alive = false;
    };
  }, [dailyReady, date, viewMode]);
  const dayValues = useMemo(() => {
    if (
      !dailyReady ||
      viewMode !== "day" ||
      !date ||
      dailyYear?.status !== "ready"
    )
      return null;
    if (dailyYear.year !== Number(date.slice(0, 4))) return null;
    const doy = dayOfYear(date);
    if (doy == null) return null;
    const meta = dailyIndex.meta;
    return valuesForDay(dailyYear.file, doy - 1, meta.ids, meta.scale ?? 0.1);
  }, [dailyIndex, dailyYear, date, viewMode, dailyReady]);

  // Applies the cross-screen focus once per token, never fighting internal
  // selection afterwards.
  useEffect(() => {
    if (focusToken && initialSelectedKey) setSelectedKey(initialSelectedKey);
  }, [focusToken, initialSelectedKey]);

  // One-time opening flight: country (the initial frame) → study region.
  // Runs once per session, only when the map is sized and data is ready.
  // A deep link / preselection skips it and lands on its target instead.
  useEffect(() => {
    if (!ready || !map || opened.current) return;
    if (initialSelectedKey) return;
    opened.current = true;

    const go = () => {
      if (reducedMotion) {
        map.fitBounds(STUDY_REGION_BOUNDS, { padding: [28, 28], animate: false });
      } else {
        map.flyToBounds(STUDY_REGION_BOUNDS, {
          padding: [28, 28],
          duration: FLIGHT_MS / 1000,
        });
      }
    };

    // Never start before the container has a size; a zero-height container
    // produces a wrong fit that looks like a bug.
    if (map.getSize().x > 0 && map.getSize().y > 0) {
      go();
    } else {
      const frame = requestAnimationFrame(() => {
        if (map.getSize().x > 0 && map.getSize().y > 0) go();
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [ready, map, reducedMotion, initialSelectedKey]);

  const displayYear = viewMode === "year" ? selectedYear : null;
  const selectedFeature = useMemo(
    () =>
      selectedKey
        ? (joined?.features?.find((f) => featureKey(f) === selectedKey) ?? null)
        : null,
    [joined, selectedKey],
  );

  // Province of the currently selected municipality, kept visible after hover.
  const selectedProvince = useMemo(() => {
    if (!selectedKey || !joined) return null;
    const f = joined.features.find((f) => featureKey(f) === selectedKey);
    return f ? (f.properties?.province ?? null) : null;
  }, [joined, selectedKey]);

  // Reports the province under the pointer from either renderer (2D feature
  // mouseover or 3D MapLibre mousemove) so hoveredProvince stays in sync.
  const onProvinceHover = useCallback(
    (province) => setHoveredProvince(province),
    [],
  );

  // Clear hoveredProvince when the pointer leaves the map container entirely,
  // not merely when stepping between municipalities. This keeps the province
  // revealed while sweeping across its municipalities and avoids the blank
  // flash caused by feature mouseout → null → feature mouseover → province.
  useEffect(() => {
    if (!map) return;
    const onMapMouseOut = (event) => {
      const relatedTarget = event.relatedTarget;
      const container = map.getContainer();
      if (relatedTarget && container?.contains(relatedTarget)) return;
      setHoveredProvince(null);
    };
    map.on("mouseout", onMapMouseOut);
    return () => map.off("mouseout", onMapMouseOut);
  }, [map]);

  useEffect(() => {
    const onEscape = (event) => {
      if (event.key !== "Escape") return;
      setSelectedKey(null);
      setIndexOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, []);

  const resetView = () => {
    setSelectedKey(null);
    setResetToken((token) => token + 1);
  };

  return (
    <div className="relative h-full w-full" data-basemap={basemap}>
      <MapContainer
        ref={setMap}
        center={COUNTRY_CENTER}
        zoom={START_ZOOM}
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
        {basemap === "satellite" ? (
          <>
            <TileLayer
              url={SATELLITE_URL}
              attribution="Tiles © Esri — Esri, Maxar, Earthstar Geographics"
              maxZoom={18}
              maxNativeZoom={18}
              noWrap={true}
            />
            <TileLayer
              url={SATELLITE_LABELS_URL}
              maxZoom={18}
              opacity={0.9}
              noWrap={true}
            />
          </>
        ) : (
          <>
            <TileLayer
              url={IMAGERY_URL}
              attribution="Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap contributors"
              maxZoom={18}
              maxNativeZoom={18}
              noWrap={true}
            />
            <TileLayer url={LABELS_URL} maxZoom={18} opacity={0.92} noWrap={true} />
          </>
        )}

        {renderMode === "2d" && (
          <MapViewport
            bicolFeature={bicolFeature}
            selectedFeature={selectedFeature}
            resetToken={resetToken}
          />
        )}

        {/* loading: solid region fills; ready: outline only so satellite and municipality fills show */}
        <GeoJSON
          data={geojson}
          style={ready ? getRegionOutlineStyle : getRegionStyle}
        />

        {renderMode === "2d" && ready && joined && (
          <MunicipalityLayer
            joined={joined}
            selectedKey={selectedKey}
            viewMode={viewMode}
            year={displayYear}
            date={date}
            dayValues={dayValues}
            onSelect={setSelectedKey}
            triggerStagger={switchTo2dFrom3d.current}
            hoveredProvince={hoveredProvince}
            selectedProvince={selectedProvince}
            provinceCounts={provinceCounts}
            onProvinceHover={onProvinceHover}
          />
        )}
      </MapContainer>

      {renderMode === "3d" && ready && joined && (
        <Suspense fallback={null}>
          <Municipality3DLayer
            joined={joined}
            selectedKey={selectedKey}
            selectedFeature={selectedFeature}
            viewMode={viewMode}
            year={displayYear}
            initialView={view3d}
            resetToken={resetToken}
            initialFocusKey={initialFocusKey}
            onSelect={setSelectedKey}
            onReady={setMap3d}
            onUnavailable={() => setRenderMode("2d")}
          />
        </Suspense>
      )}

      <MunicipalityLegend
        coverage={coverage}
        viewMode={viewMode}
        year={viewMode === "year" ? selectedYear : latestYear}
        date={date}
        basemap={basemap}
      />

      {ready && (
        <MunicipalityInfoCard
          feature={selectedFeature}
          year={displayYear}
          viewMode={viewMode}
          date={date}
          dayValues={dayValues}
          bottomOffset={overlayHeight > 0 ? overlayHeight + 24 : 172}
          onClose={() => setSelectedKey(null)}
        />
      )}

      {indexOpen && (
        <MunicipalityIndex
          features={joined?.features ?? []}
          selectedKey={selectedKey}
          viewMode={viewMode}
          date={date}
          dayValues={dayValues}
          onSelect={setSelectedKey}
          onClose={() => setIndexOpen(false)}
        />
      )}

      {status === "loading" && (
        <div
          role="status"
          aria-busy="true"
          className="pointer-events-none absolute left-1/2 top-[var(--bih-nav-clear,calc(5.25rem+env(safe-area-inset-top)))] z-[600] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-white/10 bg-heat-surface/90 px-3 py-2 text-xs text-slate-300 shadow-hud backdrop-blur"
        >
          <span className="bih-spinner" aria-hidden="true" />
          Loading satellite view and municipality data…
        </div>
      )}

      {status === "error" && (
        <div
          role="alert"
          className="absolute left-1/2 top-[calc(5.5rem+env(safe-area-inset-top))] z-[620] w-[min(22rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-xl border border-heat-hot/60 bg-heat-surface/95 px-3 py-2.5 text-sm text-slate-200 shadow-hud backdrop-blur"
        >
          <div className="font-semibold">Could not load municipality data</div>
          <div className="mb-2 text-xs text-slate-400">{error}</div>
          <button
            type="button"
            onClick={() => reload?.()}
            className="cursor-pointer rounded-[12px] bg-clay-blue px-2.5 py-1 text-xs font-semibold text-white hover:bg-clay-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-shadow"
          >
            Try again
          </button>
        </div>
      )}

      {status === "ready" && !ready && (
        <div className="pointer-events-none absolute left-1/2 top-[calc(5.5rem+env(safe-area-inset-top))] z-[600] -translate-x-1/2 rounded-xl border border-white/10 bg-heat-surface/90 px-3 py-2 text-sm text-slate-300 shadow-hud backdrop-blur">
          No municipality boundaries found
        </div>
      )}

      <MapControlsOverlay
        map={renderMode === "3d" ? map3d : map}
        timestamps={derivedTimestamps}
        store={activeStore}
        layerRegistry={layerRegistry}
        onLayerChange={onLayerChange}
        onTimeChange={onTimeChange}
        onReset={resetView}
        viewMode={viewMode}
        onViewModeChange={changeViewMode}
        renderMode={renderMode}
        onRenderModeChange={changeRenderMode}
        basemap={basemap}
        onBasemapChange={setBasemap}
        zoomLimits={zoomLimits}
        dailyReady={dailyReady}
        dailyReason={dailyReason}
        onHeightChange={onOverlayHeightChange}
        onToggleIndex={handleToggleIndex}
        onOpenChatbot={onOpenChatbot}
      />
    </div>
  );
}
