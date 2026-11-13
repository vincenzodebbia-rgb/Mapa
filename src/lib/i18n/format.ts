// Funzioni pure dietro t(): qui non c'è il file dei messaggi, così i test non dipendono da messages/es.json.

export type MessageTree = { readonly [key: string]: string | MessageTree };

/** Percorso con i punti di ogni testo in un albero di messaggi, per esempio "map.loading". */
export type MessageKey<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${MessageKey<T[K]>}`;
}[keyof T & string];

export type MessageValues = Readonly<Record<string, string | number>>;

export function lookupMessage(tree: MessageTree, key: string): string {
  let node: string | MessageTree = tree;
  for (const part of key.split(".")) {
    if (typeof node === "string" || !Object.hasOwn(node, part)) {
      throw new Error(`Missing message: ${key}`);
    }
    node = node[part];
  }
  if (typeof node !== "string") throw new Error(`Message is not text: ${key}`);
  return node;
}

// Un segnaposto senza valore resta visibile, così una variabile mancante si nota in revisione invece di sparire.
export function interpolateMessage(template: string, values?: MessageValues): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : placeholder,
  );
}
