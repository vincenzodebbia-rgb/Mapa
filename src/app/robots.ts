import type { MetadataRoute } from "next";
import { flags } from "@/config/flags";
import { toAbsoluteUrl } from "@/lib/site-url";

// Private areas stay out of search engines (docs/SPEC.md §14). The pages also carry noindex themselves.
const PRIVATE_PATHS = ["/panel", "/profesionales", "/entrar", "/registro", "/invitacion/"];

export default function robots(): MetadataRoute.Robots {
  // Demo site: no Disallow at all. A blocked page is never read, so its noindex would be missed and the bare URL
  // could still show up; crawlers must get in and find noindex everywhere (X-Robots-Tag + meta). No sitemap either.
  if (flags.demo) return { rules: { userAgent: "*", allow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
    sitemap: toAbsoluteUrl("/sitemap.xml"),
  };
}
