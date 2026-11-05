// DTO del blocco organizations. Riprendono gli enum del database senza importarne i tipi generati.

export type OrganizationKind = "association" | "venue" | "professional";

/** La scheda pubblica /a/[slug] (docs/SPEC.md §7). Solo ciò che l'organizzazione ha scelto di rendere pubblico. */
export type OrganizationProfile = {
  id: string;
  slug: string;
  kind: OrganizationKind;
  name: string;
  oneLiner: string | null;
  whenToVisit: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  /** Già controllato: solo http/https. */
  contactUrl: string | null;
  /** Mai per "Gente que hace cosas" (professional). */
  address: string | null;
  neighborhood: { slug: string; name: string } | null;
  story: string | null;
  /** URL pubblico assoluto del logo WebP nello Storage, oppure null. */
  logoUrl: string | null;
  verified: boolean;
  /** false solo per i professionisti che hanno spento "Mostrar mi perfil en Google". */
  indexable: boolean;
};

/** Una scheda indicizzabile nella sitemap. */
export type OrganizationSitemapEntry = { slug: string; updatedAt: string };

/** Un'organizzazione in un elenco (pagina del barrio). */
export type OrganizationSummary = {
  slug: string;
  kind: OrganizationKind;
  name: string;
  oneLiner: string | null;
};

/** L'organizzazione che gestisce l'utente con accesso (panel privato). */
export type MyOrganization = { slug: string; name: string; status: "active" | "suspended" };
