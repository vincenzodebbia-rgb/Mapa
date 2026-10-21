import { describe, expect, expectTypeOf, it } from "vitest";
import messages from "../../../messages/es.json";
import { interpolateMessage, lookupMessage, type MessageKey } from "./format";
import type { TranslationKey } from "./t";

const tree = {
  home: { title: "Hola, {name}", nested: { deep: "Abajo" } },
  empty: "",
} as const;

describe("lookupMessage", () => {
  it("returns the text at a dot path", () => {
    expect(lookupMessage(tree, "home.title")).toBe("Hola, {name}");
    expect(lookupMessage(tree, "home.nested.deep")).toBe("Abajo");
    expect(lookupMessage(tree, "empty")).toBe("");
  });

  it("throws on a missing key", () => {
    expect(() => lookupMessage(tree, "home.nope")).toThrow("Missing message: home.nope");
    expect(() => lookupMessage(tree, "home.title.more")).toThrow("Missing message");
  });

  it("throws when the key points to a group, not to a text", () => {
    expect(() => lookupMessage(tree, "home.nested")).toThrow("Message is not text: home.nested");
  });

  it("does not follow inherited properties", () => {
    expect(() => lookupMessage(tree, "toString")).toThrow("Missing message");
  });

  it("resolves every key of messages/es.json to a text", () => {
    expect(lookupMessage(messages, "home.comingSoon")).toBeTypeOf("string");
  });
});

describe("interpolateMessage", () => {
  it("replaces {variables}", () => {
    expect(interpolateMessage("Hola, {name}. Hay {count} eventos", { name: "Ana", count: 3 })).toBe(
      "Hola, Ana. Hay 3 eventos",
    );
  });

  it("leaves the text alone without values", () => {
    expect(interpolateMessage("Hola, {name}")).toBe("Hola, {name}");
  });

  it("keeps a placeholder that has no value", () => {
    expect(interpolateMessage("{a} y {b}", { a: "uno" })).toBe("uno y {b}");
  });

  it("inserts values as plain text, never as markup", () => {
    expect(interpolateMessage("{x}", { x: "<img src=x onerror=alert(1)>" })).toBe("<img src=x onerror=alert(1)>");
  });
});

describe("message keys", () => {
  it("lists only text leaves as dot paths", () => {
    expectTypeOf<MessageKey<typeof tree>>().toEqualTypeOf<"home.title" | "home.nested.deep" | "empty">();
  });

  it("accepts only keys that exist in messages/es.json (checked by npm run typecheck)", () => {
    const existing: TranslationKey = "home.comingSoon";
    // @ts-expect-error: una chiave che non esiste in messages/es.json deve fallire il typecheck.
    const missing: TranslationKey = "home.doesNotExist";
    expect([existing, missing]).toHaveLength(2);
  });
});
