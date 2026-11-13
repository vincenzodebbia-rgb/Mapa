import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Database } from "@/lib/database.types";
import { parseEwkbPoint } from "@/lib/domain/geo";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { unwrap } from "@/lib/supabase/unwrap";
import { formatMadridTime, getMadridDateKey } from "@/lib/dates";
import { isEventIndexable, shouldRedirectEvent } from "./event-page-rules";
import { isEventUpcoming } from "./schema";
import type { EventForEdit, EventOrganizer, EventOwner, EventPageResult, MyEvent, UpcomingEvent } from "./types";

// Letture pubbliche, come anon (RLS: niente eventi di organizzazioni sospese), in cache così la pagina evento è statica
// e risponde con un 404 o un 308 veri. Le scritture (sessione 6) devono chiamare updateTag(EVENTS_TAG).
// Le occorrenze arrivano solo da SQL (event_schedule, upcoming_events): la ripetizione non si calcola mai qui.
export const EVENTS_TAG = "events";

type UpcomingRow = Database["public"]["Views"]["upcoming_events"]["Row"];

const EVENT_COLUMNS =
  "id, slug, title, description, category, price_type, price_amount, recurrence, starts_at, ends_at, venue_name, address, location, neighborhood:neighborhoods(slug, name), event_organizers(role, organization:organizations(slug, name, kind))";
const UPCOMING_COLUMNS =
  "id, slug, title, category, price_type, price_amount, occ_start, occ_end, venue_name, address, organizer_names";

const toIso = (value: string) => new Date(value).toISOString();

export async function getEventPage(slug: string): Promise<EventPageResult> {
  "use cache";
  cacheLife("minutes");
  cacheTag(EVENTS_TAG, `event:${slug}`);

  const supabase = createSupabasePublicClient();
  const row = unwrap(await supabase.from("events").select(EVENT_COLUMNS).eq("slug", slug).maybeSingle());
  const point = row ? parseEwkbPoint(row.location) : null;
  if (!row || !point) return { status: "missing" };

  // Gli organizzatori nascosti dalla RLS (sospesi) tornano come null: semplicemente non si mostrano.
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

  // Dentro l'ambito della cache: "now" è l'ora di questo render, che si rinnova con la cache (minuti).
  const now = new Date();
  const lastEndsAt = toIso(schedule.last_end);
  if (shouldRedirectEvent(lastEndsAt, now)) return { status: "redirect", organizerSlug: owner.slug };

  const durationMs = new Date(row.ends_at).getTime() - new Date(row.starts_at).getTime();
  // Nessuna occorrenza rimasta: si mostra l'ultima (la pagina vive altri 7 giorni prima del redirect).
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

/** Prossime occorrenze (60 giorni) degli eventi che un'organizzazione organizza o co-organizza. */
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

/** Prossime occorrenze (60 giorni) degli eventi di un barrio. */
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
 * Eventi con un'occorrenza non finita, per la sitemap: quelli di upcoming_events (prossimi 60 giorni)
 * più quelli che cominciano ancora dopo. Insieme sono esattamente gli eventi non ancora finiti.
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

// Letture private per /panel (sessione 6): con il client dell'utente (RLS), mai in cache.

/**
 * L'organizzazione dell'utente che pubblica gli eventi, con sede e categoria abituale per precompilare il modulo.
 * Null se l'utente non ha un'organizzazione. Legge come l'utente: la RLS mostra solo le sue membership.
 */
export async function getEventOwner(userId: string): Promise<EventOwner | null> {
  const supabase = await createSupabaseServerClient();
  const row = unwrap(
    await supabase
      .from("memberships")
      .select("organization:organizations(id, kind, status, address, location, usual_category)")
      .eq("user_id", userId)
      .maybeSingle(),
  );
  const organization = row?.organization;
  if (!organization) return null;
  const point = parseEwkbPoint(organization.location);
  return {
    organizationId: organization.id,
    kind: organization.kind,
    active: organization.status === "active",
    // "Gente que hace cosas" non ha una sede: il luogo si scrive ogni volta (docs/SPEC.md §5).
    address: organization.kind === "professional" ? null : organization.address,
    point: organization.kind === "professional" || !point ? null : { lng: point[0], lat: point[1] },
    usualCategory: organization.usual_category,
  };
}

const MY_EVENTS_LIMIT = 100;

/** "Mis eventos": gli eventi della propria organizzazione, prima i prossimi. `now` per decidere cosa è passato. */
export async function getMyEvents(organizationId: string, now: Date): Promise<MyEvent[]> {
  const supabase = await createSupabaseServerClient();
  const rows =
    unwrap(
      await supabase
        .from("events")
        .select("id, slug, title, starts_at, ends_at, recurrence, recurrence_until")
        .eq("owner_org", organizationId)
        .order("starts_at", { ascending: false })
        .limit(MY_EVENTS_LIMIT),
    ) ?? [];
  return rows
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      startsAt: toIso(row.starts_at),
      recurrence: row.recurrence,
      recurrenceUntil: row.recurrence_until,
      upcoming: isEventUpcoming({ endsAt: row.ends_at, recurrence: row.recurrence, recurrenceUntil: row.recurrence_until }, now),
    }))
    .sort((a, b) => Number(b.upcoming) - Number(a.upcoming) || (a.upcoming ? a.startsAt.localeCompare(b.startsAt) : 0));
}

/**
 * Un evento della propria organizzazione, con i valori per il modulo di modifica. Null se non esiste o se è di un'altra
 * organizzazione (la query filtra per owner_org, e la RLS lo ricontrolla): la pagina risponde 404.
 */
export async function getEventForEdit(eventId: string, organizationId: string, now: Date): Promise<EventForEdit | null> {
  const supabase = await createSupabaseServerClient();
  const row = unwrap(
    await supabase
      .from("events")
      .select(
        "id, slug, title, description, category, price_type, price_amount, starts_at, ends_at, recurrence, recurrence_until, venue_name, address, location",
      )
      .eq("id", eventId)
      .eq("owner_org", organizationId)
      .maybeSingle(),
  );
  if (!row) return null;
  const point = parseEwkbPoint(row.location);
  return {
    id: row.id,
    slug: row.slug,
    upcoming: isEventUpcoming({ endsAt: row.ends_at, recurrence: row.recurrence, recurrenceUntil: row.recurrence_until }, now),
    defaults: {
      values: {
        title: row.title,
        category: row.category,
        priceType: row.price_type,
        priceAmount: row.price_amount === null ? undefined : String(row.price_amount),
        date: getMadridDateKey(row.starts_at),
        startTime: formatMadridTime(row.starts_at),
        endTime: formatMadridTime(row.ends_at),
        recurrence: row.recurrence,
        recurrenceUntil: row.recurrence_until ?? undefined,
        address: row.address,
        venueName: row.venue_name ?? undefined,
        description: row.description ?? undefined,
      },
      point: point ? { lng: point[0], lat: point[1] } : null,
    },
  };
}
