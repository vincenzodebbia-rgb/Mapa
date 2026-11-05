"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { ORGANIZATIONS_TAG } from "@/lib/cache-tags";
import { isInsideMadridRegion } from "@/lib/domain/geocode";
import { geocodeAddress } from "@/lib/geocode";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal-versions";
import { getConnectionKey, getHashedKey, isWithinRateLimit } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { hasOrganization } from "./data";
import { addressSchema, lookupSchema, mapRegistrationDbError, parseRegistration, parseRegistrationType } from "./schema";
import type { FieldErrors, GeocodeOutcome, LookupResult, RegistrationField, RegistrationState } from "./types";

const REGISTRATIONS_PER_USER_PER_HOUR = 5;
// DATA_MODEL: max 10 lookups a day per connection, against NIF enumeration of the registry.
const LOOKUPS_PER_CONNECTION_PER_DAY = 10;
const GEOCODES_PER_USER_PER_HOUR = 30;

const REFILL_FIELDS: RegistrationField[] = [
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
];

function readValues(formData: FormData): RegistrationState["values"] {
  const values: RegistrationState["values"] = {};
  for (const field of REFILL_FIELDS) {
    const value = formData.get(field);
    if (typeof value === "string" && value !== "") values[field] = value.slice(0, 600);
  }
  return values;
}

type Point = { lng: number; lat: number } | null;

/**
 * The point of the place: the pin if it came from the map (it must be inside the Comunidad de Madrid), otherwise
 * the address geocoded here, so the form also works without JavaScript. Unknown address: no point.
 */
async function resolvePoint(address: string | null, lng: number | null, lat: number | null): Promise<Point | "outside"> {
  if (lng !== null && lat !== null) return isInsideMadridRegion(lng, lat) ? { lng, lat } : "outside";
  if (!address) return null;
  const result = await geocodeAddress(address);
  return result ? { lng: result.lng, lat: result.lat } : null;
}

/** "¿Qué sois?" form. Order: zod → user without organization → Turnstile → rate limit → one SQL call. */
export async function registerOrganization(previous: RegistrationState, formData: FormData): Promise<RegistrationState> {
  const attempt = previous.attempt + 1;
  const values = readValues(formData);
  const fail = (patch: Partial<Pick<RegistrationState, "formError" | "fieldErrors">>): RegistrationState => ({
    attempt,
    values,
    formError: patch.formError ?? null,
    fieldErrors: patch.fieldErrors ?? {},
  });

  const entityType = parseRegistrationType(formData.get("tipo"));
  if (!entityType) return fail({ formError: "generic" });
  const parsed = parseRegistration(entityType, Object.fromEntries(formData));
  if (!parsed.ok) return fail({ fieldErrors: parsed.fieldErrors });

  const userId = await getCurrentUserId();
  if (!userId) redirect("/entrar");
  if (await hasOrganization(userId)) redirect("/panel");

  if (!(await verifyTurnstileToken(formData.get("cf-turnstile-response")))) return fail({ formError: "robot" });

  let point: Point | "outside";
  try {
    if (!(await isWithinRateLimit(getHashedKey("register", userId), REGISTRATIONS_PER_USER_PER_HOUR, "1 hour"))) {
      return fail({ formError: "tooMany" });
    }
    point =
      parsed.value.kind === "informal"
        ? null
        : await resolvePoint(parsed.value.data.address, parsed.value.data.lng, parsed.value.data.lat);
  } catch {
    return fail({ formError: "generic" });
  }
  if (point === "outside") return fail({ fieldErrors: { address: "invalidLocation" } });
  if (parsed.value.kind === "commercial" && point === null) return fail({ fieldErrors: { address: "addressNotFound" } });

  const supabase = await createSupabaseServerClient();
  const terms = { p_terms_version: TERMS_VERSION, p_privacy_version: PRIVACY_VERSION, p_age_confirmed: true };
  // Invites (/invitacion/[token]) arrive with session 7: until then no token is sent.
  const { error } =
    parsed.value.kind === "informal"
      ? await supabase.rpc("create_professional", {
          ...terms,
          p_name: parsed.value.data.name,
          p_one_liner: parsed.value.data.oneLiner,
          p_neighborhood_slug: parsed.value.data.neighborhoodSlug ?? undefined,
          p_contact_email: parsed.value.data.contactEmail ?? undefined,
          p_contact_phone: parsed.value.data.contactPhone ?? undefined,
          p_contact_url: parsed.value.data.contactUrl ?? undefined,
          p_seeking_offering: parsed.value.data.seekingOffering ?? undefined,
          p_indexable: parsed.value.data.indexable,
        })
      : await supabase.rpc("register_entity", {
          ...terms,
          p_entity_type: parsed.value.kind === "commercial" ? "commercial" : parsed.value.entityType,
          p_nif: parsed.value.data.nif,
          p_name: parsed.value.data.name,
          p_venue_activity: parsed.value.kind === "commercial" ? parsed.value.data.venueActivity : undefined,
          p_what_for_whom: parsed.value.data.whatForWhom ?? undefined,
          p_how_sustained: parsed.value.kind === "entity" ? (parsed.value.data.howSustained ?? undefined) : undefined,
          p_what_they_offer: parsed.value.kind === "commercial" ? parsed.value.data.whatTheyOffer : undefined,
          p_one_liner: parsed.value.data.oneLiner ?? undefined,
          p_when_to_visit: parsed.value.data.whenToVisit ?? undefined,
          p_usual_category: parsed.value.data.usualCategory ?? undefined,
          p_contact_email: parsed.value.data.contactEmail ?? undefined,
          p_contact_phone: parsed.value.data.contactPhone ?? undefined,
          p_contact_url: parsed.value.data.contactUrl ?? undefined,
          p_address: parsed.value.data.address ?? undefined,
          p_lng: point?.lng,
          p_lat: point?.lat,
        });

  if (error) {
    const outcome = mapRegistrationDbError(error.message);
    if (outcome.type === "alreadyMember") redirect("/panel");
    // Only the code: never the NIF or the contact data.
    if (outcome.type === "form" && outcome.error === "generic") console.warn("Registration failed:", error.code);
    if (outcome.type === "field") {
      const fieldErrors: FieldErrors = { [outcome.field]: outcome.error };
      return fail({ fieldErrors });
    }
    return fail({ formError: outcome.error });
  }

  updateTag(ORGANIZATIONS_TAG);
  redirect("/panel");
}

/** "¿Sois <nombre>?": official name from the Comune list. Logged-in users only, 10 a day per connection. */
export async function lookupAssociation(entityType: string, nif: string): Promise<LookupResult> {
  const parsed = lookupSchema.safeParse({ entityType, nif });
  if (!parsed.success) return { status: "invalid" };
  if (!(await getCurrentUserId())) return { status: "error" };
  try {
    if (!(await isWithinRateLimit(await getConnectionKey("registry-lookup"), LOOKUPS_PER_CONNECTION_PER_DAY, "1 day"))) {
      return { status: "tooMany" };
    }
    // lookup_municipal_association is service_role only (anti-enumeration): it returns only found + name.
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("lookup_municipal_association", { p_nif: parsed.data.nif });
    if (error) return { status: "error" };
    const row = data?.[0];
    return row?.found && row.name ? { status: "found", name: row.name } : { status: "notFound" };
  } catch {
    return { status: "error" };
  }
}

/** Address → point for the pin. Logged-in users only, with a limit (Nominatim is a shared, free service). */
export async function locateAddress(address: string): Promise<GeocodeOutcome> {
  const parsed = addressSchema.safeParse(address);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "generic" };
  try {
    if (!(await isWithinRateLimit(getHashedKey("geocode", userId), GEOCODES_PER_USER_PER_HOUR, "1 hour"))) {
      return { ok: false, error: "tooMany" };
    }
    const result = await geocodeAddress(parsed.data);
    return result ? { ok: true, ...result } : { ok: false, error: "notFound" };
  } catch {
    return { ok: false, error: "generic" };
  }
}
