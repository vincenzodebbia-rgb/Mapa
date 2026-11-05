import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { ORGANIZATIONS_TAG } from "@/lib/cache-tags";
import { createSupabasePublicClient, getPublicStorageUrl } from "@/lib/supabase/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { unwrap } from "@/lib/supabase/unwrap";
import type {
  MyOrganization,
  OrganizationKind,
  OrganizationProfile,
  OrganizationSitemapEntry,
  OrganizationSummary,
} from "./types";

// Letture pubbliche, come anon (RLS: niente organizzazioni sospese), in cache così le pagine pubbliche sono statiche
// e possono rispondere con un 404 vero. Ogni scrittura su un'organizzazione (iscrizione, "Mi ficha") chiama
// updateTag(ORGANIZATIONS_TAG) di src/lib/cache-tags.ts.

const PROFILE_COLUMNS =
  "id, slug, kind, name, one_liner, when_to_visit, contact_email, contact_phone, contact_url, address, story, logo_path, verified, indexable, neighborhood:neighborhoods(slug, name)";

/** Alla pagina arrivano solo link http/https (lo controlla anche il database). */
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
    // "Gente que hace cosas" non ha un luogo fisso (docs/SPEC.md §7).
    address: isProfessional ? null : row.address,
    neighborhood: row.neighborhood ? { slug: row.neighborhood.slug, name: row.neighborhood.name } : null,
    story: row.story,
    logoUrl: row.logo_path ? getPublicStorageUrl("org-logos", row.logo_path) : null,
    verified: row.verified,
    indexable: row.indexable,
  };
}

/** Associazioni ed espacios attivi di un barrio, in ordine di nome. */
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

/** Schede che possono comparire nella sitemap (restano fuori i professionisti che hanno spento Google). */
export async function getIndexableOrganizationSlugs(): Promise<OrganizationSitemapEntry[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(ORGANIZATIONS_TAG);

  const supabase = createSupabasePublicClient();
  const rows =
    unwrap(await supabase.from("organizations").select("slug, updated_at").eq("indexable", true).order("slug")) ?? [];
  return rows.map((row) => ({ slug: row.slug, updatedAt: row.updated_at }));
}

/**
 * L'organizzazione gestita da questo utente (v1: al massimo una), letta come l'utente stesso (RLS: solo le proprie
 * membership; un membro vede la sua organizzazione anche se sospesa). Non in cache: è privata e cambia con la sessione.
 */
export async function getOrganizationForUser(userId: string): Promise<MyOrganization | null> {
  const supabase = await createSupabaseServerClient();
  const row = unwrap(
    await supabase
      .from("memberships")
      .select("organization:organizations(slug, name, status)")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle(),
  );
  const organization = row?.organization;
  return organization ? { slug: organization.slug, name: organization.name, status: organization.status } : null;
}
