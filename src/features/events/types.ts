// DTOs of the events block. They mirror the enums of the database without importing its generated types.

export type OrganizationKind = "association" | "venue" | "professional";
export type EventCategory = "musica" | "teatro_danza" | "arte" | "talleres" | "encuentros" | "comunidad" | "otros";
export type PriceType = "free" | "donation" | "paid";
export type Recurrence = "none" | "weekly" | "monthly";

export type EventOrganizer = {
  slug: string;
  name: string;
  kind: OrganizationKind;
  isOwner: boolean;
};

/** Everything the event page shows. Times are ISO instants; display them with src/lib/dates.ts. */
export type EventPage = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: EventCategory;
  priceType: PriceType;
  priceAmount: number | null;
  recurrence: Recurrence;
  /** Next occurrence that has not ended; the last one if the event is over. */
  startsAt: string;
  endsAt: string;
  /** End of the last occurrence: drives indexing and the 7-day redirect. */
  lastEndsAt: string;
  venueName: string | null;
  address: string;
  lng: number;
  lat: number;
  neighborhood: { slug: string; name: string } | null;
  /** Owner first. */
  organizers: EventOrganizer[];
};

/** One upcoming occurrence in a list (organization profile, neighborhood page). */
export type UpcomingEvent = {
  key: string; // event id + occurrence start
  slug: string;
  title: string;
  category: EventCategory;
  priceType: PriceType;
  priceAmount: number | null;
  startsAt: string;
  endsAt: string;
  venueName: string | null;
  address: string | null;
  organizerNames: string;
};
