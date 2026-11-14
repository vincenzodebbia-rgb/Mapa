import { z } from "zod";
import {
  asString,
  coordinate,
  optionalEmail,
  optionalEnum,
  optionalText,
  optionalUrl,
  requiredText,
} from "@/lib/domain/form-fields";
import { findNifProblem, normalizeNif, type EntityType } from "@/lib/domain/nif";
import { slugSchema } from "@/lib/domain/slug";
import {
  EVENT_CATEGORIES,
  LOOKUP_ENTITY_TYPES,
  REGISTRATION_TYPE_SLUGS,
  REGISTRATION_TYPES,
  VENUE_ACTIVITIES,
  type FieldError,
  type FieldErrors,
  type FormError,
  type RegistrationField,
  type RegistrationTypeSlug,
} from "./types";

// Validazione del modulo d'iscrizione, prima del database. Stessi limiti delle colonne e di register_entity /
// create_professional: il database resta l'arbitro finale, qui si danno solo messaggi chiari prima.
// I messaggi degli errori sono codici FieldError; la pagina li trasforma in testi spagnoli.

export function parseRegistrationTypeSlug(value: unknown): RegistrationTypeSlug | null {
  return REGISTRATION_TYPE_SLUGS.find((slug) => slug === value) ?? null;
}

export function parseRegistrationType(value: unknown): EntityType | null {
  const slug = parseRegistrationTypeSlug(value);
  return slug ? REGISTRATION_TYPES[slug] : null;
}

const nif = z.preprocess((value) => normalizeNif(asString(value)), z.string().max(20, "invalidNif"));

const common = {
  name: requiredText(120),
  contactEmail: optionalEmail,
  contactPhone: optionalText(30),
  contactUrl: optionalUrl,
  accept: z.literal("on", "acceptRequired"),
};

const placeFields = {
  oneLiner: optionalText(120),
  whenToVisit: optionalText(120),
  usualCategory: optionalEnum(EVENT_CATEGORIES),
  lng: coordinate,
  lat: coordinate,
};

function checkNif(entityType: EntityType, required: boolean) {
  return (data: { nif: string }, context: z.RefinementCtx) => {
    if (data.nif === "") {
      if (required) context.addIssue({ code: "custom", path: ["nif"], message: "required" });
      return;
    }
    const problem = findNifProblem(entityType, data.nif);
    if (problem) context.addIssue({ code: "custom", path: ["nif"], message: problem === "personal_nif" ? "personalNif" : "invalidNif" });
  };
}

/** Asociación, Fundación, Cooperativa, Entidad pública: NIF obbligatorio, risposte e indirizzo facoltativi. */
export function entitySchema(entityType: EntityType) {
  return z
    .object({
      ...common,
      ...placeFields,
      nif,
      whatForWhom: optionalText(500),
      howSustained: optionalText(500),
      address: optionalText(200),
    })
    .superRefine(checkNif(entityType, true));
}

/** Actividad comercial: NIF facoltativo (solo lettere d'impresa); attività, due risposte e indirizzo obbligatori. */
export const commercialSchema = z
  .object({
    ...common,
    ...placeFields,
    nif,
    venueActivity: z.preprocess((value) => (value === "" ? undefined : value), z.enum(VENUE_ACTIVITIES, "required")),
    whatForWhom: requiredText(500),
    whatTheyOffer: requiredText(500),
    address: requiredText(200),
  })
  .superRefine(checkNif("commercial", false));

/** Gente que hace cosas: niente NIF, niente punto; barrio dall'elenco. */
export const informalSchema = z.object({
  ...common,
  oneLiner: requiredText(120),
  neighborhoodSlug: z.preprocess((value) => (value === "" || value === undefined ? null : value), slugSchema.nullable()),
  seekingOffering: optionalText(200),
  indexable: z.preprocess((value) => value === "on", z.boolean()),
});

export type EntityRegistration = z.infer<ReturnType<typeof entitySchema>>;
export type CommercialRegistration = z.infer<typeof commercialSchema>;
export type InformalRegistration = z.infer<typeof informalSchema>;

export type ParsedRegistration =
  | { kind: "entity"; entityType: EntityType; data: EntityRegistration }
  | { kind: "commercial"; data: CommercialRegistration }
  | { kind: "informal"; data: InformalRegistration };

const FIELD_ERRORS = new Set<string>([
  "required",
  "tooLong",
  "invalidEmail",
  "invalidUrl",
  "invalidNif",
  "personalNif",
  "invalidOption",
  "acceptRequired",
  "addressNotFound",
  "invalidLocation",
]);

const FIELDS = new Set<string>([
  "nif",
  "name",
  "oneLiner",
  "whatForWhom",
  "howSustained",
  "whatTheyOffer",
  "venueActivity",
  "whenToVisit",
  "usualCategory",
  "address",
  "neighborhoodSlug",
  "seekingOffering",
  "contactEmail",
  "contactPhone",
  "contactUrl",
  "accept",
]);

function toFieldErrors(issues: z.core.$ZodIssue[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "");
    // lng/lat vengono dal pin della mappa: un valore sbagliato, per la persona, è un problema dell'indirizzo.
    const target = field === "lng" || field === "lat" ? "address" : field;
    if (!FIELDS.has(target)) continue;
    const code = FIELD_ERRORS.has(issue.message) ? (issue.message as FieldError) : "invalidOption";
    errors[target as RegistrationField] ??= code;
  }
  return errors;
}

export function parseRegistration(
  entityType: EntityType,
  raw: Record<string, unknown>,
): { ok: true; value: ParsedRegistration } | { ok: false; fieldErrors: FieldErrors } {
  if (entityType === "informal") {
    const parsed = informalSchema.safeParse(raw);
    return parsed.success ? { ok: true, value: { kind: "informal", data: parsed.data } } : { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };
  }
  if (entityType === "commercial") {
    const parsed = commercialSchema.safeParse(raw);
    return parsed.success ? { ok: true, value: { kind: "commercial", data: parsed.data } } : { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };
  }
  const parsed = entitySchema(entityType).safeParse(raw);
  return parsed.success
    ? { ok: true, value: { kind: "entity", entityType, data: parsed.data } }
    : { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };
}

/** NIF di una ricerca nell'elenco: solo per i tipi che il Comune elenca, e mai un documento personale. */
export const lookupSchema = z
  .object({ entityType: z.enum(LOOKUP_ENTITY_TYPES), nif: z.preprocess((value) => normalizeNif(asString(value)), z.string()) })
  .refine((value) => findNifProblem(value.entityType, value.nif) === null);


export type DbErrorOutcome =
  | { type: "field"; field: RegistrationField; error: FieldError }
  | { type: "form"; error: FormError }
  | { type: "alreadyMember" };

/** Errori di register_entity / create_professional (raise exception '<codice>') → ciò che la persona vede. */
export function mapRegistrationDbError(message: string): DbErrorOutcome {
  switch (message) {
    case "already_member":
      return { type: "alreadyMember" };
    case "already_claimed":
      return { type: "form", error: "alreadyClaimed" };
    // Tetto delle nuove organizzazioni nel database (M5).
    case "rate_limited":
      return { type: "form", error: "tooMany" };
    case "personal_nif":
      return { type: "field", field: "nif", error: "personalNif" };
    case "invalid_nif":
      return { type: "field", field: "nif", error: "invalidNif" };
    case "nif_required":
      return { type: "field", field: "nif", error: "required" };
    case "invalid_name":
      return { type: "field", field: "name", error: "required" };
    case "invalid_one_liner":
      return { type: "field", field: "oneLiner", error: "tooLong" };
    case "venue_activity_required":
      return { type: "field", field: "venueActivity", error: "required" };
    case "answers_required":
      return { type: "field", field: "whatForWhom", error: "required" };
    case "answer_too_long":
      return { type: "field", field: "whatForWhom", error: "tooLong" };
    case "address_required":
      return { type: "field", field: "address", error: "addressNotFound" };
    case "invalid_location":
      return { type: "field", field: "address", error: "invalidLocation" };
    case "invalid_neighborhood":
      return { type: "field", field: "neighborhoodSlug", error: "invalidOption" };
    case "terms_required":
      return { type: "field", field: "accept", error: "acceptRequired" };
    case "invalid_invite":
      return { type: "form", error: "invalidInvite" };
    default:
      return { type: "form", error: "generic" };
  }
}
