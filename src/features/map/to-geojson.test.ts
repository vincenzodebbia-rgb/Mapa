import { describe, expect, it } from "vitest";
import { eventsToGeoJson, neighborhoodToGeoJson, placesToGeoJson } from "./to-geojson";
import type { MapEvent, MapPlace } from "./types";

const now = new Date("2026-07-16T16:00:00Z");

const event: MapEvent = {
  key: "e1:2026-07-16T19:00:00Z",
  id: "e1",
  slug: "concierto",
  title: "Concierto",
  category: "musica",
  priceType: "free",
  priceAmount: null,
  startsAt: "2026-07-16T19:00:00Z",
  endsAt: "2026-07-16T21:00:00Z",
  venueName: null,
  address: null,
  lng: -3.72,
  lat: 40.39,
  neighborhoodSlug: null,
  organizerNames: "A",
  organizerKinds: ["association"],
};

describe("eventsToGeoJson", () => {
  it("makes one point per occurrence with lng/lat order and its light state", () => {
    const later = { ...event, key: "e1:2026-07-20T19:00:00Z", startsAt: "2026-07-20T19:00:00Z", endsAt: "2026-07-20T21:00:00Z" };
    expect(eventsToGeoJson([event, later], now)).toEqual({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          id: 0,
          geometry: { type: "Point", coordinates: [-3.72, 40.39] },
          properties: { key: "e1:2026-07-16T19:00:00Z", light: "pulse" },
        },
        {
          type: "Feature",
          id: 1,
          geometry: { type: "Point", coordinates: [-3.72, 40.39] },
          properties: { key: "e1:2026-07-20T19:00:00Z", light: "lit" },
        },
      ],
    });
  });

  it("puts no event text in the GeoJSON: popups are looked up by key", () => {
    const json = JSON.stringify(eventsToGeoJson([{ ...event, title: "<img src=x onerror=alert(1)>" }], now));
    expect(json).not.toContain("onerror");
  });
});

describe("placesToGeoJson", () => {
  it("lights every place", () => {
    const place: MapPlace = {
      id: "p1",
      slug: "asociacion",
      name: "Asociación",
      kind: "association",
      address: null,
      lng: -3.7,
      lat: 40.4,
      neighborhoodSlug: null,
    };
    expect(placesToGeoJson([place]).features[0]?.properties).toEqual({ key: "p1", light: "lit" });
  });
});

describe("neighborhoodToGeoJson", () => {
  it("puts events and places in one collection with unique ids", () => {
    const place: MapPlace = {
      id: "o1",
      slug: "colmena",
      name: "Colmena",
      kind: "association",
      address: null,
      lng: -3.73,
      lat: 40.38,
      neighborhoodSlug: "opanel",
    };
    const collection = neighborhoodToGeoJson([event], [place], now);
    expect(collection.features.map((feature) => [feature.id, feature.properties])).toEqual([
      [0, { key: event.key, light: "pulse" }],
      [1, { key: "o1", light: "lit" }],
    ]);
  });
});
