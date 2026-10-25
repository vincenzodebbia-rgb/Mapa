// Pure helpers for the "Compartir" button of the event page (docs/SPEC.md §5).

/** WhatsApp share link: opens WhatsApp with the text and the link, no account or script of ours involved. */
export function buildWhatsAppShareUrl(text: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
}
