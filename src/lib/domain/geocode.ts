import { z } from "zod";

// Parti pure della geocodifica (testate): chiave della cache, URL di Nominatim, lettura della risposta.
// La chiamata vera, la cache e il ritmo di 1 richiesta al secondo stanno in src/lib/geocode.ts (server-only).

/** Same box as private.make_org_point: a point outside it is rejected by the database (`invalid_location`). */
export const MADRID_REGION_BOX = { west: -4.6, south: 39.8, east: -3.0, north: 41.2 } as const;

export type GeocodeResult = { lng: number; lat: number; displayName: string };

export function isInsideMadridRegion(lng: number, lat: number): boolean {
  const box = MADRID_REGION_BOX;
  return lng >= box.west && lng <= box.east && lat >= box.south && lat <= box.north;
}

/** Cache key: lowercase, single spaces, NFC, max 300 characters (geocode_cache.query_normalized). */
export function normalizeGeocodeQuery(address: string): string {
  return address.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase().slice(0, 300);
}

/** Search URL bounded to the Comunidad de Madrid, one result, Spanish names. */
export function buildNominatimSearchUrl(query: string): string {
  const box = MADRID_REGION_BOX;
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
    countrycodes: "es",
    viewbox: `${box.west},${box.north},${box.east},${box.south}`,
    bounded: "1",
    "accept-language": "es",
  });
  return `https://nominatim.openstreetmap.org/search?${params.toString()}`;
}

const nominatimResultSchema = z.array(
  z.object({ lat: z.coerce.number(), lon: z.coerce.number(), display_name: z.string() }),
);

/** First usable result inside the region, or null (nothing found, or an answer we do not understand). */
export function parseNominatimResponse(body: unknown): GeocodeResult | null {
  const parsed = nominatimResultSchema.safeParse(body);
  if (!parsed.success) return null;
  const first = parsed.data.find(
    (item) => Number.isFinite(item.lon) && Number.isFinite(item.lat) && isInsideMadridRegion(item.lon, item.lat),
  );
  return first ? { lng: first.lon, lat: first.lat, displayName: first.display_name.slice(0, 500) } : null;
}
