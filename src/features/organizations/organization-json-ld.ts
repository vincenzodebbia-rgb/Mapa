import type { JsonLdObject } from "@/lib/seo/json-ld";
import type { OrganizationProfile } from "./types";

// Organization di schema.org per /a/[slug] (docs/SPEC.md §14). Puro: la pagina passa l'URL assoluto.
// Solo i contatti che l'organizzazione ha reso pubblici. Nessun indirizzo per i professionisti (sulla mappa non ne hanno).

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
