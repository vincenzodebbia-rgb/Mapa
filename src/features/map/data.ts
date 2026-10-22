import "server-only";
import type { Database } from "@/lib/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { unwrap } from "@/lib/supabase/unwrap";
import type { MapEvent, MapNeighborhood, MapPlace } from "./types";

// Reads the views map_items and map_neighborhoods (security_invoker: RLS hides suspended organizations).
// View columns (and data) are all nullable in the generated types: rows missing a required value are skipped.

type MapItemRow = Database["public"]["Views"]["map_items"]["Row"];
type NeighborhoodRow = Database["public"]["Views"]["map_neighborhoods"]["Row"];

const EVENT_COLUMNS =
  "id, slug, name, category, price_type, price_amount, occ_start, occ_end, venue_name, address, lng, lat, neighborhood_slug, organizer_names, organizer_kinds";
const PLACE_COLUMNS = "id, slug, name, organization_kind, address, lng, lat, neighborhood_slug";
const NEIGHBORHOOD_COLUMNS = "slug, name, district, center_lng, center_lat, west, south, east, north";

/** Occurrences of events that have not ended, from now to 7 days ahead, sorted by start. */
export async function getUpcomingEvents(): Promise<MapEvent[]> {
  const supabase = await createSupabaseServerClient();
  const rows = unwrap(
    await supabase.from("map_items").select(EVENT_COLUMNS).eq("item_type", "event").order("occ_start"),
  ) ?? [];
  return rows.flatMap((row) => {
    const event = toMapEvent(row);
    return event ? [event] : [];
  });
}

/** Active associations and venues with an address (the Conexiones map), sorted by name. */
export async function getPlaces(): Promise<MapPlace[]> {
  const supabase = await createSupabaseServerClient();
  const rows = unwrap(
    await supabase.from("map_items").select(PLACE_COLUMNS).eq("item_type", "organization").order("name"),
  ) ?? [];
  return rows.flatMap((row) => {
    const place = toMapPlace(row);
    return place ? [place] : [];
  });
}

export async function getNeighborhoods(): Promise<MapNeighborhood[]> {
  const supabase = await createSupabaseServerClient();
  const rows = unwrap(await supabase.from("map_neighborhoods").select(NEIGHBORHOOD_COLUMNS).order("name")) ?? [];
  return rows.flatMap((row) => {
    const neighborhood = toMapNeighborhood(row);
    return neighborhood ? [neighborhood] : [];
  });
}

function toMapEvent(
  row: Pick<
    MapItemRow,
    | "id"
    | "slug"
    | "name"
    | "category"
    | "price_type"
    | "price_amount"
    | "occ_start"
    | "occ_end"
    | "venue_name"
    | "address"
    | "lng"
    | "lat"
    | "neighborhood_slug"
    | "organizer_names"
    | "organizer_kinds"
  >,
): MapEvent | null {
  const { id, slug, name, category, price_type, occ_start, occ_end, lng, lat } = row;
  if (!id || !slug || !name || !category || !price_type || !occ_start || !occ_end || lng === null || lat === null) {
    return null;
  }
  // PostgREST returns timestamptz with an offset; normalize to ISO UTC so sorting and comparisons are plain.
  const startsAt = new Date(occ_start).toISOString();
  return {
    key: `${id}:${startsAt}`,
    id,
    slug,
    title: name,
    category,
    priceType: price_type,
    priceAmount: row.price_amount,
    startsAt,
    endsAt: new Date(occ_end).toISOString(),
    venueName: row.venue_name,
    address: row.address,
    lng,
    lat,
    neighborhoodSlug: row.neighborhood_slug,
    organizerNames: row.organizer_names ?? "",
    organizerKinds: row.organizer_kinds ?? [],
  };
}

function toMapPlace(
  row: Pick<MapItemRow, "id" | "slug" | "name" | "organization_kind" | "address" | "lng" | "lat" | "neighborhood_slug">,
): MapPlace | null {
  const { id, slug, name, organization_kind: kind, lng, lat } = row;
  if (!id || !slug || !name || lng === null || lat === null) return null;
  if (kind !== "association" && kind !== "venue") return null;
  return { id, slug, name, kind, address: row.address, lng, lat, neighborhoodSlug: row.neighborhood_slug };
}

function toMapNeighborhood(row: NeighborhoodRow): MapNeighborhood | null {
  const { slug, name, center_lng, center_lat, west, south, east, north } = row;
  if (!slug || !name || center_lng === null || center_lat === null) return null;
  if (west === null || south === null || east === null || north === null) return null;
  return {
    slug,
    name,
    district: row.district,
    center: [center_lng, center_lat],
    bounds: [west, south, east, north],
  };
}
