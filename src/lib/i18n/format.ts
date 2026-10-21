// Pure helpers behind t(): no messages file here, so tests do not depend on messages/es.json.

export type MessageTree = { readonly [key: string]: string | MessageTree };

/** Dot path of every text leaf in a message tree, e.g. "home.comingSoon". */
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

// A placeholder without a value stays visible, so a missing variable shows up in review instead of vanishing.
export function interpolateMessage(template: string, values?: MessageValues): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : placeholder,
  );
}
