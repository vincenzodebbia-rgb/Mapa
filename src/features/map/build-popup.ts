import type { PopupContent } from "./types";

/**
 * DOM del popup costruito solo con textContent: il testo del database non può mai diventare markup.
 * Mai setHTML / innerHTML (AGENTS.md, lint).
 */
export function buildPopup(doc: Document, content: PopupContent): HTMLElement {
  const root = doc.createElement("div");
  root.className = "flex max-w-64 flex-col gap-1 text-night";

  const title = doc.createElement("p");
  title.className = "font-semibold";
  title.textContent = content.title;
  root.append(title);

  for (const line of content.lines) {
    const paragraph = doc.createElement("p");
    paragraph.className = "text-sm";
    paragraph.textContent = line;
    root.append(paragraph);
  }

  for (const item of [content.link, content.editLink]) {
    const href = item ? toSafeHref(item.href) : null;
    if (!item || !href) continue;
    const link = doc.createElement("a");
    link.href = href;
    link.className = "mt-1 font-medium underline focus-visible:outline-2";
    link.textContent = item.label;
    root.append(link);
  }

  return root;
}

/** Solo percorsi dello stesso sito ("/e/slug") e URL http(s). Tutto il resto (javascript:, data:, //host) si scarta. */
export function toSafeHref(href: string): string | null {
  if (href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/\\")) return href;
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}
