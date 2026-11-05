import { z } from "zod";
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

// Validation of the registration form, before the database. Same limits as the columns and as register_entity /
// create_professional: the database stays the final judge, this only gives clear messages early.
// Issue messages are FieldError codes; the page turns them into Spanish texts.

export function parseRegistrationTypeSlug(value: unknown): RegistrationTypeSlug | null {
  return REGISTRATION_TYPE_SLUGS.find((slug) => slug === value) ?? null;
}

export function parseRegistrationType(value: unknown): EntityType | null {
  const slug = parseRegistrationTypeSlug(value);
  return slug ? REGISTRATION_TYPES[slug] : null;
}

const asString = (value: unknown) => (typeof value === "string" ? value : "");

const requiredText = (max: number) =>
  z.preprocess(asString, z.string().trim().min(1, "required").max(max, "tooLong"));

const optionalText = (max: number) =>
  z.preprocess(asString, z.string().trim().max(max, "tooLong")).transform((value) => value || null);

const optionalEmail = optionalText(254).refine(
  (value) => value === null || z.email().safeParse(value).success,
  "invalidEmail",
);

/** Only http/https links from users (AGENTS.md). Same rule as the column check. */
export function isHttpUrl(value: string): boolean {
  if (/\s/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const optionalUrl = optionalText(500).refine((value) => value === null || isHttpUrl(value), "invalidUrl");

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess((value) => (value === "" || value === undefined ? null : value), z.enum(values, "invalidOption").nullable());

const coordinate = z.preprocess(
  (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : null),
  z.number().finite().nullable(),
);

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

/** Asociación, Fundación, Cooperativa, Entidad pública: NIF required, answers and address optional. */
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

/** Actividad comercial: NIF optional (company letters only), activity, two answers and address required. */
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

/** Gente que hace cosas: no NIF, no point; barrio from the list. */
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
    // lng/lat come from the map pin: a bad value is an address problem for the person.
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

/** NIF of a registry lookup: only for the types the Comune lists, and never a personal document. */
export const lookupSchema = z
  .object({ entityType: z.enum(LOOKUP_ENTITY_TYPES), nif: z.preprocess((value) => normalizeNif(asString(value)), z.string()) })
  .refine((value) => findNifProblem(value.entityType, value.nif) === null);

export const addressSchema = z.preprocess(asString, z.string().trim().min(3).max(200));

export type DbErrorOutcome =
  | { type: "field"; field: RegistrationField; error: FieldError }
  | { type: "form"; error: FormError }
  | { type: "alreadyMember" };

/** Errors raised by register_entity / create_professional (raise exception '<code>') → what the person sees. */
export function mapRegistrationDbError(message: string): DbErrorOutcome {
  switch (message) {
    case "already_member":
      return { type: "alreadyMember" };
    case "already_claimed":
      return { type: "form", error: "alreadyClaimed" };
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
