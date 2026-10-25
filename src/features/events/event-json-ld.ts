import type { JsonLdObject } from "@/lib/seo/json-ld";
import type { EventPage } from "./types";

// schema.org Event for the event page (docs/SPEC.md §14). Pure: the page passes absolute URLs.
// No image: v1 has no event photos (docs/SPEC.md §5).

type EventJsonLdUrls = {
  event: string;
  /** Absolute profile URL by organizer slug. */
  organizer: (slug: string) => string;
};

export function buildEventJsonLd(event: EventPage, urls: EventJsonLdUrls): JsonLdObject {
  const accessibleForFree = event.priceType !== "paid";
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description ?? undefined,
    url: urls.event,
    startDate: event.startsAt,
    endDate: event.endsAt,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    isAccessibleForFree: accessibleForFree,
    location: {
      "@type": "Place",
      name: event.venueName ?? event.address,
      address: {
        "@type": "PostalAddress",
        streetAddress: event.address,
        addressLocality: "Madrid",
        addressCountry: "ES",
      },
      geo: { "@type": "GeoCoordinates", latitude: event.lat, longitude: event.lng },
    },
    organizer: event.organizers.map((organizer) => ({
      "@type": "Organization",
      name: organizer.name,
      url: urls.organizer(organizer.slug),
    })),
    // Donation ("aportación voluntaria") is free to attend: no price offer.
    offers:
      event.priceType === "donation"
        ? undefined
        : {
            "@type": "Offer",
            price: event.priceType === "paid" ? (event.priceAmount ?? 0) : 0,
            priceCurrency: "EUR",
            url: urls.event,
            availability: "https://schema.org/InStock",
          },
  };
}
