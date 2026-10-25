import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "@/lib/seo/json-ld";
import { buildEventJsonLd } from "./event-json-ld";
import type { EventPage } from "./types";

const base: EventPage = {
  id: "e1",
  slug: "concierto-acustico",
  title: "Concierto acústico en el patio",
  description: "Tres grupos inventados.",
  category: "musica",
  priceType: "paid",
  priceAmount: 5,
  recurrence: "none",
  startsAt: "2026-10-26T19:00:00.000Z",
  endsAt: "2026-10-26T21:00:00.000Z",
  lastEndsAt: "2026-10-26T21:00:00.000Z",
  venueName: null,
  address: "Calle de Prueba 22",
  lng: -3.724,
  lat: 40.388,
  neighborhood: { slug: "opanel", name: "Opañel" },
  organizers: [
    { slug: "tendedero", name: "Asociación Cultural El Tendedero (ficticia)", kind: "association", isOwner: true },
    { slug: "colmena", name: "Colectivo Vecinal La Colmena (ficticio)", kind: "association", isOwner: false },
  ],
};

const urls = {
  event: "https://mapa.example.org/e/concierto-acustico",
  organizer: (slug: string) => `https://mapa.example.org/a/${slug}`,
};

describe("buildEventJsonLd", () => {
  it("builds a schema.org Event with the fields Google requires", () => {
    const ld = buildEventJsonLd(base, urls);
    expect(ld).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Event",
      name: base.title,
      startDate: base.startsAt,
      endDate: base.endsAt,
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      isAccessibleForFree: false,
      location: {
        "@type": "Place",
        name: "Calle de Prueba 22",
        address: { "@type": "PostalAddress", streetAddress: "Calle de Prueba 22", addressLocality: "Madrid" },
        geo: { latitude: 40.388, longitude: -3.724 },
      },
      offers: { "@type": "Offer", price: 5, priceCurrency: "EUR" },
    });
    expect(ld.organizer).toEqual([
      { "@type": "Organization", name: base.organizers[0]?.name, url: "https://mapa.example.org/a/tendedero" },
      { "@type": "Organization", name: base.organizers[1]?.name, url: "https://mapa.example.org/a/colmena" },
    ]);
  });

  it("free events have price 0; donation events are free with no offer", () => {
    expect(buildEventJsonLd({ ...base, priceType: "free", priceAmount: null }, urls)).toMatchObject({
      isAccessibleForFree: true,
      offers: { price: 0 },
    });
    const donation = JSON.parse(serializeJsonLd(buildEventJsonLd({ ...base, priceType: "donation", priceAmount: null }, urls)));
    expect(donation.isAccessibleForFree).toBe(true);
    expect(donation).not.toHaveProperty("offers");
  });

  it("uses the venue name for the place and drops a missing description", () => {
    const json = JSON.parse(serializeJsonLd(buildEventJsonLd({ ...base, venueName: "Bar ficticio", description: null }, urls)));
    expect(json.location.name).toBe("Bar ficticio");
    expect(json).not.toHaveProperty("description");
  });
});
