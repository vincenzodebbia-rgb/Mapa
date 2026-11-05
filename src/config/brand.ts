/**
 * Spazio del marchio. Il nome e l'identità visiva NON sono ancora decisi.
 * Cambiare nome, logo o stile della mappa = modificare questo file e public/brand/. Nient'altro.
 * Vedi docs/DESIGN_HANDOFF.md.
 */
export const brand = {
  appName: "Mapa", // segnaposto
  tagline: "Tu barrio vive", // segnaposto
  shortDescription: "Lo que hacen hoy las asociaciones y colectivos de Madrid.", // segnaposto
  logo: { src: "/brand/logo-placeholder.svg", alt: "Mapa" }, // segnaposto
  mapStyleUrl: "https://tiles.openfreemap.org/styles/dark", // segnaposto: da sostituire con lo stile definitivo
  mapFallbackStyleUrl: "https://tiles.openfreemap.org/styles/positron",
  contactEmail: "hola@example.org", // TODO: indirizzo vero prima del lancio
  illegalContentEmail: "legal@example.org", // TODO: punto di contatto DSA prima del lancio
  sourceCodeUrl: "https://github.com/OWNER/REPO", // TODO
  siteUrl: "http://localhost:3000", // sostituito da NEXT_PUBLIC_SITE_URL
} as const;
