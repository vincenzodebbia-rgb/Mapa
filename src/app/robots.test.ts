import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

async function loadRobots() {
  return (await import("./robots")).default();
}

describe("robots.txt", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://mapa.example.org");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("without NEXT_PUBLIC_DEMO keeps the private areas out and points to the sitemap", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO", undefined);
    expect(await loadRobots()).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: ["/panel", "/profesionales", "/entrar", "/registro", "/invitacion/"] },
      sitemap: "https://mapa.example.org/sitemap.xml",
    });
  });

  it("on the demo site disallows nothing, so crawlers can read the noindex, and lists no sitemap", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO", "1");
    expect(await loadRobots()).toEqual({ rules: { userAgent: "*", allow: "/" } });
  });
});
