// Bicol In-Heat — 3D map entity. Separate from the Leaflet 2D entity: own renderer,
// own camera, own picking. Mounted only while renderMode === '3d'.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  featureKey,
  getMunicipalityStyle,
  SELECT_COLOUR,
} from "./gis/engine.js";
import {
  DEPTH_BASE,
  LIFT_MS,
  LIFT_RATIO,
  clearFlatFactors,
  getFlatFactor,
  stepFlats,
  snapFlats,
  depthFor,
} from "./gis/lift.js";
import {
  TRACE_MS,
  easeOutCubic,
  measure,
  ribbon,
  ribbonWidthMetres,
  ringsOf,
  rotateToNearest,
  slicePrefix,
} from "./gis/trace.js";
import { tooltipHtml } from "./components/municipalityTooltip.js";
import { usePrefersReducedMotion } from "./components/MapControlsOverlay.jsx";
import {
  ENTRY_DURATION_MS,
  ENTRY_FROM,
  entryDelays,
} from "./gis/entry.js";
import {
  COUNTRY_BOUNDS,
  MIN_ZOOM,
  MAX_ZOOM,
  BOUNDS_VISCOSITY,
} from "./gis/countryFrame.js";

// Satellite basemap (Esri World Imagery) under the extruded municipalities.
// The old Canvas/World_Light_Gray_Base read as a flat white 2D sheet; imagery
// gives the 3D extrusions a real ground to stand on.
const IMAGERY_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
// White-halo place labels keyed for imagery (the light-gray reference labels are
// dark text and vanish on satellite).
const LABELS_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

const SRC = "bih-muni";
const FILL = "bih-muni-fill";
const LINE = "bih-muni-line";
const DASH = "bih-muni-line-dash";
const TRACE_SRC = "bih-muni-trace";
const TRACE = "bih-muni-trace-outline";
const PULSE_SRC = "bih-muni-pulse";
const PULSE = "bih-muni-pulse-ring";

// Single expanding ring at the selected area's centroid, on its top face.
// Colours come from the project's single accent token (SELECT_COLOUR).
const PULSE_MS = 1400
// Land the ring after the 550 ms fitBounds camera settle (GOAL: "after the camera
// settles"). Without this the pulse fires during the move and reads as noise.
const PULSE_DELAY = 550
const PULSE_START = 0.4
const PULSE_SCALE = 2.5
const PULSE_RING_INNER = 0.65
const PULSE_HEIGHT_M = 2
const PULSE_SEGMENTS = 64

const M_PER_DEG_LAT = 110540
const M_PER_DEG_LNG = 111320

const STYLE = {
  version: 8,
  sources: {
    imagery: {
      type: "raster",
      tiles: [IMAGERY_URL],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    },
    labels: { type: "raster", tiles: [LABELS_URL], tileSize: 256, maxzoom: 18 },
  },
  layers: [
    // Dark while imagery streams in, so there is no white flash under the data.
    { id: "bg", type: "background", paint: { "background-color": "#0b1220" } },
    { id: "imagery", type: "raster", source: "imagery" },
    {
      id: "labels",
      type: "raster",
      source: "labels",
      paint: { "raster-opacity": 0.9 },
    },
  ],
};

const EMPTY = { type: "FeatureCollection", features: [] };

function boundsOf(feature) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const walk = (c) => {
    if (typeof c?.[0] === "number") {
      if (c[0] < minX) minX = c[0];
      if (c[1] < minY) minY = c[1];
      if (c[0] > maxX) maxX = c[0];
      if (c[1] > maxY) maxY = c[1];
    } else if (Array.isArray(c)) {
      c.forEach(walk);
    }
  };
  walk(feature?.geometry?.coordinates);
  return Number.isFinite(minX)
    ? [
        [minX, minY],
        [maxX, maxY],
      ]
    : null;
}

function centroidOf(feature) {
  const bounds = boundsOf(feature);
  if (!bounds) return null;
  const [[minX, minY], [maxX, maxY]] = bounds;
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

// Diagonal of the area's bounds, in metres at its centroid latitude — the
// characteristic "size" the pulse scales from.
function sizeOf(rings) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const ring of rings) {
    for (const [x, y] of ring) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  const lat = (minY + maxY) / 2;
  const mLng = M_PER_DEG_LNG * Math.cos((lat * Math.PI) / 180);
  return Math.hypot((maxX - minX) * mLng, (maxY - minY) * M_PER_DEG_LAT) || 1;
}

// Annulus (outer ring + inner hole) centred on `centre` with the given outer
// radius in metres, expressed in degrees at the centre latitude.
function ringGeometry(centre, outerRadius) {
  const innerRadius = outerRadius * PULSE_RING_INNER
  const clng = centre[0]
  const clat = centre[1]
  const mLat = M_PER_DEG_LAT
  const mLng = M_PER_DEG_LNG * Math.cos((clat * Math.PI) / 180)
  const outer = []
  const inner = []
  for (let i = 0; i <= PULSE_SEGMENTS; i++) {
    const a = (i / PULSE_SEGMENTS) * Math.PI * 2
    outer.push([clng + (outerRadius * Math.cos(a)) / mLng, clat + (outerRadius * Math.sin(a)) / mLat])
    // Hole ring runs clockwise (reverse angle) so the polygon is a valid ring.
    inner.push([clng + (innerRadius * Math.cos(-a)) / mLng, clat + (innerRadius * Math.sin(-a)) / mLat])
  }
  return { type: "Polygon", coordinates: [outer, inner] }
}

export default function Municipality3DLayer({
  joined,
  selectedKey,
  selectedFeature,
  viewMode = "trend",
  year = null,
  initialView = null,
  resetToken = 0,
  initialFocusKey = null,
  onSelect,
  onReady,
  onUnavailable,
}) {
  const hostRef = useRef(null);
  const tipRef = useRef(null);
  // sheen: revert = delete this ref, the effect below, and the <div ref={sheenRef}>.
  const sheenRef = useRef(null);
  const mapRef = useRef(null);
  const hoverRef = useRef(null);
  const lastPointRef = useRef(null); // last cursor point, for re-picking after a move
  const selectedRef = useRef(selectedKey);
  const liftRef = useRef(new Map());
  const animRef = useRef(new Map());
  const rafRef = useRef(0);
  const traceRef = useRef(null);
  const pulseRef = useRef(null); // { key, start, centre, size, depth, gen, raf }
  const pulseGen = useRef(0);
  const initialPulseSuppressedRef = useRef(false);
  const entryRef = useRef(new Map()); // key -> { start, delay } for the entry wave
  const entryStartedRef = useRef(false); // true once a level's entry has been initialized
  const yearRef = useRef(year);
  const selectRef = useRef(onSelect);
  const readyCb = useRef(onReady);
  const unavailableCb = useRef(onUnavailable);
  const viewRef = useRef(initialView);
  const reducedMotion = usePrefersReducedMotion();
  const reducedRef = useRef(reducedMotion);
  const [ready, setReady] = useState(false);

  yearRef.current = year;
  selectRef.current = onSelect;
  readyCb.current = onReady;
  unavailableCb.current = onUnavailable;
  reducedRef.current = reducedMotion;

  // Colour and depth both come from the existing style + ramp; nothing is invented here.
  const data = useMemo(() => {
    const features = [];
    const depths = new Map();
    const byKey = new Map();
    const rings = new Map();
    const centroids = new Map();
    const records = new Map();
    for (const [i, f] of (joined?.features ?? []).entries()) {
      // promoteId needs a unique id; a nameless feature would otherwise collapse the source.
      const key = featureKey(f) || `unnamed-${i}`;
      const style = getMunicipalityStyle(f, {
        selected: false,
        viewMode,
        year,
      });
      const depth = depthFor(f, viewMode, year);
      const centroid = centroidOf(f);
      const name = f?.properties?.adm3_en ?? f?.properties?.shapeName ?? "";
      depths.set(key, depth);
      byKey.set(key, f);
      rings.set(key, ringsOf(f.geometry));
      if (centroid) centroids.set(key, centroid);
      records.set(key, {
        id: key,
        name,
        centroid,
        vertexRange: ringsOf(f.geometry),
      });
      features.push({
        type: "Feature",
        geometry: f.geometry,
        properties: {
          _key: key,
          _fill: style.fillColor ?? "#64748b",
          _line: style.color ?? "#fca5a5",
          _weight: style.weight ?? 1.5,
          _dash: style.dashArray ? 1 : 0,
          _depth: depth,
          _lift: 0,
          _flatFactor: 0,
        },
      });
    }
    return {
      collection: { type: "FeatureCollection", features },
      depths,
      byKey,
      rings,
      centroids,
      records,
    };
  }, [joined, viewMode, year]);

  const dataRef = useRef(data);
  dataRef.current = data;

  const setLifts = useCallback((values) => {
    const source = mapRef.current?.getSource(SRC);
    if (!source || values.size === 0) return;
    source.updateData({
      update: [...values].map(([id, value]) => ({
        id,
        addOrUpdateProperties: [{ key: "_lift", value }],
      })),
    });
  }, []);

  const setEntries = useCallback((values) => {
    const source = mapRef.current?.getSource(SRC);
    if (!source || values.size === 0) return;
    source.updateData({
      update: [...values].map(([id, value]) => ({
        id,
        addOrUpdateProperties: [{ key: "_entry", value }],
      })),
    });
  }, []);

  const setFlatFactors = useCallback((values) => {
    const source = mapRef.current?.getSource(SRC);
    if (!source || values.size === 0) return;
    source.updateData({
      update: [...values].map(([id, value]) => ({
        id,
        addOrUpdateProperties: [{ key: "_flatFactor", value }],
      })),
    });
  }, []);

  const targetFor = useCallback((key) => {
    if (key == null) return 0;
    const depth = dataRef.current.depths.get(key) ?? DEPTH_BASE;
    return key === hoverRef.current || key === selectedRef.current
      ? depth * LIFT_RATIO
      : 0;
  }, []);

  // The trace is a ribbon polygon sitting just above the area's top face: MapLibre has
  // no line elevation property and line layers depth-test against the extrusion.
  const paintTrace = useCallback((trace, progress) => {
    const map = mapRef.current;
    const source = map?.getSource(TRACE_SRC);
    if (!map || !source) return;
    const revealed = slicePrefix(
      trace.rings,
      trace.total * easeOutCubic(progress),
    );
    const polygons = ribbon(
      revealed,
      ribbonWidthMetres(trace.lat, map.getZoom()),
      trace.lat,
    );
    if (!polygons.length) {
      source.setData(EMPTY);
      return;
    }
    const lift = liftRef.current.get(trace.key) ?? 0;
    const z = (dataRef.current.depths.get(trace.key) ?? DEPTH_BASE) + lift + 2;
    source.setData({
      type: "Feature",
      properties: { _z: z },
      geometry: { type: "MultiPolygon", coordinates: polygons },
    });
  }, []);

  // Ease-out cubic, one rAF loop that stops as soon as nothing is animating.
  // Drives both hover/selection lift and the per-area entry wave.
  const step = useCallback(() => {
    const now = performance.now();
    const values = new Map();
    let active = false;
    for (const [key, anim] of animRef.current) {
      const p = Math.min(1, (now - anim.start) / LIFT_MS);
      const eased = 1 - (1 - p) ** 3;
      const value = anim.from + (anim.to - anim.from) * eased;
      liftRef.current.set(key, value);
      values.set(key, value);
      if (p >= 1) animRef.current.delete(key);
      else active = true;
    }
    if (values.size) setLifts(values);

    // Entry wave: advance each area's progress toward one after its own delay.
    const entryValues = new Map();
    let entryActive = false;
    for (const [key, ent] of entryRef.current) {
      // clamp t to [0,1]: before an area's delay it must not go negative
      // (which would drive the extrusion height below zero).
      const t = Math.min(1, Math.max(0, (now - ent.start - ent.delay) / ENTRY_DURATION_MS));
      const eased = easeOutCubic(t);
      if (t >= 1) {
        entryRef.current.delete(key);
        entryValues.set(key, 1);
      } else {
        entryValues.set(key, eased);
        entryActive = true;
      }
    }
    if (entryValues.size) setEntries(entryValues);
    active = active || entryActive;

    // Flatten spotlight: non-selected areas fall to 0 m while the selected area
    // stays elevated. Runs in this same rAF loop — no second loop.
    const flatKeys = data.collection.features.map((f) => f.properties?._key).filter(Boolean);
    let flatActive = false;
    if (reducedRef.current) {
      const snapped = snapFlats(flatKeys, selectedRef.current);
      if (snapped.size) setFlatFactors(snapped);
    } else {
      const { changed, active: flatMoving } = stepFlats(now, flatKeys, selectedRef.current);
      if (changed.size) setFlatFactors(changed);
      flatActive = flatMoving;
    }
    active = active || flatActive;

    const trace = traceRef.current;
    if (trace) {
      const p = Math.min(1, (now - trace.start) / TRACE_MS);
      trace.progress = p;
      paintTrace(trace, p);
      if (p < 1) active = true;
    }
    rafRef.current = active ? requestAnimationFrame(step) : 0;
  }, [paintTrace, setLifts, setEntries, setFlatFactors]);

  const moveTo = useCallback(
    (key, to, { finishFirst = false } = {}) => {
      if (key == null) return;
      const from = liftRef.current.get(key) ?? 0;
      if (from === to) {
        animRef.current.delete(key);
        return;
      }
      if (finishFirst || reducedRef.current) {
        animRef.current.delete(key);
        liftRef.current.set(key, to);
        setLifts(new Map([[key, to]]));
        return;
      }
      animRef.current.set(key, { from, to, start: performance.now() });
      if (!rafRef.current) rafRef.current = requestAnimationFrame(step);
    },
    [setLifts, step],
  );

  // A new selection restarts from zero; deselect clears without a reverse trace.
  const startTrace = useCallback(
    (key, centre, { instant = false } = {}) => {
      const rings = dataRef.current.rings.get(key);
      if (!mapRef.current || !rings?.length) return;
      const trace = {
        key,
        rings: rotateToNearest(rings, centre ? [centre.lng, centre.lat] : null),
        lat: rings[0][0][1],
        start: performance.now(),
        progress: 0,
      };
      trace.total = measure(trace.rings);
      if (instant || reducedRef.current) {
        // The camera jumps after this effect, so repaint one frame later at its final
        // zoom — otherwise the ribbon keeps the pre-move width in metres.
        trace.progress = 1;
        traceRef.current = trace;
        paintTrace(trace, 1);
        requestAnimationFrame(() => {
          if (traceRef.current === trace) paintTrace(trace, 1);
        });
        return;
      }
      traceRef.current = trace;
      paintTrace(trace, 0);
      if (!rafRef.current) rafRef.current = requestAnimationFrame(step);
    },
    [paintTrace, step],
  );

  const clearTrace = useCallback(() => {
    traceRef.current = null;
    mapRef.current?.getSource(TRACE_SRC)?.setData(EMPTY);
  }, []);

  const cancelPulse = useCallback(() => {
    const p = pulseRef.current;
    if (p) {
      if (p.timer) clearTimeout(p.timer);
      if (p.raf) cancelAnimationFrame(p.raf);
    }
    pulseRef.current = null;
    mapRef.current?.getSource(PULSE_SRC)?.setData(EMPTY);
  }, []);

  const finishPulse = useCallback(() => {
    const p = pulseRef.current;
    pulseRef.current = null;
    mapRef.current?.getSource(PULSE_SRC)?.setData(EMPTY);
  }, []);

  // One pulse per selection: after the camera settles, an expanding ring at the
  // centroid fades out and removes itself. Restarting cancels any pending or
  // in-flight pulse (never stacks).
  const startPulse = useCallback(
    (key) => {
      if (reducedRef.current) return;
      cancelPulse();
      const centre = dataRef.current.centroids.get(key);
      const rings = dataRef.current.rings.get(key);
      const depth = dataRef.current.depths.get(key) ?? DEPTH_BASE;
      if (!centre || !rings?.length) return;
      const size = sizeOf(rings);
      const gen = ++pulseGen.current;
      // Wait for the camera to settle before acknowledging the selection; the
      // clock starts when the ring actually begins, not at selection time.
      const timer = setTimeout(() => {
        const p = pulseRef.current;
        if (!p || p.gen !== gen) return;
        p.timer = 0;
        p.start = performance.now();
        p.raf = requestAnimationFrame(() => animatePulse(gen));
      }, PULSE_DELAY);
      pulseRef.current = { key, start: 0, centre, size, depth, gen, timer };
    },
    [cancelPulse]
  );

  const animatePulse = useCallback(
    (gen) => {
      const p = pulseRef.current;
      if (!p || p.gen !== gen) return;
      const t = Math.min(1, (performance.now() - p.start) / PULSE_MS);
      const eased = 1 - (1 - t) ** 3;
      const radius = (PULSE_START + (PULSE_SCALE - PULSE_START) * eased) * p.size;
      const source = mapRef.current?.getSource(PULSE_SRC);
      if (source) {
        const n = PULSE_SEGMENTS;
        const clng = p.centre[0];
        const clat = p.centre[1];
        const mLat = M_PER_DEG_LAT;
        const mLng = M_PER_DEG_LNG * Math.cos((clat * Math.PI) / 180);
        const outer = [];
        const inner = [];
        for (let i = 0; i <= n; i++) {
          const a = (i / n) * Math.PI * 2;
          outer.push([
            clng + (radius * Math.cos(a)) / mLng,
            clat + (radius * Math.sin(a)) / mLat,
          ]);
          inner.push([
            clng + (radius * PULSE_RING_INNER * Math.cos(-a)) / mLng,
            clat + (radius * PULSE_RING_INNER * Math.sin(-a)) / mLat,
          ]);
        }
        source.setData({
          type: "Feature",
          properties: { _opacity: 1 - eased, _base: p.depth, _height: PULSE_HEIGHT_M },
          geometry: { type: "Polygon", coordinates: [outer, inner] },
        });
      }
      if (t >= 1) finishPulse();
      else p.raf = requestAnimationFrame(() => animatePulse(gen));
    },
    [finishPulse]
  );

  const showTip = useCallback((event) => {
    const id = event.features?.[0]?.id;
    const feature = dataRef.current.byKey.get(id);
    const tip = tipRef.current;
    if (!feature || !tip) return;
    tip.innerHTML = tooltipHtml(feature, { year: yearRef.current });
    tip.style.transform = `translate(${event.point.x + 14}px, ${event.point.y + 14}px)`;
    tip.style.display = "block";
  }, []);

  const hideTip = useCallback(() => {
    if (tipRef.current) tipRef.current.style.display = "none";
  }, []);

  useEffect(() => {
    let map;
    try {
      const mlBounds = [
        [COUNTRY_BOUNDS[0][1], COUNTRY_BOUNDS[0][0]],
        [COUNTRY_BOUNDS[1][1], COUNTRY_BOUNDS[1][0]],
      ];
      map = new maplibregl.Map({
        container: hostRef.current,
        style: STYLE,
        center: viewRef.current?.center ?? [123.5, 13.3],
        zoom: Math.max(viewRef.current?.zoom ?? 8, MIN_ZOOM),
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        maxBounds: mlBounds,
        pitch: 45,
        maxPitch: 60,
        attributionControl: { compact: true },
      });
    } catch {
      unavailableCb.current?.();
      return undefined;
    }
    mapRef.current = map;

    map.on("load", () => {
      map.addSource(SRC, { type: "geojson", data: EMPTY, promoteId: "_key" });
      map.addLayer({
        id: FILL,
        type: "fill-extrusion",
        source: SRC,
        paint: {
          "fill-extrusion-color": ["get", "_fill"],
          // height = (depth × entry + hover/selection lift) × (1 - flatFactor).
          // When an area is selected, every other area flattens to 0 m; the selected
          // area stays at full depth + lift with its data ramp colour untouched.
          // _entry defaults to 1 (full); _flatFactor defaults to 0 (no flatten).
          "fill-extrusion-height": [
            "*",
            [
              "+",
              ["*", ["get", "_depth"], ["coalesce", ["get", "_entry"], 1]],
              ["get", "_lift"],
            ],
            ["-", 1, ["coalesce", ["get", "_flatFactor"], 0]],
          ],
        },
      });
      map.addLayer({
        id: LINE,
        type: "line",
        source: SRC,
        filter: ["==", ["get", "_dash"], 0],
        paint: {
          "line-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            SELECT_COLOUR,
            ["get", "_line"],
          ],
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            ["+", ["get", "_weight"], 1.5],
            ["get", "_weight"],
          ],
        },
      });
      map.addLayer({
        id: DASH,
        type: "line",
        source: SRC,
        filter: ["==", ["get", "_dash"], 1],
        paint: {
          "line-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            SELECT_COLOUR,
            ["get", "_line"],
          ],
          "line-width": ["get", "_weight"],
          "line-dasharray": [4, 3],
        },
      });
      map.addSource(TRACE_SRC, { type: "geojson", data: EMPTY });
      map.addLayer({
        id: TRACE,
        type: "fill-extrusion",
        source: TRACE_SRC,
        paint: {
          "fill-extrusion-color": SELECT_COLOUR,
          // base and height both ride `_z`: a flat ribbon 2 m above the top face, which
          // is above it at every zoom and pitch, and far enough to avoid z-fighting.
          "fill-extrusion-base": ["get", "_z"],
          "fill-extrusion-height": ["+", ["get", "_z"], 2],
        },
      });
      // Pulse ring: drawn once, repainted each frame while active, then cleared.
      // Not pickable — no click/mousemove listener is attached to this layer.
      map.addSource(PULSE_SRC, { type: "geojson", data: EMPTY });
      map.addLayer({
        id: PULSE,
        type: "fill-extrusion",
        source: PULSE_SRC,
        paint: {
          "fill-extrusion-color": SELECT_COLOUR,
          "fill-extrusion-opacity": ["get", "_opacity"],
          "fill-extrusion-base": ["get", "_base"],
          "fill-extrusion-height": ["get", "_height"],
        },
      });
      setReady(true);
      readyCb.current?.(map);
    });

    map.on("mousemove", FILL, (event) => {
      lastPointRef.current = event.point;
      const id = event.features?.[0]?.id ?? null;
      if (id === hoverRef.current) {
        showTip(event);
        return;
      }
      const previous = hoverRef.current;
      hoverRef.current = id;
      map.getCanvas().style.cursor = id == null ? "" : "pointer";
      if (previous != null) {
        map.setFeatureState({ source: SRC, id: previous }, { hover: false });
        // New hover wins outright: the old area snaps back instead of easing alongside.
        moveTo(previous, targetFor(previous), { finishFirst: true });
      }
      if (id != null) {
        map.setFeatureState({ source: SRC, id }, { hover: true });
        moveTo(id, targetFor(id));
      }
      showTip(event);
    });

    map.on("mouseleave", FILL, () => {
      const previous = hoverRef.current;
      hoverRef.current = null;
      map.getCanvas().style.cursor = "";
      hideTip();
      if (previous != null) {
        map.setFeatureState({ source: SRC, id: previous }, { hover: false });
        moveTo(previous, targetFor(previous));
      }
    });

    map.on("click", FILL, (event) => {
      const id = event.features?.[0]?.id;
      if (id == null) return;
      selectRef.current?.(id === selectedRef.current ? null : id);
    });

    // A finished trace is kept at its last length; repaint on camera moves so the
    // ribbon stays TRACE_PX wide at every zoom instead of drifting in metres.
    map.on("move", () => {
      // A camera move invalidates what is under the cursor and no mousemove
      // fires to close the tooltip, so clear it here.
      hideTip();
      const trace = traceRef.current;
      if (trace?.progress >= 1) paintTrace(trace, 1);
    });

    // Once the camera settles, re-pick at the last cursor point: the geometry
    // moved, so the card must follow what is actually under the pointer.
    map.on("moveend", () => {
      const point = lastPointRef.current;
      if (!point) return;
      const features = map.queryRenderedFeatures(point, { layers: [FILL] });
      if (features.length) showTip({ features, point });
      else hideTip();
    });

    // Cursor off the canvas: no point to re-pick from.
    map.on("mouseout", () => {
      lastPointRef.current = null;
    });

    return () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      cancelPulse();
      animRef.current.clear();
      clearFlatFactors();
      traceRef.current = null;
      liftRef.current = new Map();
      map.remove();
      mapRef.current = null;
    };
    // Mount-only: the entity is created when 3D is selected and destroyed when it is not.
  }, [hideTip, moveTo, paintTrace, showTip, targetFor]);

  // New level: every area starts at ENTRY_FROM height, then rises into place in
  // sequence ordered by centroid north-to-south (top-down). Delays are scaled so
  // the whole wave finishes within STAGGER_CAP regardless of area count.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource(SRC);
    if (!source) return;
    const cur = dataRef.current;
    const keys = cur.collection.features.map((f) => f.properties?._key);
    const centroids = cur.centroids;
    const ordered = [...keys].sort((a, b) => {
      const ca = centroids.get(a);
      const cb = centroids.get(b);
      return (cb?.[1] ?? 0) - (ca?.[1] ?? 0);
    });
    const n = ordered.length;
    entryRef.current = new Map();
    entryStartedRef.current = true;
    const now = performance.now();
    const delays = entryDelays(n, { reduced: reducedRef.current });
    const startValues = new Map();
    ordered.forEach((key, i) => {
      entryRef.current.set(key, { start: now, delay: delays[i] });
      startValues.set(key, ENTRY_FROM);
    });
    if (startValues.size) setEntries(startValues);
    if (reducedRef.current) {
      // prefers-reduced-motion: full height immediately, no entry animation.
      const full = new Map();
      for (const key of keys) full.set(key, 1);
      setEntries(full);
      entryRef.current = new Map();
    }
    if (!rafRef.current) rafRef.current = requestAnimationFrame(step);
  }, [joined, ready, setEntries, step]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource(SRC);
    if (!source) return;
    animRef.current.clear();
    // Keep the entry wave's rAF alive; cancel only when nothing is entering.
    if (entryRef.current.size === 0) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    // Overlay current entry progress so a view/year change does not reset it.
    const features = data.collection.features.map((f) => {
      const key = f.properties?._key;
      const ent = entryRef.current.get(key);
      let entry = ENTRY_FROM;
      if (ent) {
        const t = Math.min(1, Math.max(0, (performance.now() - ent.start - ent.delay) / ENTRY_DURATION_MS));
        entry = easeOutCubic(t);
      } else if (entryStartedRef.current) {
        entry = 1;
      }
      return {
        ...f,
        properties: { ...f.properties, _flatFactor: getFlatFactor(key), _entry: entry },
      };
    });
    source.setData({ ...data.collection, features });
    const keep = new Map();
    for (const key of [hoverRef.current, selectedRef.current]) {
      if (key != null) keep.set(key, targetFor(key));
    }
    liftRef.current = keep;
    setLifts(keep);
    if (selectedRef.current != null) {
      map.setFeatureState(
        { source: SRC, id: selectedRef.current },
        { selected: true },
      );
      // Depth changed with the data, so repaint the trace at the new altitude.
      startTrace(selectedRef.current, null, { instant: true });
    } else {
      clearTrace();
    }
  }, [clearTrace, data, ready, setLifts, startTrace, targetFor]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const previous = selectedRef.current;
    selectedRef.current = selectedKey;
    if (previous != null && previous !== selectedKey) {
      map.setFeatureState({ source: SRC, id: previous }, { selected: false });
      if (previous !== hoverRef.current) moveTo(previous, targetFor(previous));
    }
    if (selectedKey != null) {
      map.setFeatureState({ source: SRC, id: selectedKey }, { selected: true });
      moveTo(selectedKey, targetFor(selectedKey));
      // Read before the camera move below: this effect runs first, so this is the
      // centre the user was looking at when they selected.
      startTrace(selectedKey, map.getCenter());
      // A pulse acknowledges a user selection. The first-load restore from a URL
      // or history is not a user action, so it is silenced exactly once.
      const isInitialRestore =
        initialFocusKey != null &&
        selectedKey === initialFocusKey &&
        !initialPulseSuppressedRef.current;
      if (isInitialRestore) initialPulseSuppressedRef.current = true;
      if (!isInitialRestore && !reducedRef.current) startPulse(selectedKey);
    } else {
      clearTrace();
      cancelPulse();
    }
  }, [cancelPulse, clearTrace, initialFocusKey, moveTo, ready, selectedKey, startPulse, startTrace, targetFor]);

  // Reduced motion turning on mid-flight finishes every offset and trace immediately.
  useEffect(() => {
    if (!reducedMotion) return;
    const values = new Map();
    for (const [key, anim] of animRef.current) {
      liftRef.current.set(key, anim.to);
      values.set(key, anim.to);
    }
    animRef.current.clear();
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    if (values.size) setLifts(values);
    // prefers-reduced-motion: place every area at full height immediately.
    const entryValues = new Map();
    for (const key of entryRef.current.keys()) entryValues.set(key, 1);
    if (entryValues.size) setEntries(entryValues);
    entryRef.current = new Map();
    if (traceRef.current) {
      traceRef.current.progress = 1;
      paintTrace(traceRef.current, 1);
    }
    // prefers-reduced-motion: snap every area to its flatten target in one call.
    const flatKeys = dataRef.current.collection.features
      .map((f) => f.properties?._key)
      .filter(Boolean);
    // prefers-reduced-motion: never show a pulse.
    cancelPulse();
    const snapped = snapFlats(flatKeys, selectedRef.current);
    if (snapped.size) setFlatFactors(snapped);
  }, [cancelPulse, paintTrace, reducedMotion, setLifts, setEntries, setFlatFactors]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !selectedFeature) return;
    const bounds = boundsOf(selectedFeature);
    if (!bounds) return;
    map.fitBounds(bounds, {
      padding: 48,
      maxZoom: 13.5,
      duration: reducedRef.current ? 0 : 550,
    });
  }, [ready, selectedFeature]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || resetToken === 0) return;
    const bounds = boundsOf(joined);
    if (!bounds) return;
    map.fitBounds(bounds, {
      padding: 28,
      duration: reducedRef.current ? 0 : 550,
    });
  }, [joined, ready, resetToken]);

  // sheen: soft radial highlight that trails the pointer over the map.
  // Revert = delete this whole effect, `sheenRef`, and the <div ref={sheenRef}> in the JSX.
  useEffect(() => {
    const host = hostRef.current;
    const sheen = sheenRef.current;
    if (!host || !sheen) return;
    // Off for reduced motion (skill: Reduced Motion, High) and coarse pointers.
    if (reducedMotion) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    let primed = false;
    const move = (e) => {
      const r = host.getBoundingClientRect();
      const at = `translate3d(${e.clientX - r.left}px, ${e.clientY - r.top}px, 0)`;
      // First placement jumps (no sweep in from the corner); later moves trail.
      if (primed) {
        sheen.style.transform = at;
      } else {
        primed = true;
        sheen.style.transition = "opacity 200ms ease-out";
        sheen.style.transform = at;
        requestAnimationFrame(() => {
          sheen.style.transition = "transform 150ms ease-out, opacity 200ms ease-out";
        });
      }
      sheen.style.opacity = "1";
    };
    // Fade out completely when the pointer leaves the map.
    const leave = () => {
      sheen.style.opacity = "0";
      primed = false;
    };
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerleave", leave);
    return () => {
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
      sheen.style.opacity = "0";
    };
  }, [reducedMotion]);

  return (
    <div className="absolute inset-0 z-[450]">
      <div ref={hostRef} className="h-full w-full" />
      {/* sheen: delete this block to revert. Sits above the canvas, below the tooltip. */}
      <div
        ref={sheenRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 opacity-0"
        style={{
          width: "50vmin",
          height: "50vmin",
          marginLeft: "-25vmin",
          marginTop: "-25vmin",
          borderRadius: "50%",
          // SHEEN_STRENGTH 0.12, minimal glow (dark-mode-oled style); blend=screen adds light only.
          background:
            "radial-gradient(circle closest-side, rgba(255,255,255,0.12), rgba(255,255,255,0) 70%)",
          mixBlendMode: "screen",
          // SHEEN_LAG: the 150 ms transition is what makes it trail instead of snap.
          transition: "transform 150ms ease-out, opacity 200ms ease-out",
          willChange: "transform, opacity",
        }}
      />
      <div
        ref={tipRef}
        className="bih-tip pointer-events-none absolute left-0 top-0 hidden"
        aria-hidden="true"
      />
    </div>
  );
}
