/**
 * The only place that turns instants (timestamptz) into what people read.
 * Everything is shown in Madrid time, whatever the server or phone time zone is.
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

/** "2026-07-16": the calendar day in Madrid. Use it to compare days ("is this event today?"). */
export function getMadridDateKey(value: Date | string): string {
  const parts = dateKeyFormat.formatToParts(toDate(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
