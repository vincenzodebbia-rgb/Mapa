import type { PopupContent } from "./types";

/**
 * Popup DOM built with textContent only: text from the database can never become markup.
 * Never setHTML / innerHTML (AGENTS.md, lint).
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

  const href = content.link ? toSafeHref(content.link.href) : null;
  if (content.link && href) {
    const link = doc.createElement("a");
    link.href = href;
    link.className = "mt-1 font-medium underline focus-visible:outline-2";
    link.textContent = content.link.label;
    root.append(link);
  }

  return root;
}

/** Only same-site paths ("/e/slug") and http(s) URLs. Anything else (javascript:, data:, //host) is dropped. */
export function toSafeHref(href: string): string | null {
  if (href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/\\")) return href;
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}
