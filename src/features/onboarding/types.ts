import type { EntityType } from "@/lib/domain/nif";

/** "¿Qué sois?": value in the URL (`/registro?tipo=…`) → entity_type. Mapping to `kind` lives only in SQL. */
export const REGISTRATION_TYPES = {
  asociacion: "association",
  fundacion: "foundation",
  cooperativa: "cooperative",
  "entidad-publica": "public_entity",
  "actividad-comercial": "commercial",
  gente: "informal",
} as const satisfies Record<string, EntityType>;

export type RegistrationTypeSlug = keyof typeof REGISTRATION_TYPES;

export const REGISTRATION_TYPE_SLUGS = Object.keys(REGISTRATION_TYPES) as RegistrationTypeSlug[];

/** Same values as the enum public.venue_activity (the action's typed RPC call fails to compile if they drift). */
export const VENUE_ACTIVITIES = [
  "libreria",
  "sala_pequena",
  "centro_cultural",
  "galeria",
  "taller_estudio",
  "cafe_cultural",
  "discoteca_club",
  "bar_nocturno",
  "otro",
] as const;

export type VenueActivity = (typeof VENUE_ACTIVITIES)[number];

/** Same values as the enum public.event_category. */
export const EVENT_CATEGORIES = ["musica", "teatro_danza", "arte", "talleres", "encuentros", "comunidad", "otros"] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

/** Registry lookups ("¿Sois …?") only make sense for the types the Comune lists. */
export const LOOKUP_ENTITY_TYPES = ["association", "foundation", "cooperative"] as const satisfies readonly EntityType[];

export type RegistrationField =
  | "nif"
  | "name"
  | "oneLiner"
  | "whatForWhom"
  | "howSustained"
  | "whatTheyOffer"
  | "venueActivity"
  | "whenToVisit"
  | "usualCategory"
  | "address"
  | "neighborhoodSlug"
  | "seekingOffering"
  | "contactEmail"
  | "contactPhone"
  | "contactUrl"
  | "accept";

export type FieldError =
  | "required"
  | "tooLong"
  | "invalidEmail"
  | "invalidUrl"
  | "invalidNif"
  | "personalNif"
  | "invalidOption"
  | "acceptRequired"
  | "addressNotFound"
  | "invalidLocation";

export type FormError = "robot" | "tooMany" | "alreadyClaimed" | "invalidInvite" | "generic";

export type FieldErrors = Partial<Record<RegistrationField, FieldError>>;

/** State of the registration form. `values` refill the fields after an error (React resets the form). */
export type RegistrationState = {
  attempt: number;
  formError: FormError | null;
  fieldErrors: FieldErrors;
  values: Partial<Record<RegistrationField, string>>;
};

export const INITIAL_REGISTRATION_STATE: RegistrationState = { attempt: 0, formError: null, fieldErrors: {}, values: {} };

export type LookupResult =
  | { status: "found"; name: string }
  | { status: "notFound" | "invalid" | "tooMany" | "error" };

export type GeocodeOutcome =
  | { ok: true; lng: number; lat: number; displayName: string }
  | { ok: false; error: "notFound" | "tooMany" | "invalid" | "generic" };

export type Option = { value: string; label: string };

export type TypeOption = { slug: RegistrationTypeSlug; label: string; description: string };

export type TypePickerTexts = { legend: string; submit: string };

/** Every text of the registration form, read on the server and passed as props. */
export type RegistrationFormTexts = {
  changeType: string;
  required: string;
  optional: string;
  submit: string;
  sending: string;
  noScript: string;
  sections: { identity: string; about: string; place: string; contact: string; legal: string };
  labels: Record<RegistrationField, string>;
  hints: Partial<Record<RegistrationField, string>>;
  choose: string;
  indexable: string;
  lookup: { button: string; checking: string; found: string; useName: string; notFound: string; failed: string };
  geocode: { button: string; searching: string; found: string; notFound: string; failed: string };
  legalLink: string;
  checkFields: string;
  fieldErrors: Record<FieldError, string>;
  formErrors: Record<FormError, string>;
};
