// Structured data (schema.org) for search engines. Pure: no data access, no React.

export type JsonLdValue = string | number | boolean | null | JsonLdValue[] | { [key: string]: JsonLdValue | undefined };
export type JsonLdObject = { [key: string]: JsonLdValue | undefined };

/**
 * JSON for a <script type="application/ld+json">. Every "<" becomes "<" (still the same JSON string),
 * so text from the database can never close the script tag or open a new one.
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
