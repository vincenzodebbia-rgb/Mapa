"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import "./maplibre-worker";
import MapGL, { Marker, type MapRef, type MarkerDragEvent } from "react-map-gl/maplibre";
import { useEffect, useRef } from "react";
import { MADRID_REGION_BOX } from "@/lib/domain/geocode";
import type { Point } from "@/components/ui/point-field";

export type LocationPickerMapProps = {
  styleUrl: string;
  point: Point;
  onMove: (point: Point) => void;
  label: string;
};

// La mappa non può uscire dalla Comunidad de Madrid, quindi nemmeno il pin (stesso riquadro di private.make_org_point).
const MAX_BOUNDS: [number, number, number, number] = [
  MADRID_REGION_BOX.west,
  MADRID_REGION_BOX.south,
  MADRID_REGION_BOX.east,
  MADRID_REGION_BOX.north,
];

/** Secondo componente MapLibre del blocco: un pin trascinabile per l'indirizzo di un luogo. */
export function LocationPickerMap({ styleUrl, point, onMove, label }: LocationPickerMapProps) {
  const mapRef = useRef<MapRef>(null);

  // Un punto nuovo dalla ricerca dell'indirizzo: la mappa lo segue. Dopo un trascinamento il pin è già in vista.
  useEffect(() => {
    mapRef.current?.easeTo({ center: [point.lng, point.lat], duration: 300 });
  }, [point.lng, point.lat]);

  function handleDragEnd(event: MarkerDragEvent) {
    onMove({ lng: event.lngLat.lng, lat: event.lngLat.lat });
  }

  return (
    <div role="region" aria-label={label} className="h-64 w-full overflow-hidden rounded-card border border-line" data-testid="location-picker">
      <MapGL
        ref={mapRef}
        mapStyle={styleUrl}
        initialViewState={{ longitude: point.lng, latitude: point.lat, zoom: 16 }}
        maxBounds={MAX_BOUNDS}
        attributionControl={{ compact: false }}
      >
        <Marker longitude={point.lng} latitude={point.lat} anchor="center" draggable onDragEnd={handleDragEnd}>
          <span className="block size-6 rounded-pill border-2 border-night bg-light" aria-hidden="true" />
        </Marker>
      </MapGL>
    </div>
  );
}
