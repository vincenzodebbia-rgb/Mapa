import type { MetadataRoute } from "next";
import { toAbsoluteUrl } from "@/lib/site-url";

// Only indexable pages (docs/SPEC.md §14). Private areas are never listed.
const STATIC_PATHS = ["/", "/conexiones", "/que-es", "/legal"];

// TODO(sessione 4): add organizations, events and neighborhoods with content once the generated types
// include the views of migration public_pages (waiting for the push to mapa-dev).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return STATIC_PATHS.map((path) => ({ url: toAbsoluteUrl(path) }));
}
