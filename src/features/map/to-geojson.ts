import { getLightState } from "./light-state";
import type { LightState, MapFeatureCollection, MapEvent, MapPlace } from "./types";

type PointInput = { key: string; lng: number; lat: number; light: LightState };

// Numeric feature ids: MapLibre needs them for feature state. Popup content is looked up by `key`.
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

/** Places on the Conexiones map are all `lit`: being there is enough. */
export function placesToGeoJson(places: MapPlace[]): MapFeatureCollection {
  return toFeatureCollection(places.map((place) => ({ key: place.id, lng: place.lng, lat: place.lat, light: "lit" })));
}
