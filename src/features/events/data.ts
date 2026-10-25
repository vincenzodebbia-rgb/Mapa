import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Database } from "@/lib/database.types";
import { parseEwkbPoint } from "@/lib/domain/geo";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { unwrap } from "@/lib/supabase/unwrap";
import { isEventIndexable, shouldRedirectEvent } from "./event-page-rules";
import type { EventOrganizer, EventPage, UpcomingEvent } from "./types";

// Public reads, as anon (RLS: no events of suspended organizations), cached so the event page is static
// and answers a real 404 or 308. Writes (session 6) must call updateTag(EVENTS_TAG).
// Occurrences come only from SQL (event_schedule, upcoming_events): recurrence is never computed here.
export const EVENTS_TAG = "events";

type UpcomingRow = Database["public"]["Views"]["upcoming_events"]["Row"];

const EVENT_COLUMNS =
  "id, slug, title, description, category, price_type, price_amount, recurrence, starts_at, ends_at, venue_name, address, location, neighborhood:neighborhoods(slug, name), event_organizers(role, organization:organizations(slug, name, kind))";
const UPCOMING_COLUMNS =
  "id, slug, title, category, price_type, price_amount, occ_start, occ_end, venue_name, address, organizer_names";

export type EventPageResult =
  | { status: "found"; event: EventPage; indexable: boolean }
  | { status: "redirect"; organizerSlug: string }
  | { status: "missing" };

const toIso = (value: string) => new Date(value).toISOString();

export async function getEventPage(slug: string): Promise<EventPageResult> {
  "use cache";
  cacheLife("minutes");
  cacheTag(EVENTS_TAG, `event:${slug}`);

  const supabase = createSupabasePublicClient();
  const row = unwrap(await supabase.from("events").select(EVENT_COLUMNS).eq("slug", slug).maybeSingle());
  const point = row ? parseEwkbPoint(row.location) : null;
  if (!row || !point) return { status: "missing" };

  // Organizers hidden by RLS (suspended) come back as null: they are simply not shown.
  const organizers: EventOrganizer[] = row.event_organizers
    .flatMap((link) =>
      link.organization
        ? [{ ...link.organization, isOwner: link.role === "owner" }]
        : [],
    )
    .sort((a, b) => Number(b.isOwner) - Number(a.isOwner) || a.name.localeCompare(b.name, "es"));
  const owner = organizers.find((organizer) => organizer.isOwner);
  if (!owner) return { status: "missing" };

  const [schedule] = unwrap(await supabase.rpc("event_schedule", { p_event_id: row.id })) ?? [];
  if (!schedule?.last_end) return { status: "missing" };

  // Inside the cache scope: "now" is the time of this render, refreshed with the cache (minutes).
  const now = new Date();
  const lastEndsAt = toIso(schedule.last_end);
  if (shouldRedirectEvent(lastEndsAt, now)) return { status: "redirect", organizerSlug: owner.slug };

  const durationMs = new Date(row.ends_at).getTime() - new Date(row.starts_at).getTime();
  // No occurrence left: show the last one (the page lives 7 more days before the redirect).
  const startsAt = schedule.next_start ? toIso(schedule.next_start) : new Date(Date.parse(lastEndsAt) - durationMs).toISOString();
  const endsAt = schedule.next_end ? toIso(schedule.next_end) : lastEndsAt;

  return {
    status: "found",
    indexable: isEventIndexable(lastEndsAt, now),
    event: {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      category: row.category,
      priceType: row.price_type,
      priceAmount: row.price_amount,
      recurrence: row.recurrence,
      startsAt,
      endsAt,
      lastEndsAt,
      venueName: row.venue_name,
      address: row.address,
      lng: point[0],
      lat: point[1],
      neighborhood: row.neighborhood ? { slug: row.neighborhood.slug, name: row.neighborhood.name } : null,
      organizers,
    },
  };
}

function toUpcomingEvent(row: Pick<UpcomingRow, "id" | "slug" | "title" | "category" | "price_type" | "price_amount" | "occ_start" | "occ_end" | "venue_name" | "address" | "organizer_names">): UpcomingEvent | null {
  const { id, slug, title, category, price_type, occ_start, occ_end } = row;
  if (!id || !slug || !title || !category || !price_type || !occ_start || !occ_end) return null;
  const startsAt = toIso(occ_start);
  return {
    key: `${id}:${startsAt}`,
    slug,
    title,
    category,
    priceType: price_type,
    priceAmount: row.price_amount,
    startsAt,
    endsAt: toIso(occ_end),
    venueName: row.venue_name,
    address: row.address,
    organizerNames: row.organizer_names ?? "",
  };
}

const UPCOMING_LIMIT = 30;

/** Next occurrences (60 days) of the events an organization runs or co-organizes. */
export async function getUpcomingEventsForOrganization(organizationId: string): Promise<UpcomingEvent[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(EVENTS_TAG);

  const supabase = createSupabasePublicClient();
  const rows =
    unwrap(
      await supabase
        .from("upcoming_events")
        .select(UPCOMING_COLUMNS)
        .contains("organizer_ids", [organizationId])
        .order("occ_start")
        .limit(UPCOMING_LIMIT),
    ) ?? [];
  return rows.flatMap((row) => toUpcomingEvent(row) ?? []);
}

/** Next occurrences (60 days) of the events in a barrio. */
export async function getUpcomingEventsInNeighborhood(neighborhoodSlug: string): Promise<UpcomingEvent[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(EVENTS_TAG);

  const supabase = createSupabasePublicClient();
  const rows =
    unwrap(
      await supabase
        .from("upcoming_events")
        .select(UPCOMING_COLUMNS)
        .eq("neighborhood_slug", neighborhoodSlug)
        .order("occ_start")
        .limit(UPCOMING_LIMIT),
    ) ?? [];
  return rows.flatMap((row) => toUpcomingEvent(row) ?? []);
}

const UPCOMING_WINDOW_DAYS = 60;

/**
 * Events with an occurrence that has not ended, for the sitemap: those in upcoming_events (next 60 days)
 * plus those that start even later. Together they are exactly the events not over yet.
 */
export async function getIndexableEventSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(EVENTS_TAG);

  const supabase = createSupabasePublicClient();
  const windowEnd = new Date(Date.now() + UPCOMING_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const [upcoming, later] = await Promise.all([
    supabase.from("upcoming_events").select("slug"),
    supabase.from("events").select("slug").gte("starts_at", windowEnd),
  ]);
  const slugs = [...(unwrap(upcoming) ?? []), ...(unwrap(later) ?? [])].flatMap((row) => (row.slug ? [row.slug] : []));
  return [...new Set(slugs)].sort();
}
