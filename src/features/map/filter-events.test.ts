import { describe, expect, it } from "vitest";
import { filterEvents } from "./filter-events";
import { parseMapFilters } from "./schema";
import type { MapEvent } from "./types";

// Thursday 16 July 2026, 18:00 in Madrid (UTC+2).
const now = new Date("2026-07-16T16:00:00Z");

function makeEvent(overrides: Partial<MapEvent> & Pick<MapEvent, "key">): MapEvent {
  return {
    id: overrides.key,
    slug: overrides.key,
    title: overrides.key,
    category: "musica",
    priceType: "free",
    priceAmount: null,
    startsAt: "2026-07-16T19:00:00Z",
    endsAt: "2026-07-16T21:00:00Z",
    venueName: null,
    address: "Calle de prueba 1",
    lng: -3.7,
    lat: 40.4,
    neighborhoodSlug: "opanel",
    organizerNames: "Asociación de prueba",
    organizerKinds: ["association"],
    ...overrides,
  };
}

const events = [
  makeEvent({ key: "today-free" }),
  makeEvent({ key: "today-donation", priceType: "donation", category: "arte", neighborhoodSlug: "comillas" }),
  makeEvent({
    key: "later-paid",
    priceType: "paid",
    priceAmount: 5,
    startsAt: "2026-07-18T17:00:00Z",
    endsAt: "2026-07-18T19:00:00Z",
    organizerKinds: ["professional", "venue"],
  }),
  makeEvent({ key: "ended", startsAt: "2026-07-16T10:00:00Z", endsAt: "2026-07-16T12:00:00Z" }),
];

function keys(filtered: MapEvent[]): string[] {
  return filtered.map((event) => event.key);
}

describe("filterEvents", () => {
  it("drops ended events and sorts by start time", () => {
    const filtered = filterEvents(events.toReversed(), parseMapFilters({}), now, { byNeighborhood: true });
    expect(keys(filtered)).toEqual(["today-donation", "today-free", "later-paid"]);
  });

  it("Gratis keeps free and voluntary-donation events, De pago only paid ones", () => {
    expect(keys(filterEvents(events, parseMapFilters({ precio: "gratis" }), now, { byNeighborhood: true }))).toEqual([
      "today-donation",
      "today-free",
    ]);
    expect(keys(filterEvents(events, parseMapFilters({ precio: "pago" }), now, { byNeighborhood: true }))).toEqual([
      "later-paid",
    ]);
  });

  it("filters by category", () => {
    expect(keys(filterEvents(events, parseMapFilters({ cat: "arte" }), now, { byNeighborhood: true }))).toEqual([
      "today-donation",
    ]);
  });

  it("Quién organiza matches any organizer of the event", () => {
    expect(keys(filterEvents(events, parseMapFilters({ quien: "espacios" }), now, { byNeighborhood: true }))).toEqual([
      "later-paid",
    ]);
    expect(keys(filterEvents(events, parseMapFilters({ quien: "gente" }), now, { byNeighborhood: true }))).toEqual([
      "later-paid",
    ]);
  });

  it("Solo hoy keeps only today's events", () => {
    expect(keys(filterEvents(events, parseMapFilters({ solo: "hoy" }), now, { byNeighborhood: true }))).toEqual([
      "today-donation",
      "today-free",
    ]);
  });

  it("the barrio narrows the list but not the map", () => {
    const filters = parseMapFilters({ barrio: "comillas" });
    expect(keys(filterEvents(events, filters, now, { byNeighborhood: true }))).toEqual(["today-donation"]);
    expect(filterEvents(events, filters, now, { byNeighborhood: false })).toHaveLength(3);
  });

  it("combines filters", () => {
    const filters = parseMapFilters({ precio: "gratis", solo: "hoy", cat: "musica" });
    expect(keys(filterEvents(events, filters, now, { byNeighborhood: true }))).toEqual(["today-free"]);
  });
});
