/**
 * L'unico posto che trasforma gli istanti (timestamptz) in ciò che le persone leggono.
 * Tutto si mostra con l'ora di Madrid, qualunque sia il fuso del server o del telefono.
 */
export const MADRID_TIME_ZONE = "Europe/Madrid";
const LOCALE = "es-ES";

const timeFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: MADRID_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dateFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: MADRID_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});

const dateKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: MADRID_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function toDate(value: Date | string): Date {
  return typeof value === "string" ? new Date(value) : value;
}

/** "19:30" */
export function formatMadridTime(value: Date | string): string {
  return timeFormat.format(toDate(value));
}

/** "jueves, 16 de julio" */
export function formatMadridDate(value: Date | string): string {
  return dateFormat.format(toDate(value));
}

/** "2026-07-16": il giorno di calendario a Madrid. Serve per confrontare i giorni ("questo evento è oggi?"). */
export function getMadridDateKey(value: Date | string): string {
  const parts = dateKeyFormat.formatToParts(toDate(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

const localTimeKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: MADRID_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_KEY = /^([01]\d|2[0-3]):([0-5]\d)$/;
const HOUR_MS = 60 * 60 * 1000;

/** "2026-07-16" valido (anche il giorno: niente 31 di febbraio), oppure null. */
function parseDateKey(dateKey: string): { year: number; month: number; day: number } | null {
  const match = DATE_KEY.exec(dateKey);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return { year, month, day };
}

export type MadridInstantResult =
  | { ok: true; iso: string }
  | { ok: false; error: "invalid" | "nonexistent" };

/**
 * Giorno + ora come si leggono a Madrid ("2026-07-16", "19:30") → istante ISO in UTC (per timestamptz). Unico posto.
 * - Ora che non esiste (29 marzo 2026, 02:00–02:59: gli orologi saltano alle 03:00) → `nonexistent`.
 * - Ora che esiste due volte (25 ottobre 2026, 02:00–02:59) → la prima, cioè ancora in ora legale.
 * Madrid è sempre UTC+1 o UTC+2: si provano i due scarti e si tengono quelli che, riletti a Madrid, danno la stessa ora.
 */
export function madridLocalToInstant(dateKey: string, timeKey: string): MadridInstantResult {
  const date = parseDateKey(dateKey);
  const time = TIME_KEY.exec(timeKey);
  if (!date || !time) return { ok: false, error: "invalid" };
  const wallClockAsUtc = Date.UTC(date.year, date.month - 1, date.day, Number(time[1]), Number(time[2]));
  const matches = [2, 1]
    .map((offsetHours) => wallClockAsUtc - offsetHours * HOUR_MS)
    .filter((instant) => getMadridDateKey(new Date(instant)) === dateKey && localTimeKeyFormat.format(instant) === timeKey);
  const first = matches[0];
  if (first === undefined) return { ok: false, error: "nonexistent" };
  return { ok: true, iso: new Date(first).toISOString() };
}

/** "2026-07-16" + n giorni (n anche negativo), sul calendario. */
export function addDaysToDateKey(dateKey: string, days: number): string | null {
  const date = parseDateKey(dateKey);
  if (!date) return null;
  return new Date(Date.UTC(date.year, date.month - 1, date.day + days)).toISOString().slice(0, 10);
}

/**
 * "2026-08-31" + n mesi come Postgres (`date + interval 'n months'`): se il giorno non esiste nel mese d'arrivo si usa
 * l'ultimo giorno (31 agosto + 6 mesi = 28 febbraio). Serve a non far scattare il vincolo events_recurrence_until.
 */
export function addMonthsToDateKey(dateKey: string, months: number): string | null {
  const date = parseDateKey(dateKey);
  if (!date) return null;
  const target = new Date(Date.UTC(date.year, date.month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(date.day, lastDay));
  return target.toISOString().slice(0, 10);
}
