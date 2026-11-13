import { z } from "zod";
import { addDaysToDateKey, addMonthsToDateKey, getMadridDateKey, madridLocalToInstant } from "@/lib/dates";
import { isInsideMadridRegion } from "@/lib/domain/geocode";
import {
  EVENT_CATEGORY_VALUES,
  PRICE_TYPE_VALUES,
  RECURRENCE_VALUES,
  type EventCategory,
  type EventField,
  type EventFieldError,
  type EventFieldErrors,
  type EventFormError,
  type PriceType,
  type Recurrence,
} from "./types";

// Modulo "Nuevo evento" (docs/SPEC.md §5, docs/decisioni/2026-11-13-eventi.md). Gli stessi limiti del database:
// il database ricontrolla tutto (vincoli, trigger events_not_in_past), qui si danno solo messaggi sul campo giusto.

const MAX_DURATION_MS = 24 * 60 * 60 * 1000;
const RECURRENCE_MAX_MONTHS = 6;
// numeric(8, 2): al massimo 999999.99. Nessun tetto di prezzo deciso dal fondatore oltre a quello della colonna.
const MAX_PRICE = 999_999.99;

const asString = (value: unknown) => (typeof value === "string" ? value : "");
const trimmed = (value: unknown) => asString(value).trim();
const optionalText = (value: unknown) => trimmed(value) || null;

/** Ciò che arriva al database, già controllato. Gli orari sono istanti ISO in UTC. */
export type EventInput = {
  title: string;
  category: EventCategory;
  priceType: PriceType;
  priceAmount: number | null;
  startsAt: string;
  endsAt: string;
  recurrence: Recurrence;
  recurrenceUntil: string | null;
  address: string;
  venueName: string | null;
  description: string | null;
  /** Pin dalla mappa, se c'è; altrimenti l'action geocodifica l'indirizzo. */
  point: { lng: number; lat: number } | null;
};

export type EventParseResult =
  | { ok: true; value: EventInput }
  | { ok: false; fieldErrors: EventFieldErrors; locationOutside?: boolean };

/** "5", "5,5", "5.50" → 5.5; tutto il resto (negativi, tre decimali, lettere) → null. */
export function parsePriceAmount(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 && amount <= MAX_PRICE ? amount : null;
}

function readPoint(raw: Record<string, unknown>): { lng: number; lat: number } | null | "outside" {
  const lngText = trimmed(raw.lng);
  const latText = trimmed(raw.lat);
  if (!lngText || !latText) return null;
  const lng = Number(lngText);
  const lat = Number(latText);
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || !isInsideMadridRegion(lng, lat)) return "outside";
  return { lng, lat };
}

const enumOf = <T extends string>(values: readonly [T, ...T[]]) => z.enum(values);

/**
 * Modulo → dati per il database. `now` arriva da chi chiama (l'action), così i test sono stabili.
 * Regole degli orari (decisione del 13 novembre):
 * - fine prima dell'inizio (o uguale) = il giorno dopo (concerto 22:00–02:00); al massimo 24 ore;
 * - un evento già finito non si pubblica (D4); uno in corso sì;
 * - un orario che non esiste al cambio dell'ora si rifiuta; uno doppio prende il primo (src/lib/dates.ts).
 */
export function parseEventForm(raw: Record<string, unknown>, now: Date): EventParseResult {
  const errors: EventFieldErrors = {};
  const fail = (field: EventField, error: EventFieldError) => {
    errors[field] ??= error;
  };

  const title = trimmed(raw.title);
  if (!title) fail("title", "required");
  else if (title.length > 120) fail("title", "tooLong");

  const category = enumOf(EVENT_CATEGORY_VALUES).safeParse(asString(raw.category));
  if (!category.success) fail("category", asString(raw.category) ? "invalidOption" : "required");

  const priceType = enumOf(PRICE_TYPE_VALUES).safeParse(asString(raw.priceType) || "free");
  if (!priceType.success) fail("priceType", "invalidOption");
  let priceAmount: number | null = null;
  if (priceType.success && priceType.data === "paid") {
    const text = trimmed(raw.priceAmount);
    priceAmount = text ? parsePriceAmount(text) : null;
    if (!text) fail("priceAmount", "required");
    else if (priceAmount === null) fail("priceAmount", "invalidPrice");
  }

  const recurrence = enumOf(RECURRENCE_VALUES).safeParse(asString(raw.recurrence) || "none");
  if (!recurrence.success) fail("recurrence", "invalidOption");

  // Orari ---------------------------------------------------------------------
  const date = trimmed(raw.date);
  const startTime = trimmed(raw.startTime);
  const endTime = trimmed(raw.endTime);
  let startsAt: string | null = null;
  let endsAt: string | null = null;

  if (!date) fail("date", "required");
  if (!startTime) fail("startTime", "required");
  if (!endTime) fail("endTime", "required");
  if (date && startTime && endTime) {
    const start = madridLocalToInstant(date, startTime);
    if (!start.ok) {
      if (start.error === "nonexistent") fail("startTime", "nonexistentTime");
      else if (madridLocalToInstant(date, "12:00").ok) fail("startTime", "invalidTime");
      else fail("date", "invalidDate");
    }
    // Fine uguale o prima dell'inizio: il giorno dopo. "HH:MM" si confronta bene come testo.
    const endDate = endTime <= startTime ? addDaysToDateKey(date, 1) : date;
    const end = start.ok && endDate ? madridLocalToInstant(endDate, endTime) : null;
    if (end && !end.ok) fail("endTime", end.error === "nonexistent" ? "nonexistentTime" : "invalidTime");

    if (start.ok && end?.ok) {
      const duration = Date.parse(end.iso) - Date.parse(start.iso);
      // Al cambio dell'ora una notte può durare 25 ore sull'orologio: più di 24 ore reali non si accetta.
      if (duration <= 0 || duration > MAX_DURATION_MS) fail("endTime", "tooLongDuration");
      else if (Date.parse(end.iso) <= now.getTime()) fail("date", "inPast");
      else {
        startsAt = start.iso;
        endsAt = end.iso;
      }
    }
  }

  let recurrenceUntil: string | null = null;
  if (recurrence.success && recurrence.data !== "none") {
    const until = trimmed(raw.recurrenceUntil);
    if (!until) fail("recurrenceUntil", "required");
    else if (startsAt) {
      // Come il vincolo events_recurrence_until: tra il giorno d'inizio (a Madrid) e 6 mesi dopo.
      const startDay = getMadridDateKey(startsAt);
      const maxDay = addMonthsToDateKey(startDay, RECURRENCE_MAX_MONTHS);
      const valid = addDaysToDateKey(until, 0) !== null && maxDay !== null && until >= startDay && until <= maxDay;
      if (!valid) fail("recurrenceUntil", "invalidRecurrenceUntil");
      else recurrenceUntil = until;
    }
  }

  // Luogo -------------------------------------------------------------------------
  const address = trimmed(raw.address);
  if (!address) fail("address", "required");
  else if (address.length > 200) fail("address", "tooLong");
  const venueName = optionalText(raw.venueName);
  if (venueName && venueName.length > 120) fail("venueName", "tooLong");
  const description = optionalText(raw.description);
  if (description && description.length > 500) fail("description", "tooLong");
  const point = readPoint(raw);
  if (point === "outside") fail("address", "invalidLocation");

  if (
    Object.keys(errors).length > 0 ||
    !category.success ||
    !priceType.success ||
    !recurrence.success ||
    !startsAt ||
    !endsAt ||
    point === "outside"
  ) {
    return { ok: false, fieldErrors: errors };
  }

  return {
    ok: true,
    value: {
      title,
      category: category.data,
      priceType: priceType.data,
      priceAmount,
      startsAt,
      endsAt,
      recurrence: recurrence.data,
      recurrenceUntil,
      address,
      venueName,
      description,
      point,
    },
  };
}

export type EventDbErrorOutcome =
  | { type: "field"; field: EventField; error: EventFieldError }
  | { type: "form"; error: EventFormError };

/** Errori del database sull'insert di un evento → ciò che la persona vede. */
export function mapEventDbError(error: { message: string; code?: string }): EventDbErrorOutcome {
  if (error.message === "event_in_past") return { type: "field", field: "date", error: "inPast" };
  if (error.message === "rate_limited") return { type: "form", error: "tooMany" };
  if (error.message.includes("events_duration")) return { type: "field", field: "endTime", error: "tooLongDuration" };
  if (error.message.includes("events_recurrence_until")) {
    return { type: "field", field: "recurrenceUntil", error: "invalidRecurrenceUntil" };
  }
  if (error.message.includes("events_price_amount")) return { type: "field", field: "priceAmount", error: "invalidPrice" };
  // RLS: organizzazione sospesa o non propria.
  if (error.code === "42501") return { type: "form", error: "notAllowed" };
  return { type: "form", error: "generic" };
}

/**
 * Dove andare dopo "Publicar" (D8): se l'evento è di oggi (comincia oggi o prima, a Madrid, e non è finito) alla mappa
 * Hoy con il suo punto aperto; altrimenti alla pagina dell'evento.
 */
export function getPublishedEventHref(slug: string, startsAt: string, endsAt: string, now: Date): string {
  const isToday = getMadridDateKey(startsAt) <= getMadridDateKey(now) && Date.parse(endsAt) > now.getTime();
  return isToday ? `/?evento=${encodeURIComponent(slug)}` : `/e/${encodeURIComponent(slug)}`;
}

/** Campi del modulo che si rimandano indietro dopo un errore. */
export const EVENT_REFILL_FIELDS: EventField[] = [
  "title",
  "category",
  "priceType",
  "priceAmount",
  "date",
  "startTime",
  "endTime",
  "recurrence",
  "recurrenceUntil",
  "address",
  "venueName",
  "description",
];
