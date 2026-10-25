import { describe, expect, it } from "vitest";
import { buildWhatsAppShareUrl } from "./share-links";

describe("buildWhatsAppShareUrl", () => {
  it("puts text and link in a single encoded text parameter", () => {
    const href = buildWhatsAppShareUrl("Coro vecinal & más", "https://mapa.example.org/e/coro-vecinal");
    expect(href).toBe(
      "https://wa.me/?text=Coro%20vecinal%20%26%20m%C3%A1s%20https%3A%2F%2Fmapa.example.org%2Fe%2Fcoro-vecinal",
    );
    const parsed = new URL(href);
    expect(parsed.origin).toBe("https://wa.me");
    expect([...parsed.searchParams.keys()]).toEqual(["text"]);
    expect(parsed.searchParams.get("text")).toBe("Coro vecinal & más https://mapa.example.org/e/coro-vecinal");
  });

  it("cannot be turned into another parameter or URL by the title", () => {
    const parsed = new URL(buildWhatsAppShareUrl("x&phone=123#frag", "https://mapa.example.org/e/x"));
    expect([...parsed.searchParams.keys()]).toEqual(["text"]);
    expect(parsed.hash).toBe("");
  });
});
