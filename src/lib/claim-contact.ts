import "server-only";
import { brand } from "@/config/brand";
import { t } from "@/lib/i18n/t";

/**
 * "¿Es tu asociación?" (decisione del 10 novembre, docs/decisioni/2026-11-10-verifica.md): un mailto verso il canale
 * di contatto del progetto (brand.contactEmail), mai un indirizzo personale. Nel link solo il nome pubblico della
 * scheda, mai il NIF. Usato dalla scheda pubblica (organizations) e dall'errore "NIF ya registrado" (onboarding).
 */
export function getClaimContactHref(organizationName?: string): string {
  const subject = organizationName
    ? t("claim.subjectProfile", { name: organizationName })
    : t("claim.subjectNifTaken");
  return buildClaimMailto(brand.contactEmail, subject);
}

/** Pura, per i test: l'oggetto si codifica, così un nome con `&` o `?` non aggiunge destinatari né testo. */
export function buildClaimMailto(email: string, subject: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}
