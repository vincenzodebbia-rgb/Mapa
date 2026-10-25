import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createSupabasePublicClient, getPublicStorageUrl } from "@/lib/supabase/public";
import { unwrap } from "@/lib/supabase/unwrap";
import type { OrganizationKind, OrganizationProfile, OrganizationSummary } from "./types";

// Public reads, as anon (RLS: no suspended organizations), cached so the public pages are static
// and can answer a real 404. Writes (session 7, "Mi ficha") must call updateTag(ORGANIZATIONS_TAG).
export const ORGANIZATIONS_TAG = "organizations";

const PROFILE_COLUMNS =
  "id, slug, kind, name, one_liner, when_to_visit, contact_email, contact_phone, contact_url, address, story, logo_path, verified, indexable, neighborhood:neighborhoods(slug, name)";

/** Only http/https links reach the page (the database checks it too). */
function toSafeHttpUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function getOrganizationProfile(slug: string): Promise<OrganizationProfile | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(ORGANIZATIONS_TAG, `organization:${slug}`);

  const supabase = createSupabasePublicClient();
  const row = unwrap(await supabase.from("organizations").select(PROFILE_COLUMNS).eq("slug", slug).maybeSingle());
  if (!row) return null;
  const isProfessional = row.kind === "professional";
  return {
    id: row.id,
    slug: row.slug,
    kind: row.kind,
    name: row.name,
    oneLiner: row.one_liner,
    whenToVisit: row.when_to_visit,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    contactUrl: toSafeHttpUrl(row.contact_url),
    // "Gente que hace cosas" has no fixed place (docs/SPEC.md §7).
    address: isProfessional ? null : row.address,
    neighborhood: row.neighborhood ? { slug: row.neighborhood.slug, name: row.neighborhood.name } : null,
    story: row.story,
    logoUrl: row.logo_path ? getPublicStorageUrl("org-logos", row.logo_path) : null,
    verified: row.verified,
    indexable: row.indexable,
  };
}

/** Active associations and venues of a barrio, sorted by name. */
export async function getOrganizationsInNeighborhood(neighborhoodSlug: string): Promise<OrganizationSummary[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(ORGANIZATIONS_TAG);

  const supabase = createSupabasePublicClient();
  const rows =
    unwrap(
      await supabase
        .from("organizations")
        .select("slug, kind, name, one_liner, neighborhood:neighborhoods!inner(slug)")
        .in("kind", ["association", "venue"] satisfies OrganizationKind[])
        .eq("neighborhood.slug", neighborhoodSlug)
        .order("name"),
    ) ?? [];
  return rows.map((row) => ({ slug: row.slug, kind: row.kind, name: row.name, oneLiner: row.one_liner }));
}

/** Profiles that may appear in the sitemap (professionals who turned off Google are left out). */
export async function getIndexableOrganizationSlugs(): Promise<{ slug: string; updatedAt: string }[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(ORGANIZATIONS_TAG);

  const supabase = createSupabasePublicClient();
  const rows =
    unwrap(await supabase.from("organizations").select("slug, updated_at").eq("indexable", true).order("slug")) ?? [];
  return rows.map((row) => ({ slug: row.slug, updatedAt: row.updated_at }));
}
