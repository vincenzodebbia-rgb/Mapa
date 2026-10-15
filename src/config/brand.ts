/**
 * Brand slot. The name and visual identity are NOT decided yet.
 * Changing the name, logo or map style = editing this file and public/brand/. Nothing else.
 * See docs/DESIGN_HANDOFF.md.
 */
export const brand = {
  appName: "Mapa", // placeholder
  tagline: "Tu barrio vive", // placeholder
  shortDescription: "Lo que hacen hoy las asociaciones y colectivos de Madrid.", // placeholder
  logo: { src: "/brand/logo-placeholder.svg", alt: "Mapa" }, // placeholder
  mapStyleUrl: "https://tiles.openfreemap.org/styles/dark", // placeholder: swap for the final style
  mapFallbackStyleUrl: "https://tiles.openfreemap.org/styles/positron",
  contactEmail: "hola@example.org", // TODO: real address before launch
  illegalContentEmail: "legal@example.org", // TODO: DSA contact point before launch
  sourceCodeUrl: "https://github.com/OWNER/REPO", // TODO
  siteUrl: "http://localhost:3000", // overridden by NEXT_PUBLIC_SITE_URL
} as const;
