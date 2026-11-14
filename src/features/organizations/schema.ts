import { z } from "zod";
import {
  coordinate,
  optionalEmail,
  optionalEnum,
  optionalText,
  optionalUrl,
  requiredText,
} from "@/lib/domain/form-fields";
import { isInsideMadridRegion } from "@/lib/domain/geocode";
import { slugSchema } from "@/lib/domain/slug";
import {
  PROFILE_CATEGORIES,
  PROFILE_VENUE_ACTIVITIES,
  type OrganizationKind,
  type ProfileField,
  type ProfileFieldError,
  type ProfileFieldErrors,
  type ProfileFormError,
} from "./types";

// "Mi ficha" (docs/piani/sessione-7.md §3): gli stessi campi dell'iscrizione per tipo, più "Nuestra historia" e (per
// "Gente que hace cosas") "Mostrar mi perfil en Google". NIF ed entity_type non ci sono: non si modificano.
// Stessi limiti delle colonne: il database resta l'arbitro (vincoli, trigger dello slug, RLS).

const contacts = {
  contactEmail: optionalEmail,
  contactPhone: optionalText(30),
  contactUrl: optionalUrl,
};

const place = {
  oneLiner: optionalText(120),
  whenToVisit: optionalText(120),
  usualCategory: optionalEnum(PROFILE_CATEGORIES),
  lng: coordinate,
  lat: coordinate,
  story: optionalText(1000),
};

/** Associazione, fondazione, cooperativa, ente pubblico (kind "association"). */
const associationSchema = z.object({
  name: requiredText(120),
  ...place,
  ...contacts,
  address: optionalText(200),
  whatForWhom: optionalText(500),
  howSustained: optionalText(500),
});

/** Espacio (kind "venue"): attività, indirizzo e le due risposte obbligatori, come nell'iscrizione. */
const venueSchema = z.object({
  name: requiredText(120),
  ...place,
  ...contacts,
  venueActivity: z.preprocess((value) => (value === "" ? undefined : value), z.enum(PROFILE_VENUE_ACTIVITIES, "required")),
  address: requiredText(200),
  whatForWhom: requiredText(500),
  whatTheyOffer: requiredText(500),
});

/** "Gente que hace cosas": niente indirizzo né punto né storia; barrio dall'elenco; scelta su Google. */
const professionalSchema = z.object({
  name: requiredText(120),
  oneLiner: requiredText(120),
  ...contacts,
  neighborhoodSlug: z.preprocess((value) => (value === "" || value === undefined ? null : value), slugSchema.nullable()),
  seekingOffering: optionalText(200),
  indexable: z.preprocess((value) => value === "on", z.boolean()),
});

export type ProfileInput =
  | ({ kind: "association" } & z.infer<typeof associationSchema>)
  | ({ kind: "venue" } & z.infer<typeof venueSchema>)
  | ({ kind: "professional" } & z.infer<typeof professionalSchema>);

const FIELD_ERRORS = new Set<string>(["required", "tooLong", "invalidEmail", "invalidUrl", "invalidOption"]);
const FIELDS = new Set<string>([
  "name",
  "oneLiner",
  "whenToVisit",
  "usualCategory",
  "venueActivity",
  "address",
  "neighborhoodSlug",
  "seekingOffering",
  "whatForWhom",
  "howSustained",
  "whatTheyOffer",
  "contactEmail",
  "contactPhone",
  "contactUrl",
  "story",
  "indexable",
]);

function toFieldErrors(issues: z.core.$ZodIssue[]): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "");
    // lng/lat vengono dal pin: un valore sbagliato, per la persona, è un problema dell'indirizzo.
    const target = field === "lng" || field === "lat" ? "address" : field;
    if (!FIELDS.has(target)) continue;
    const code = FIELD_ERRORS.has(issue.message) ? (issue.message as ProfileFieldError) : "invalidOption";
    errors[target as ProfileField] ??= code;
  }
  return errors;
}

export type ProfileParseResult = { ok: true; value: ProfileInput } | { ok: false; fieldErrors: ProfileFieldErrors };

/** Modulo Mi ficha → dati per il database, secondo il tipo dell'organizzazione (letto dal database, mai dal modulo). */
export function parseProfileForm(kind: OrganizationKind, raw: Record<string, unknown>): ProfileParseResult {
  if (kind === "professional") {
    const parsed = professionalSchema.safeParse(raw);
    return parsed.success
      ? { ok: true, value: { kind, ...parsed.data } }
      : { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };
  }
  if (kind === "venue") {
    const parsed = venueSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };
    return isValidPin(parsed.data) ? { ok: true, value: { kind, ...parsed.data } } : PIN_ERROR;
  }
  const parsed = associationSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };
  return isValidPin(parsed.data) ? { ok: true, value: { kind: "association", ...parsed.data } } : PIN_ERROR;
}

const PIN_ERROR: ProfileParseResult = { ok: false, fieldErrors: { address: "invalidLocation" } };

/** Pin: tutti e due o nessuno, e dentro la Comunidad de Madrid (come private.make_org_point). */
function isValidPin({ lng, lat }: { lng: number | null; lat: number | null }): boolean {
  if (lng === null && lat === null) return true;
  return lng !== null && lat !== null && isInsideMadridRegion(lng, lat);
}

export type ProfileDbErrorOutcome =
  | { type: "field"; field: ProfileField; error: ProfileFieldError }
  | { type: "form"; error: ProfileFormError };

/** Errori del database sul salvataggio della scheda → ciò che la persona vede. */
export function mapProfileDbError(error: { message: string; code?: string }): ProfileDbErrorOutcome {
  // Il trigger dello slug: troppi cambi di nome in 30 giorni.
  if (error.message === "rate_limited") return { type: "form", error: "tooManyRenames" };
  if (error.message.includes("organizations_contact_email_format")) {
    return { type: "field", field: "contactEmail", error: "invalidEmail" };
  }
  if (error.message.includes("contact_url")) return { type: "field", field: "contactUrl", error: "invalidUrl" };
  if (error.code === "42501") return { type: "form", error: "notAllowed" };
  return { type: "form", error: "generic" };
}

/** Campi che si rimandano indietro dopo un errore (React azzera il modulo dopo un'action). */
export const PROFILE_REFILL_FIELDS: ProfileField[] = [
  "name",
  "oneLiner",
  "whenToVisit",
  "usualCategory",
  "venueActivity",
  "address",
  "neighborhoodSlug",
  "seekingOffering",
  "whatForWhom",
  "howSustained",
  "whatTheyOffer",
  "contactEmail",
  "contactPhone",
  "contactUrl",
  "story",
  "indexable",
];
