import "server-only";
import { formatMadridDate, formatMadridTime } from "@/lib/dates";
import { t } from "@/lib/i18n/t";
import type { EventPage, PriceType, UpcomingEvent } from "./types";

// Turns event DTOs into the texts people read, on the server, always in Madrid time.

const euroFormat = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase("es-ES") + text.slice(1);
}

/** "Jueves, 29 de octubre" */
export function describeEventDate(event: Pick<EventPage | UpcomingEvent, "startsAt">): string {
  return capitalize(formatMadridDate(event.startsAt));
}

/** "19:00–21:00" */
export function describeEventHours(event: Pick<EventPage | UpcomingEvent, "startsAt" | "endsAt">): string {
  return t("event.hoursRange", { start: formatMadridTime(event.startsAt), end: formatMadridTime(event.endsAt) });
}

export function describePrice(event: { priceType: PriceType; priceAmount: number | null }): string {
  if (event.priceType === "paid" && event.priceAmount !== null) {
    return t("hoy.price.paidAmount", { amount: euroFormat.format(event.priceAmount) });
  }
  return t(`hoy.price.${event.priceType}`);
}

export function describePlace(event: Pick<EventPage | UpcomingEvent, "venueName" | "address">): string {
  return [event.venueName, event.address].filter(Boolean).join(t("hoy.list.separator"));
}
