import { serializeJsonLd, type JsonLdObject } from "@/lib/seo/json-ld";

/**
 * schema.org data for search engines. React 19 writes a <script>'s text child as raw text
 * (no HTML entities), so no dangerouslySetInnerHTML is needed; serializeJsonLd escapes "<".
 */
export function JsonLd({ data }: { data: JsonLdObject }) {
  return <script type="application/ld+json">{serializeJsonLd(data)}</script>;
}
