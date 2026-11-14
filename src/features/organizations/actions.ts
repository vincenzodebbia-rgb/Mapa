"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { LocateOutcome } from "@/components/ui/address-field";
import { EVENTS_TAG, ORGANIZATIONS_TAG } from "@/lib/cache-tags";
import { addressSchema } from "@/lib/domain/address";
import { geocodeAddress } from "@/lib/geocode";
import { getHashedKey, getIdKey, isWithinRateLimit } from "@/lib/rate-limit";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfileForEdit } from "./data";
import { mapProfileDbError, parseProfileForm, PROFILE_REFILL_FIELDS } from "./schema";
import type { ProfileFieldErrors, ProfileFormState } from "./types";

// Limiti: 30 salvataggi della scheda all'ora per organizzazione; 30 ricerche di indirizzi all'ora per utente (stessa
// chiave dell'iscrizione e degli eventi). I cambi di nome hanno in più il limite del database (5 ogni 30 giorni).
const SAVES_PER_ORGANIZATION_PER_HOUR = 30;
const GEOCODES_PER_USER_PER_HOUR = 30;

function readValues(formData: FormData): ProfileFormState["values"] {
  const values: ProfileFormState["values"] = {};
  for (const field of PROFILE_REFILL_FIELDS) {
    const value = formData.get(field);
    if (typeof value === "string" && value !== "") values[field] = value.slice(0, 1100);
  }
  return values;
}

/**
 * "Guardar" di Mi ficha. Ordine di AGENTS.md: zod (secondo il tipo letto dal database, mai dal modulo) → utente +
 * membership della propria organizzazione, attiva → limite → punto (pin o geocodifica) → update con il client
 * dell'utente (la RLS e i grant per colonna fanno da arbitri: NIF ed entity_type non si toccano) → updateTag → redirect.
 * Se cambia il nome cambia anche lo slug (trigger del database); il vecchio rimanda al nuovo.
 */
export async function updateProfile(previous: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const attempt = previous.attempt + 1;
  const values = readValues(formData);
  const fail = (patch: { formError?: ProfileFormState["formError"]; fieldErrors?: ProfileFieldErrors }): ProfileFormState => ({
    attempt,
    values,
    formError: patch.formError ?? null,
    fieldErrors: patch.fieldErrors ?? {},
  });

  const userId = await getCurrentUserId();
  if (!userId) redirect("/entrar");
  const profile = await getProfileForEdit(userId);
  if (!profile) redirect("/registro");
  if (!profile.active) return fail({ formError: "notAllowed" });

  const parsed = parseProfileForm(profile.kind, Object.fromEntries(formData));
  if (!parsed.ok) return fail({ fieldErrors: parsed.fieldErrors });
  const input = parsed.value;

  let point: { lng: number; lat: number } | null = null;
  try {
    if (!(await isWithinRateLimit(getIdKey("profile", profile.organizationId), SAVES_PER_ORGANIZATION_PER_HOUR, "1 hour"))) {
      return fail({ formError: "tooMany" });
    }
    if (input.kind !== "professional" && input.address) {
      // Il pin del modulo (anche quello della sede già salvata); senza pin, l'indirizzo geocodificato qui.
      point = input.lng !== null && input.lat !== null ? { lng: input.lng, lat: input.lat } : null;
      if (!point) {
        const result = await geocodeAddress(input.address);
        point = result ? { lng: result.lng, lat: result.lat } : null;
      }
      // Gli espacios hanno sempre un punto (docs/SPEC.md §7); un'associazione può avere un indirizzo senza punto.
      if (!point && input.kind === "venue") return fail({ fieldErrors: { address: "addressNotFound" } });
    }
  } catch {
    return fail({ formError: "generic" });
  }

  // Una sola chiamata: scheda e risposte private si salvano insieme o per niente (update_my_profile, security invoker:
  // valgono le policy dell'utente, anche il blocco delle sospese). Un campo vuoto si omette (undefined = null nel database).
  const value = <T>(field: T | null | undefined) => field ?? undefined;
  const contacts = {
    p_contact_email: value(input.contactEmail),
    p_contact_phone: value(input.contactPhone),
    p_contact_url: value(input.contactUrl),
  };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc(
    "update_my_profile",
    input.kind === "professional"
      ? {
          p_name: input.name,
          p_one_liner: input.oneLiner,
          p_neighborhood_slug: value(input.neighborhoodSlug),
          p_seeking_offering: value(input.seekingOffering),
          p_indexable: input.indexable,
          ...contacts,
        }
      : {
          p_name: input.name,
          p_one_liner: value(input.oneLiner),
          p_when_to_visit: value(input.whenToVisit),
          p_usual_category: value(input.usualCategory),
          p_venue_activity: input.kind === "venue" ? input.venueActivity : undefined,
          p_address: value(input.address),
          p_lng: point?.lng,
          p_lat: point?.lat,
          p_story: value(input.story),
          p_what_for_whom: value(input.whatForWhom),
          p_how_sustained: input.kind === "association" ? value(input.howSustained) : undefined,
          p_what_they_offer: input.kind === "venue" ? input.whatTheyOffer : undefined,
          ...contacts,
        },
  );
  if (error) return failWithDbError(error, fail);

  // La scheda, le pagine dei barrios e le pagine evento (nome e link di chi organizza) leggono dalla cache.
  updateTag(ORGANIZATIONS_TAG);
  updateTag(EVENTS_TAG);
  redirect("/panel?ficha=guardada");
}

function failWithDbError(
  error: { message: string; code?: string },
  fail: (patch: { formError?: ProfileFormState["formError"]; fieldErrors?: ProfileFieldErrors }) => ProfileFormState,
): ProfileFormState {
  const outcome = mapProfileDbError(error);
  // Solo il codice: mai i dati della scheda.
  if (outcome.type === "form" && outcome.error === "generic") console.warn("Profile update failed:", error.code);
  return outcome.type === "field" ? fail({ fieldErrors: { [outcome.field]: outcome.error } }) : fail({ formError: outcome.error });
}

/** Indirizzo → punto per il pin di Mi ficha. Solo utenti con accesso, con un limite (Nominatim è gratuito e condiviso). */
export async function locateProfileAddress(address: string): Promise<LocateOutcome> {
  const parsed = addressSchema.safeParse(address);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "generic" };
  try {
    if (!(await isWithinRateLimit(getHashedKey("geocode", userId), GEOCODES_PER_USER_PER_HOUR, "1 hour"))) {
      return { ok: false, error: "tooMany" };
    }
    const result = await geocodeAddress(parsed.data);
    return result ? { ok: true, lng: result.lng, lat: result.lat } : { ok: false, error: "notFound" };
  } catch {
    return { ok: false, error: "generic" };
  }
}
