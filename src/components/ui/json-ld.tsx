import { serializeJsonLd, type JsonLdObject } from "@/lib/seo/json-ld";

/**
 * Dati schema.org per i motori di ricerca. React 19 scrive il testo figlio di uno <script> così com'è
 * (senza entità HTML), quindi non serve dangerouslySetInnerHTML; serializeJsonLd neutralizza "<".
 */
export function JsonLd({ data }: { data: JsonLdObject }) {
  return <script type="application/ld+json">{serializeJsonLd(data)}</script>;
}
