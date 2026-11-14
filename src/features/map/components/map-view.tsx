"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import "./maplibre-worker";
import { Popup, type Map as MaplibreMap } from "maplibre-gl";
import MapGL, { Layer, Source, type MapLayerMouseEvent, type MapRef } from "react-map-gl/maplibre";
import { useEffect, useRef, useState } from "react";
import { buildPopup } from "../build-popup";
import type { MapFeatureCollection, PopupContent } from "../types";
import { readCssColor } from "./read-css-color";

export type MapViewProps = {
  styleUrl: string;
  data: MapFeatureCollection;
  /** Testi dei popup per `key` dell'elemento, già formattati sul server. */
  popups: Record<string, PopupContent>;
  /** [ovest, sud, est, nord] da inquadrare, per esempio il barrio scelto. Null = tutta Madrid. */
  bounds: [number, number, number, number] | null;
  label: string;
  /** Chiave dell'elemento da aprire subito (centrato, con il popup): l'evento appena pubblicato (D8). */
  selectedKey?: string | null;
};

const MADRID_VIEW = { longitude: -3.7038, latitude: 40.4168, zoom: 11.5 };
const SOURCE_ID = "map-points";
const POINTS_LAYER = "map-points";
const PULSE_LAYER = "map-pulse";
const POINT_RADIUS = 6; // stessa grandezza per ogni punto (docs/SPEC.md §4)
const PULSE_RADIUS = 14;
const PULSE_PERIOD_MS = 1600;
const SELECTED_ZOOM = 15;

export function MapView({ styleUrl, data, popups, bounds, label, selectedKey = null }: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const colorProbeRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<Popup | null>(null);
  const frameRef = useRef<number | null>(null);
  const countPendingRef = useRef(true);
  const [lightColor, setLightColor] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string>("");
  const [renderedPoints, setRenderedPoints] = useState(0);
  const [openedKey, setOpenedKey] = useState<string | null>(null);

  // Dipende dai numeri, non dall'array: un array nuovo con lo stesso barrio non deve annullare lo spostamento dell'utente.
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
    if (map && selectedKey) openSelected(map, selectedKey);
  }

  // Il punto scelto dall'URL: si centra la mappa e si apre il suo popup, come dopo un clic.
  function openSelected(map: MaplibreMap, key: string) {
    const feature = data.features.find((candidate) => candidate.properties.key === key);
    if (!feature) return;
    const [lng, lat] = feature.geometry.coordinates;
    if (lng === undefined || lat === undefined) return;
    map.jumpTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), SELECTED_ZOOM) });
    openPopup(map, key, lng, lat);
  }

  function openPopup(map: MaplibreMap, key: string, lng: number, lat: number) {
    const content = popups[key];
    if (!content) return;
    popupRef.current?.remove();
    popupRef.current = new Popup({ maxWidth: "18rem" })
      .setLngLat([lng, lat])
      .setDOMContent(buildPopup(document, content))
      .addTo(map);
    setOpenedKey(key);
  }

  // Il pulse è un alone la cui opacità respira; il punto non cambia mai grandezza.
  // Con prefers-reduced-motion l'alone resta fermo, così "oggi" si vede comunque, senza movimento.
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
    const [lng, lat] = feature.geometry.coordinates;
    if (lng === undefined || lat === undefined) return;
    openPopup(map, key, lng, lat);
  }

  // Conta i punti davvero disegnati (esposti come data-rendered-points per l'e2e). Gira su `render`,
  // non su `idle`: il pulse ridisegna ogni fotogramma, quindi la mappa non è mai ferma. Solo dopo cambi di dati o di vista.
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
      data-opened={openedKey ?? undefined}
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
