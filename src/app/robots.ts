import type { MetadataRoute } from "next";
import { toAbsoluteUrl } from "@/lib/site-url";

// Private areas stay out of search engines (docs/SPEC.md §14). The pages also carry noindex themselves.
const PRIVATE_PATHS = ["/panel", "/profesionales", "/entrar", "/registro", "/invitacion/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
    sitemap: toAbsoluteUrl("/sitemap.xml"),
  };
}
