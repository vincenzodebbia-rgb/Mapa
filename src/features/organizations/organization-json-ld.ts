import type { JsonLdObject } from "@/lib/seo/json-ld";
import type { OrganizationProfile } from "./types";

// schema.org Organization for /a/[slug] (docs/SPEC.md §14). Pure: the page passes the absolute URL.
// Only contacts the organization made public. No address for professionals (they have none on the map).

export function buildOrganizationJsonLd(organization: OrganizationProfile, url: string): JsonLdObject {
  const address =
    organization.address && organization.kind !== "professional"
      ? {
          "@type": "PostalAddress",
          streetAddress: organization.address,
          addressLocality: "Madrid",
          addressCountry: "ES",
        }
      : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: organization.name,
    url,
    description: organization.oneLiner ?? undefined,
    logo: organization.logoUrl ?? undefined,
    email: organization.contactEmail ?? undefined,
    telephone: organization.contactPhone ?? undefined,
    sameAs: organization.contactUrl ? [organization.contactUrl] : undefined,
    address,
  };
}
