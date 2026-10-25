import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { resolveSiteUrl } = await import("./site-url");

describe("resolveSiteUrl", () => {
  it("uses NEXT_PUBLIC_SITE_URL when it is a valid URL, keeping only the origin", () => {
    expect(resolveSiteUrl({ siteUrl: "https://mapa.example.org/some/path", vercelUrl: "x.vercel.app" }).href).toBe(
      "https://mapa.example.org/",
    );
  });

  it("falls back to the Vercel production domain, then to the deployment URL", () => {
    expect(resolveSiteUrl({ vercelProductionUrl: "mapa.vercel.app", vercelUrl: "mapa-abc.vercel.app" }).href).toBe(
      "https://mapa.vercel.app/",
    );
    expect(resolveSiteUrl({ vercelUrl: "mapa-abc.vercel.app" }).href).toBe("https://mapa-abc.vercel.app/");
  });

  it("never throws: empty or invalid values end at localhost", () => {
    expect(resolveSiteUrl({ siteUrl: "", vercelProductionUrl: "", vercelUrl: "" }).href).toBe("http://localhost:3000/");
    expect(resolveSiteUrl({ siteUrl: "not a url" }).href).toBe("http://localhost:3000/");
    expect(resolveSiteUrl({ siteUrl: "javascript:alert(1)" }).href).toBe("http://localhost:3000/");
  });
});
