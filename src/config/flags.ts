/**
 * Feature flags. Every flag has an owner and an expiry date: remove the flag (and dead code) by then.
 * Unfinished features stay behind a flag; they are not deleted.
 */
export const flags = {
  intro: false, // cover/intro animation — waits for the visual identity (docs/DESIGN_HANDOFF.md). Expires: design phase.
  threads: false, // hilos (lines on /conexiones, panel section). Off until after launch; /conexiones itself is not gated. Expires: 2027-03-31.
  professionals: true, // /profesionales + spaces. Expires: 2027-03-31.
  annualMemory: false, // /panel/memoria/[year]. Expires: 2027-06-30.
  openFeeds: false, // iCal/JSON/ActivityPub exports (data model ready, not built). Expires: 2027-06-30.
  // Private demo site (Vercel project mapa-demo on mapa-dev data): banner + noindex + empty sitemap.
  // Only the exact value "1" turns it on. Read at build time (NEXT_PUBLIC_*): change it, then redeploy. Expires: 2027-03-31.
  demo: isDemoValue(process.env.NEXT_PUBLIC_DEMO),
} as const;

export function isDemoValue(value: string | undefined): boolean {
  return value === "1";
}
