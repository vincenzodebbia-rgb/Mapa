// DTO del blocco organizations. Riprendono gli enum del database senza importarne i tipi generati.

export type OrganizationKind = "association" | "venue" | "professional";

/** La scheda pubblica /a/[slug] (docs/SPEC.md §7). Solo ciò che l'organizzazione ha scelto di rendere pubblico. */
export type OrganizationProfile = {
  id: string;
  slug: string;
  kind: OrganizationKind;
  name: string;
  oneLiner: string | null;
  whenToVisit: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  /** Già controllato: solo http/https. */
  contactUrl: string | null;
  /** Mai per "Gente que hace cosas" (professional). */
  address: string | null;
  neighborhood: { slug: string; name: string } | null;
  story: string | null;
  /** URL pubblico assoluto del logo WebP nello Storage, oppure null. */
  logoUrl: string | null;
  /** false solo per i professionisti che hanno spento "Mostrar mi perfil en Google". */
  indexable: boolean;
};

/** Una scheda indicizzabile nella sitemap. */
export type OrganizationSitemapEntry = { slug: string; updatedAt: string };

/** Un'organizzazione in un elenco (pagina del barrio). */
export type OrganizationSummary = {
  slug: string;
  kind: OrganizationKind;
  name: string;
  oneLiner: string | null;
};

/** L'organizzazione che gestisce l'utente con accesso (panel privato). */
export type MyOrganization = { slug: string; name: string; status: "active" | "suspended" };

// Mi ficha (sessione 7) -----------------------------------------------------------------------

/** Stessi valori degli enum public.event_category e public.venue_activity. */
export const PROFILE_CATEGORIES = [
  "musica",
  "teatro_danza",
  "arte",
  "talleres",
  "encuentros",
  "comunidad",
  "otros",
] as const;
export const PROFILE_VENUE_ACTIVITIES = [
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

export type ProfileField =
  | "name"
  | "oneLiner"
  | "whenToVisit"
  | "usualCategory"
  | "venueActivity"
  | "address"
  | "neighborhoodSlug"
  | "seekingOffering"
  | "whatForWhom"
  | "howSustained"
  | "whatTheyOffer"
  | "contactEmail"
  | "contactPhone"
  | "contactUrl"
  | "story"
  | "indexable";

export type ProfileFieldError =
  | "required"
  | "tooLong"
  | "invalidEmail"
  | "invalidUrl"
  | "invalidOption"
  | "addressNotFound"
  | "invalidLocation";

export type ProfileFormError = "tooMany" | "tooManyRenames" | "notAllowed" | "generic";

export type ProfileFieldErrors = Partial<Record<ProfileField, ProfileFieldError>>;

export type ProfileFormState = {
  attempt: number;
  formError: ProfileFormError | null;
  fieldErrors: ProfileFieldErrors;
  values: Partial<Record<ProfileField, string>>;
};

export const INITIAL_PROFILE_FORM_STATE: ProfileFormState = { attempt: 0, formError: null, fieldErrors: {}, values: {} };

/**
 * La scheda della propria organizzazione per "Mi ficha", letta come l'utente. `values` sono già nel formato dei campi
 * del modulo (testo). NIF ed entity_type non ci sono: non si modificano.
 */
export type ProfileForEdit = {
  organizationId: string;
  slug: string;
  kind: OrganizationKind;
  active: boolean;
  values: Partial<Record<ProfileField, string>>;
  point: { lng: number; lat: number } | null;
};

export type ProfileOption = { value: string; label: string };

/** Tutti i testi del modulo Mi ficha, letti sul server e passati come props. */
export type ProfileFormTexts = {
  sections: { identity: string; about: string; place: string; contact: string; story: string; google: string };
  contactIntro: string;
  labels: Record<ProfileField, string>;
  hints: Partial<Record<ProfileField, string>>;
  required: string;
  optional: string;
  choose: string;
  geocode: { button: string; searching: string; found: string; notFound: string; failed: string };
  submit: string;
  sending: string;
  checkFields: string;
  fieldErrors: Record<ProfileFieldError, string>;
  formErrors: Record<ProfileFormError, string>;
};
