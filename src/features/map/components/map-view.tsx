"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { Popup, setWorkerUrl, type Map as MaplibreMap } from "maplibre-gl";
import MapGL, { Layer, Source, type MapLayerMouseEvent, type MapRef } from "react-map-gl/maplibre";
import { useEffect, useRef, useState } from "react";
import { buildPopup } from "../build-popup";
import type { MapFeatureCollection, PopupContent } from "../types";
import { readCssColor } from "./read-css-color";

// MapLibre 6 looks for its worker next to its own file, a path that no longer exists once bundled.
// new URL(..., import.meta.url) makes the bundler emit the worker file and gives its real, same-origin URL.
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

export type MapViewProps = {
  styleUrl: string;
  data: MapFeatureCollection;
  /** Popup texts by feature `key`, already formatted on the server. */
  popups: Record<string, PopupContent>;
  /** [west, south, east, north] to fit, e.g. the selected barrio. Null = all of Madrid. */
  bounds: [number, number, number, number] | null;
  label: string;
};

const MADRID_VIEW = { longitude: -3.7038, latitude: 40.4168, zoom: 11.5 };
const SOURCE_ID = "map-points";
const POINTS_LAYER = "map-points";
const PULSE_LAYER = "map-pulse";
const POINT_RADIUS = 6; // same size for every point (docs/SPEC.md §4)
const PULSE_RADIUS = 14;
const PULSE_PERIOD_MS = 1600;

export function MapView({ styleUrl, data, popups, bounds, label }: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const colorProbeRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<Popup | null>(null);
  const frameRef = useRef<number | null>(null);
  const countPendingRef = useRef(true);
  const [lightColor, setLightColor] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string>("");
  const [renderedPoints, setRenderedPoints] = useState(0);

  // Depend on the numbers, not on the array: a new array with the same barrio must not undo the user's panning.
  const boundsKey = bounds ? bounds.join(",") : "";

  useEffect(() => {
    const [west, south, east, north] = boundsKey ? boundsKey.split(",").map(Number) : [];
    if (west === undefined || south === undefined || east === undefined || north === undefined) return;
    mapRef.current?.fitBounds([west, south, east, north], { padding: 40, duration: 0 });
  }, [boundsKey]);

  useEffect(() => {
    countPendingRef.current = true;
  }, [data]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      popupRef.current?.remove();
    };
  }, []);

  function handleLoad() {
    const probe = colorProbeRef.current;
    if (probe) setLightColor(readCssColor(probe));
    const map = mapRef.current?.getMap();
    if (map) startPulse(map);
  }

  // The pulse is a halo whose opacity breathes; the point itself never changes size.
  // With prefers-reduced-motion the halo stays still, so "today" is still visible without movement.
  function startPulse(map: MaplibreMap) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tick = (time: number) => {
      if (map.getLayer(PULSE_LAYER)) {
        const phase = (Math.sin((time / PULSE_PERIOD_MS) * 2 * Math.PI) + 1) / 2;
        map.setPaintProperty(PULSE_LAYER, "circle-opacity", 0.1 + phase * 0.4);
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  }

  function handleClick(event: MapLayerMouseEvent) {
    const feature = event.features?.[0];
    const key = feature?.properties?.key;
    const map = mapRef.current?.getMap();
    if (!map || typeof key !== "string" || feature?.geometry.type !== "Point") return;
    const content = popups[key];
    if (!content) return;
    const [lng, lat] = feature.geometry.coordinates;
    if (lng === undefined || lat === undefined) return;
    popupRef.current?.remove();
    popupRef.current = new Popup({ maxWidth: "18rem" })
      .setLngLat([lng, lat])
      .setDOMContent(buildPopup(document, content))
      .addTo(map);
  }

  // Counts the points actually drawn (exposed as data-rendered-points for the e2e test). It runs on `render`,
  // not `idle`: the pulse repaints every frame, so the map is never idle. Only after data or view changes.
  function handleRender() {
    const map = mapRef.current?.getMap();
    if (!countPendingRef.current || !map?.getLayer(POINTS_LAYER) || !map.isSourceLoaded(SOURCE_ID)) return;
    const ids = new Set(map.queryRenderedFeatures({ layers: [POINTS_LAYER] }).map((feature) => feature.id));
    if (ids.size > 0) countPendingRef.current = false;
    setRenderedPoints(ids.size);
  }

  return (
    <div
      role="region"
      aria-label={label}
      className="h-full w-full"
      data-testid="map-view"
      data-points={data.features.length}
      data-rendered-points={renderedPoints}
    >
      <span ref={colorProbeRef} className="hidden text-light" aria-hidden="true" />
      <MapGL
        ref={mapRef}
        mapStyle={styleUrl}
        initialViewState={bounds ? { bounds, fitBoundsOptions: { padding: 40 } } : MADRID_VIEW}
        attributionControl={{ compact: false }}
        interactiveLayerIds={lightColor ? [POINTS_LAYER] : []}
        cursor={cursor}
        onLoad={handleLoad}
        onClick={handleClick}
        onRender={handleRender}
        onMoveEnd={() => {
          countPendingRef.current = true;
        }}
        onMouseEnter={() => setCursor("pointer")}
        onMouseLeave={() => setCursor("")}
      >
        {lightColor && (
          <Source id={SOURCE_ID} type="geojson" data={data}>
            <Layer
              id={PULSE_LAYER}
              type="circle"
              filter={["==", ["get", "light"], "pulse"]}
              paint={{ "circle-radius": PULSE_RADIUS, "circle-color": lightColor, "circle-opacity": 0.3 }}
            />
            <Layer
              id={POINTS_LAYER}
              type="circle"
              paint={{ "circle-radius": POINT_RADIUS, "circle-color": lightColor }}
            />
          </Source>
        )}
      </MapGL>
    </div>
  );
}
