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

// Modulo "Nuevo evento" (sessione 6) ------------------------------------------------

export const EVENT_CATEGORY_VALUES = [
  "musica",
  "teatro_danza",
  "arte",
  "talleres",
  "encuentros",
  "comunidad",
  "otros",
] as const satisfies readonly EventCategory[];
export const PRICE_TYPE_VALUES = ["free", "donation", "paid"] as const satisfies readonly PriceType[];
export const RECURRENCE_VALUES = ["none", "weekly", "monthly"] as const satisfies readonly Recurrence[];

export type EventField =
  | "title"
  | "category"
  | "priceType"
  | "priceAmount"
  | "date"
  | "startTime"
  | "endTime"
  | "recurrence"
  | "recurrenceUntil"
  | "address"
  | "venueName"
  | "description";

export type EventFieldError =
  | "required"
  | "tooLong"
  | "invalidOption"
  | "invalidPrice"
  | "invalidDate"
  | "invalidTime"
  | "nonexistentTime"
  | "tooLongDuration"
  | "sameTime"
  | "inPast"
  | "invalidRecurrenceUntil"
  | "addressNotFound"
  | "invalidLocation";

export type EventFormError = "tooMany" | "notAllowed" | "generic";

export type EventFieldErrors = Partial<Record<EventField, EventFieldError>>;

/** Stato del modulo. `values` riempie di nuovo i campi dopo un errore (React azzera il modulo dopo un'action). */
export type EventFormState = {
  attempt: number;
  formError: EventFormError | null;
  fieldErrors: EventFieldErrors;
  values: Partial<Record<EventField, string>>;
};

export const INITIAL_EVENT_FORM_STATE: EventFormState = { attempt: 0, formError: null, fieldErrors: {}, values: {} };

/** L'organizzazione che pubblica, con ciò che serve a precompilare il modulo. */
export type EventOwner = {
  organizationId: string;
  kind: OrganizationKind;
  active: boolean;
  address: string | null;
  point: { lng: number; lat: number } | null;
  usualCategory: EventCategory | null;
};

/** Valori iniziali del modulo, calcolati sul server: per un evento nuovo oggi, sede e categoria abituale; per una
 * modifica i valori salvati (ore già convertite in ora di Madrid). */
export type EventFormDefaults = {
  values: Partial<Record<EventField, string>>;
  point: { lng: number; lat: number } | null;
};

/** Un evento della propria organizzazione da modificare in /panel/eventos/[id]. */
export type EventForEdit = {
  id: string;
  slug: string;
  /** false = già finito (per una serie: l'ultimo giorno è passato): non si modifica più. */
  upcoming: boolean;
  defaults: EventFormDefaults;
};

export type Option = { value: string; label: string };

/** Tutti i testi del modulo, letti sul server e passati come props. */
export type EventFormTexts = {
  sections: { what: string; when: string; where: string; more: string };
  labels: Record<EventField, string>;
  hints: Partial<Record<EventField, string>>;
  required: string;
  optional: string;
  choose: string;
  priceTypes: Record<PriceType, string>;
  recurrences: Record<Recurrence, string>;
  geocode: { button: string; searching: string; found: string; notFound: string; failed: string };
  submit: string;
  sending: string;
  checkFields: string;
  fieldErrors: Record<EventFieldError, string>;
  formErrors: Record<EventFormError, string>;
};

/** Un evento della propria organizzazione in /panel ("Mis eventos"). */
export type MyEvent = {
  id: string;
  slug: string;
  title: string;
  startsAt: string;
  recurrence: Recurrence;
  /** Ultimo giorno della serie (solo per gli eventi che si ripetono). */
  recurrenceUntil: string | null;
  /** Non ancora finito (per una serie: l'ultimo giorno non è passato). */
  upcoming: boolean;
};
