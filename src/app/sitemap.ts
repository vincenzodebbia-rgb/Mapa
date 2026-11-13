import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { flags } from "@/config/flags";
import { getIndexableEventSlugs } from "@/features/events/data";
import { getNeighborhoodSlugsWithContent } from "@/features/map/data";
import { getIndexableOrganizationSlugs } from "@/features/organizations/data";
import { toAbsoluteUrl } from "@/lib/site-url";

// Solo pagine indicizzabili (docs/SPEC.md §14): schede (tranne i professionisti che hanno detto no), eventi non finiti,
// barrios con contenuti e le pagine fisse. Le aree private non compaiono mai.
const STATIC_PATHS = ["/", "/conexiones", "/que-es", "/legal"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Sito demo: niente da indicizzare.
  if (flags.demo) return [];
  // Al momento della richiesta, non al build: il build non deve aver bisogno del database. Le letture sono comunque in cache.
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
