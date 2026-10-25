import "server-only";
import { brand } from "@/config/brand";
import { getPublicEnv } from "./env";

type SiteUrlEnv = {
  siteUrl?: string;
  vercelProductionUrl?: string;
  vercelUrl?: string;
};

/**
 * Absolute origin of the site, for metadata, sitemap, JSON-LD and share links.
 * Never throws, so a missing variable cannot break build or CI:
 * NEXT_PUBLIC_SITE_URL → Vercel production domain → this deployment's Vercel URL → brand.siteUrl (localhost).
 */
export function resolveSiteUrl(env: SiteUrlEnv): URL {
  const candidates = [
    env.siteUrl,
    env.vercelProductionUrl && `https://${env.vercelProductionUrl}`,
    env.vercelUrl && `https://${env.vercelUrl}`,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      if (url.protocol === "https:" || url.protocol === "http:") return new URL(url.origin);
    } catch {
      // Not a URL: try the next one.
    }
  }
  return new URL(brand.siteUrl);
}

export function getSiteUrl(): URL {
  return resolveSiteUrl({
    siteUrl: getPublicEnv().NEXT_PUBLIC_SITE_URL,
    // Vercel system variables (no protocol), present at build and run time on Vercel.
    vercelProductionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    vercelUrl: process.env.VERCEL_URL,
  });
}

/** Absolute URL of a site path, e.g. toAbsoluteUrl("/e/coro") → "https://…/e/coro". */
export function toAbsoluteUrl(path: string): string {
  return new URL(path, getSiteUrl()).toString();
}
