import "server-only";
import { brand } from "@/config/brand";
import { getPublicEnv } from "./env";
import { getDeploymentEnv } from "./server-env";

type SiteUrlEnv = {
  siteUrl?: string;
  vercelProductionUrl?: string;
  vercelUrl?: string;
};

/**
 * Origine assoluta del sito, per metadati, sitemap, JSON-LD e link da condividere.
 * Non lancia mai errori, così una variabile mancante non può rompere build o CI:
 * NEXT_PUBLIC_SITE_URL → dominio di produzione Vercel → URL Vercel di questo deployment → brand.siteUrl (localhost).
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
      // Non è un URL: si prova il successivo.
    }
  }
  return new URL(brand.siteUrl);
}

export function getSiteUrl(): URL {
  const deployment = getDeploymentEnv();
  return resolveSiteUrl({
    siteUrl: getPublicEnv().NEXT_PUBLIC_SITE_URL,
    vercelProductionUrl: deployment.VERCEL_PROJECT_PRODUCTION_URL,
    vercelUrl: deployment.VERCEL_URL,
  });
}

/** URL assoluto di un percorso del sito, per esempio toAbsoluteUrl("/e/coro") → "https://…/e/coro". */
export function toAbsoluteUrl(path: string): string {
  return new URL(path, getSiteUrl()).toString();
}
