import "server-only";
import { brand } from "@/config/brand";
import { t } from "@/lib/i18n/t";

/** Le tre famiglie di scheda pubblica (organizations.kind), ognuna con il proprio testo "¿Es tu…?". */
export type ClaimKind = "association" | "venue" | "professional";

/**
 * "¿Es tu asociación?" / "¿Es tu espacio?" / "¿Es tu perfil?" (decisione del 10 novembre,
 * docs/decisioni/2026-11-10-verifica.md): un mailto verso il canale di contatto del progetto (brand.contactEmail), mai un
 * indirizzo personale. Nel link solo il nome pubblico della scheda, mai il NIF. Usato dalla scheda pubblica
 * (organizations) e dall'errore "NIF ya registrado" (onboarding, senza nome).
 */
export function getClaimContactHref(kind: ClaimKind, organizationName?: string): string {
  const subject = organizationName
    ? t(`claim.subjectProfile.${kind}`, { name: organizationName })
    : t("claim.subjectNifTaken");
  return buildClaimMailto(brand.contactEmail, subject);
}

/** Pura, per i test: l'oggetto si codifica, così un nome con `&` o `?` non aggiunge destinatari né testo. */
export function buildClaimMailto(email: string, subject: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}
