import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "@/lib/seo/json-ld";
import { buildOrganizationJsonLd } from "./organization-json-ld";
import type { OrganizationProfile } from "./types";

const association: OrganizationProfile = {
  id: "a1",
  slug: "colmena",
  kind: "association",
  name: "Colectivo Vecinal La Colmena (ficticio)",
  oneLiner: "Vecinos que se juntan para cuidar el barrio.",
  whenToVisit: "Los jueves a las 19h",
  contactEmail: null,
  contactPhone: null,
  contactUrl: "https://example.org/colmena",
  address: "Calle Inventada 1",
  neighborhood: { slug: "vista-alegre", name: "Vista Alegre" },
  story: "Empezamos en un garaje.",
  logoUrl: null,
  verified: true,
  indexable: true,
};

const url = "https://mapa.example.org/a/colmena";

describe("buildOrganizationJsonLd", () => {
  it("builds a schema.org Organization with only public data", () => {
    const json = JSON.parse(serializeJsonLd(buildOrganizationJsonLd(association, url)));
    expect(json).toEqual({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: association.name,
      url,
      description: association.oneLiner,
      sameAs: ["https://example.org/colmena"],
      address: {
        "@type": "PostalAddress",
        streetAddress: "Calle Inventada 1",
        addressLocality: "Madrid",
        addressCountry: "ES",
      },
    });
  });

  it("never gives an address for a professional", () => {
    const json = JSON.parse(
      serializeJsonLd(buildOrganizationJsonLd({ ...association, kind: "professional", address: "Calle X" }, url)),
    );
    expect(json).not.toHaveProperty("address");
  });
});
