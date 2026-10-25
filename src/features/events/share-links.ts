// Pure helpers for the "Compartir" button of the event page (docs/SPEC.md §5).

type PageLocation = Pick<Location, "protocol" | "host" | "pathname">;

/**
 * The link to share: the page the person is looking at (so a Vercel preview shares the preview, not production),
 * without query or hash. The site URL from the server is only the fallback (no browser, or a non-web scheme).
 */
export function resolveShareUrl(location: PageLocation | null, fallbackUrl: string): string {
  if (!location || (location.protocol !== "https:" && location.protocol !== "http:") || !location.host) {
    return fallbackUrl;
  }
  return `${location.protocol}//${location.host}${location.pathname}`;
}

/** WhatsApp share link: opens WhatsApp with the text and the link, no account or script of ours involved. */
export function buildWhatsAppShareUrl(text: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
}
