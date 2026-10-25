import { describe, expect, it } from "vitest";
import { buildWhatsAppShareUrl, resolveShareUrl } from "./share-links";

const fallback = "https://mapa.example.org/e/coro-vecinal";

describe("resolveShareUrl", () => {
  it("shares the page being viewed, e.g. a Vercel preview, not the production domain", () => {
    const preview = { protocol: "https:", host: "mapa-git-feat-x.vercel.app", pathname: "/e/coro-vecinal" };
    expect(resolveShareUrl(preview, fallback)).toBe("https://mapa-git-feat-x.vercel.app/e/coro-vecinal");
  });

  it("keeps the port and drops nothing but query and hash", () => {
    const local = { protocol: "http:", host: "127.0.0.1:3000", pathname: "/e/coro-vecinal" };
    expect(resolveShareUrl(local, fallback)).toBe("http://127.0.0.1:3000/e/coro-vecinal");
  });

  it("falls back to the site URL without a browser or with a non-web scheme", () => {
    expect(resolveShareUrl(null, fallback)).toBe(fallback);
    expect(resolveShareUrl({ protocol: "file:", host: "", pathname: "/x" }, fallback)).toBe(fallback);
  });
});

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
