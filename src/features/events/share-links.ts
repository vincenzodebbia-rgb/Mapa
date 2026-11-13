// Funzioni pure per il pulsante "Compartir" della pagina evento (docs/SPEC.md §5).

type PageLocation = Pick<Location, "protocol" | "host" | "pathname">;

/**
 * Il link da condividere: la pagina che la persona sta guardando (così un'anteprima Vercel condivide l'anteprima, non
 * la produzione), senza parametri né hash. L'URL del sito dal server è solo la riserva (niente browser, o schema non web).
 */
export function resolveShareUrl(location: PageLocation | null, fallbackUrl: string): string {
  if (!location || (location.protocol !== "https:" && location.protocol !== "http:") || !location.host) {
    return fallbackUrl;
  }
  return `${location.protocol}//${location.host}${location.pathname}`;
}

/** Link di condivisione WhatsApp: apre WhatsApp con il testo e il link, senza account né script nostri. */
export function buildWhatsAppShareUrl(text: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
}
