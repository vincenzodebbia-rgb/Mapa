// Dati strutturati (schema.org) per i motori di ricerca. Puro: niente accesso ai dati, niente React.

export type JsonLdValue = string | number | boolean | null | JsonLdValue[] | { [key: string]: JsonLdValue | undefined };
export type JsonLdObject = { [key: string]: JsonLdValue | undefined };

/**
 * JSON per uno <script type="application/ld+json">. Ogni "<" diventa "<" (la stringa JSON resta la stessa),
 * così il testo del database non può mai chiudere il tag script né aprirne uno nuovo.
 */
export function serializeJsonLd(data: JsonLdObject): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export type BreadcrumbItem = { name: string; url: string };

export function buildBreadcrumbList(items: BreadcrumbItem[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
