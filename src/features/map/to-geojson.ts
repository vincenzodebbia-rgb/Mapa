import { getLightState } from "./light-state";
import type { LightState, MapFeatureCollection, MapEvent, MapPlace } from "./types";

type PointInput = { key: string; lng: number; lat: number; light: LightState };

// Id numerici degli elementi: servono a MapLibre per il feature state. Il contenuto del popup si cerca per `key`.
function toFeatureCollection(points: PointInput[]): MapFeatureCollection {
  return {
    type: "FeatureCollection",
    features: points.map((point, index) => ({
      type: "Feature",
      id: index,
      geometry: { type: "Point", coordinates: [point.lng, point.lat] },
      properties: { key: point.key, light: point.light },
    })),
  };
}

export function eventsToGeoJson(events: MapEvent[], now: Date): MapFeatureCollection {
  return toFeatureCollection(
    events.map((event) => ({ key: event.key, lng: event.lng, lat: event.lat, light: getLightState(event, now) })),
  );
}

/** La mappa del barrio: i suoi eventi (pulse/lit) e i suoi luoghi (lit), in una sola raccolta con id unici. */
export function neighborhoodToGeoJson(events: MapEvent[], places: MapPlace[], now: Date): MapFeatureCollection {
  return toFeatureCollection([
    ...events.map((event) => ({ key: event.key, lng: event.lng, lat: event.lat, light: getLightState(event, now) })),
    ...places.map((place) => ({ key: place.id, lng: place.lng, lat: place.lat, light: "lit" as const })),
  ]);
}

/** I luoghi della mappa Conexiones sono tutti `lit`: esserci basta. */
export function placesToGeoJson(places: MapPlace[]): MapFeatureCollection {
  return toFeatureCollection(places.map((place) => ({ key: place.id, lng: place.lng, lat: place.lat, light: "lit" })));
}
