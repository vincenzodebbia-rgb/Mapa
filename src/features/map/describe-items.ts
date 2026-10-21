import "server-only";
import { formatMadridDate, formatMadridTime, getMadridDateKey } from "@/lib/dates";
import { t } from "@/lib/i18n/t";
import type { MapEvent, MapPlace, PopupContent } from "./types";

// Turns DTOs into the texts people read, on the server: the same words in the popup and in the list view.

const euroFormat = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase("es-ES") + text.slice(1);
}

export function describeEventTime(event: MapEvent, now: Date): string {
  const start = formatMadridTime(event.startsAt);
  const end = formatMadridTime(event.endsAt);
  if (getMadridDateKey(event.startsAt) === getMadridDateKey(now)) return t("hoy.when.today", { start, end });
  return t("hoy.when.otherDay", { date: capitalize(formatMadridDate(event.startsAt)), start, end });
}

export function describeEventPrice(event: MapEvent): string {
  if (event.priceType === "paid" && event.priceAmount !== null) {
    return t("hoy.price.paidAmount", { amount: euroFormat.format(event.priceAmount) });
  }
  return t(`hoy.price.${event.priceType}`);
}

export function describeEventPlace(event: MapEvent): string | null {
  const place = [event.venueName, event.address].filter(Boolean).join(t("hoy.list.separator"));
  return place ? t("hoy.list.at", { place }) : null;
}

export function describeOrganizers(event: MapEvent): string | null {
  return event.organizerNames ? t("hoy.list.organizedBy", { names: event.organizerNames }) : null;
}

export function toEventPopup(event: MapEvent, now: Date): PopupContent {
  const lines = [describeOrganizers(event), describeEventTime(event, now), describeEventPrice(event), describeEventPlace(event)];
  return {
    title: event.title,
    lines: lines.filter((line): line is string => line !== null),
    link: { href: `/e/${event.slug}`, label: t("map.popup.see") },
  };
}

export function toPlacePopup(place: MapPlace): PopupContent {
  return {
    title: place.name,
    lines: [t(`conexiones.kinds.${place.kind}`)],
    link: { href: `/a/${place.slug}`, label: t("conexiones.seeProfile") },
  };
}
