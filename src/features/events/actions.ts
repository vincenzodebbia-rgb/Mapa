"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { LocateOutcome } from "@/components/ui/address-field";
import { ORGANIZATIONS_TAG } from "@/lib/cache-tags";
import { addressSchema } from "@/lib/domain/address";
import { geocodeAddress } from "@/lib/geocode";
import { getHashedKey, getIdKey, isWithinRateLimit } from "@/lib/rate-limit";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EVENTS_TAG, getEventOwner } from "./data";
import { EVENT_REFILL_FIELDS, getPublishedEventHref, mapEventDbError, parseEventForm } from "./schema";
import type { EventFieldErrors, EventFormState } from "./types";

// Limiti (docs/piani/sessione-6.md, D9): 20 eventi creati al giorno per organizzazione (anche nel database, trigger
// events_rate_limit), 30 ricerche di indirizzi all'ora per utente come nell'iscrizione, 60 cancellazioni all'ora.
const EVENTS_PER_ORGANIZATION_PER_DAY = 20;
const GEOCODES_PER_USER_PER_HOUR = 30;
const DELETES_PER_ORGANIZATION_PER_HOUR = 60;

function readValues(formData: FormData): EventFormState["values"] {
  const values: EventFormState["values"] = {};
  for (const field of EVENT_REFILL_FIELDS) {
    const value = formData.get(field);
    if (typeof value === "string" && value !== "") values[field] = value.slice(0, 600);
  }
  return values;
}

/**
 * "Publicar" del modulo Nuevo evento. Ordine di AGENTS.md: zod → utente + membership di un'organizzazione attiva →
 * limite → punto (pin o geocodifica) → insert con il client dell'utente (la RLS fa da arbitro) → updateTag → redirect (D8).
 * Niente co-organizzatori (D7).
 */
export async function createEvent(previous: EventFormState, formData: FormData): Promise<EventFormState> {
  const attempt = previous.attempt + 1;
  const values = readValues(formData);
  const fail = (patch: { formError?: EventFormState["formError"]; fieldErrors?: EventFieldErrors }): EventFormState => ({
    attempt,
    values,
    formError: patch.formError ?? null,
    fieldErrors: patch.fieldErrors ?? {},
  });

  const now = new Date();
  const parsed = parseEventForm(Object.fromEntries(formData), now);
  if (!parsed.ok) return fail({ fieldErrors: parsed.fieldErrors });

  const userId = await getCurrentUserId();
  if (!userId) redirect("/entrar");
  const owner = await getEventOwner(userId);
  if (!owner) redirect("/registro");
  if (!owner.active) return fail({ formError: "notAllowed" });

  let point = parsed.value.point;
  try {
    if (!(await isWithinRateLimit(getIdKey("event", owner.organizationId), EVENTS_PER_ORGANIZATION_PER_DAY, "1 day"))) {
      return fail({ formError: "tooMany" });
    }
    if (!point) {
      const result = await geocodeAddress(parsed.value.address);
      point = result ? { lng: result.lng, lat: result.lat } : null;
    }
  } catch {
    return fail({ formError: "generic" });
  }
  // Senza coordinate non si pubblica (docs/SPEC.md §5).
  if (!point) return fail({ fieldErrors: { address: "addressNotFound" } });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("events")
    .insert({
      // Segnaposto: il trigger events_before_write sostituisce sempre lo slug (unico, dal titolo, mai cambiato).
      slug: "nuevo",
      title: parsed.value.title,
      category: parsed.value.category,
      price_type: parsed.value.priceType,
      price_amount: parsed.value.priceAmount,
      starts_at: parsed.value.startsAt,
      ends_at: parsed.value.endsAt,
      recurrence: parsed.value.recurrence,
      recurrence_until: parsed.value.recurrenceUntil,
      address: parsed.value.address,
      venue_name: parsed.value.venueName,
      description: parsed.value.description,
      location: `SRID=4326;POINT(${point.lng} ${point.lat})`,
      owner_org: owner.organizationId,
    })
    .select("slug")
    .single();

  if (error || !data) {
    const outcome = error ? mapEventDbError(error) : ({ type: "form", error: "generic" } as const);
    // Solo il codice: mai i dati dell'evento.
    if (outcome.type === "form" && outcome.error === "generic") console.warn("Event insert failed:", error?.code);
    return outcome.type === "field"
      ? fail({ fieldErrors: { [outcome.field]: outcome.error } })
      : fail({ formError: outcome.error });
  }

  // La mappa, le schede e i barrios leggono gli eventi in cache.
  updateTag(EVENTS_TAG);
  updateTag(ORGANIZATIONS_TAG);
  redirect(getPublishedEventHref(data.slug, parsed.value.startsAt, parsed.value.endsAt, now));
}

const eventIdSchema = z.uuid();

/** "Eliminar" in Mis eventos. Solo un membro dell'organizzazione proprietaria (lo ricontrolla la RLS). */
export async function deleteEvent(formData: FormData): Promise<void> {
  const parsed = eventIdSchema.safeParse(formData.get("eventId"));
  if (!parsed.success) redirect("/panel?evento=error");

  const userId = await getCurrentUserId();
  if (!userId) redirect("/entrar");
  const owner = await getEventOwner(userId);
  if (!owner) redirect("/registro");

  let deleted = false;
  try {
    if (await isWithinRateLimit(getIdKey("event-delete", owner.organizationId), DELETES_PER_ORGANIZATION_PER_HOUR, "1 hour")) {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase
        .from("events")
        .delete()
        .eq("id", parsed.data)
        .eq("owner_org", owner.organizationId)
        .select("id");
      if (error) console.warn("Event delete failed:", error.code);
      deleted = !error && (data?.length ?? 0) === 1;
    }
  } catch {
    deleted = false;
  }
  if (!deleted) redirect("/panel?evento=error");

  updateTag(EVENTS_TAG);
  updateTag(ORGANIZATIONS_TAG);
  redirect("/panel?evento=eliminado");
}

/** Indirizzo → punto per il pin del modulo. Solo utenti con accesso, con un limite (Nominatim è gratuito e condiviso). */
export async function locateEventAddress(address: string): Promise<LocateOutcome> {
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
