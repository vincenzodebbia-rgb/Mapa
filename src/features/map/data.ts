import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { ORGANIZATIONS_TAG } from "@/lib/cache-tags";
import type { Database } from "@/lib/database.types";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { unwrap } from "@/lib/supabase/unwrap";
import type { MapEvent, MapNeighborhood, MapPlace, NeighborhoodMapItems, NeighborhoodPage } from "./types";

// Legge le viste map_items e map_neighborhoods (security_invoker: la RLS nasconde le organizzazioni sospese).
// Nei tipi generati le colonne delle viste (e i dati) possono essere tutte nulle: le righe senza un valore necessario si saltano.

type MapItemRow = Database["public"]["Views"]["map_items"]["Row"];
type NeighborhoodRow = Database["public"]["Views"]["map_neighborhoods"]["Row"];

const EVENT_COLUMNS =
  "id, slug, name, category, price_type, price_amount, occ_start, occ_end, venue_name, address, lng, lat, neighborhood_slug, organizer_names, organizer_kinds";
const PLACE_COLUMNS = "id, slug, name, organization_kind, address, lng, lat, neighborhood_slug";
const NEIGHBORHOOD_COLUMNS = "slug, name, district, center_lng, center_lat, west, south, east, north";

/** Occorrenze di eventi non finiti, da adesso a 7 giorni, in ordine di inizio. */
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

/** Associazioni ed espacios attivi con un indirizzo (la mappa Conexiones), in ordine di nome. */
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

// Pagine dei barrios (/barrio/[slug]): letture pubbliche come anon, in cache così la pagina è statica e dà un 404 vero.
// Eventi e organizzazioni le cambiano: le loro scritture aggiornano questi tag.
const NEIGHBORHOOD_TAGS = ["neighborhoods", "events", ORGANIZATIONS_TAG];

/** Il barrio con centro e riquadro, se ha contenuti (indicizzabile) e i barrios vicini. */
export async function getNeighborhoodPage(slug: string): Promise<NeighborhoodPage | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(...NEIGHBORHOOD_TAGS);

  const supabase = createSupabasePublicClient();
  const [place, page, neighbors] = await Promise.all([
    supabase.from("map_neighborhoods").select(NEIGHBORHOOD_COLUMNS).eq("slug", slug).maybeSingle(),
    supabase.from("neighborhood_pages").select("has_content").eq("slug", slug).maybeSingle(),
    supabase.from("neighborhood_neighbors").select("neighbor_slug, neighbor_name").eq("slug", slug).order("neighbor_name"),
  ]);
  const placeRow = unwrap(place);
  const neighborhood = placeRow ? toMapNeighborhood(placeRow) : null;
  if (!neighborhood) return null;
  return {
    ...neighborhood,
    hasContent: unwrap(page)?.has_content === true,
    neighbors: (unwrap(neighbors) ?? []).flatMap(({ neighbor_slug, neighbor_name }) =>
      neighbor_slug && neighbor_name ? [{ slug: neighbor_slug, name: neighbor_name }] : [],
    ),
  };
}

/**
 * Cosa si accende sulla mappa del barrio: gli eventi dei prossimi 7 giorni e le associazioni ed espacios del barrio.
 * `now` è l'ora di questa lettura in cache (gli stati di luce si calcolano rispetto a lei, non all'ora del prerender).
 */
export async function getNeighborhoodMapItems(slug: string): Promise<NeighborhoodMapItems> {
  "use cache";
  cacheLife("minutes");
  cacheTag(...NEIGHBORHOOD_TAGS);

  const supabase = createSupabasePublicClient();
  const [events, places] = await Promise.all([
    supabase.from("map_items").select(EVENT_COLUMNS).eq("item_type", "event").eq("neighborhood_slug", slug).order("occ_start"),
    supabase.from("map_items").select(PLACE_COLUMNS).eq("item_type", "organization").eq("neighborhood_slug", slug).order("name"),
  ]);
  return {
    events: (unwrap(events) ?? []).flatMap((row) => toMapEvent(row) ?? []),
    places: (unwrap(places) ?? []).flatMap((row) => toMapPlace(row) ?? []),
    now: new Date().toISOString(),
  };
}

/** Barrios con almeno un'associazione, un espacio o un evento futuro: gli unici nella sitemap. */
export async function getNeighborhoodSlugsWithContent(): Promise<string[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(...NEIGHBORHOOD_TAGS);

  const supabase = createSupabasePublicClient();
  const rows = unwrap(await supabase.from("neighborhood_pages").select("slug").eq("has_content", true).order("slug")) ?? [];
  return rows.flatMap((row) => (row.slug ? [row.slug] : []));
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
  // PostgREST restituisce i timestamptz con uno scarto orario; si portano in ISO UTC così ordinare e confrontare è semplice.
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
