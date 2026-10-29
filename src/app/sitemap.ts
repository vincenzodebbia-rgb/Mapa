import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { flags } from "@/config/flags";
import { getIndexableEventSlugs } from "@/features/events/data";
import { getNeighborhoodSlugsWithContent } from "@/features/map/data";
import { getIndexableOrganizationSlugs } from "@/features/organizations/data";
import { toAbsoluteUrl } from "@/lib/site-url";

// Only indexable pages (docs/SPEC.md §14): profiles (except professionals who said no), events not over yet,
// barrios with content, and the fixed pages. Private areas are never listed.
const STATIC_PATHS = ["/", "/conexiones", "/que-es", "/legal"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Demo site: nothing to index.
  if (flags.demo) return [];
  // At request time, not at build: the build must not need the database. The reads themselves are cached.
  await connection();
  const [organizations, events, neighborhoods] = await Promise.all([
    getIndexableOrganizationSlugs(),
    getIndexableEventSlugs(),
    getNeighborhoodSlugsWithContent(),
  ]);
  return [
    ...STATIC_PATHS.map((path) => ({ url: toAbsoluteUrl(path) })),
    ...organizations.map(({ slug, updatedAt }) => ({ url: toAbsoluteUrl(`/a/${slug}`), lastModified: updatedAt })),
    ...events.map((slug) => ({ url: toAbsoluteUrl(`/e/${slug}`) })),
    ...neighborhoods.map((slug) => ({ url: toAbsoluteUrl(`/barrio/${slug}`) })),
  ];
}
