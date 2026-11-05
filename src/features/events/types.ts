// DTO del blocco events. Riprendono gli enum del database senza importarne i tipi generati.

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

/** Tutto ciò che mostra la pagina evento. Gli orari sono istanti ISO; si mostrano con src/lib/dates.ts. */
export type EventPage = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: EventCategory;
  priceType: PriceType;
  priceAmount: number | null;
  recurrence: Recurrence;
  /** Prossima occorrenza non finita; l'ultima se l'evento è finito. */
  startsAt: string;
  endsAt: string;
  /** Fine dell'ultima occorrenza: decide l'indicizzazione e il redirect dopo 7 giorni. */
  lastEndsAt: string;
  venueName: string | null;
  address: string;
  lng: number;
  lat: number;
  neighborhood: { slug: string; name: string } | null;
  /** Prima il titolare. */
  organizers: EventOrganizer[];
};

/** Cosa mostra la pagina evento: l'evento, un redirect permanente 7 giorni dopo la fine, oppure un 404. */
export type EventPageResult =
  | { status: "found"; event: EventPage; indexable: boolean }
  | { status: "redirect"; organizerSlug: string }
  | { status: "missing" };

/** Una prossima occorrenza in un elenco (scheda dell'organizzazione, pagina del barrio). */
export type UpcomingEvent = {
  key: string; // id dell'evento + inizio dell'occorrenza
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
