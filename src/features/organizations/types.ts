// DTOs of the organizations block. They mirror the enums of the database without importing its generated types.

export type OrganizationKind = "association" | "venue" | "professional";

/** The public profile /a/[slug] (docs/SPEC.md §7). Only what the organization chose to make public. */
export type OrganizationProfile = {
  id: string;
  slug: string;
  kind: OrganizationKind;
  name: string;
  oneLiner: string | null;
  whenToVisit: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  /** Already checked: http/https only. */
  contactUrl: string | null;
  /** Never for "Gente que hace cosas" (professional). */
  address: string | null;
  neighborhood: { slug: string; name: string } | null;
  story: string | null;
  /** Absolute public URL of the WebP logo in Storage, or null. */
  logoUrl: string | null;
  verified: boolean;
  /** false only for professionals who turned off "Mostrar mi perfil en Google". */
  indexable: boolean;
};

/** An organization in a list (neighborhood page, sitemap). */
export type OrganizationSummary = {
  slug: string;
  kind: OrganizationKind;
  name: string;
  oneLiner: string | null;
};
