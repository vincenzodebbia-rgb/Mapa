import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
// Hoisted: lo spy controllato dal test è proprio quello che chiama la sitemap, anche dopo vi.resetModules().
const getIndexableOrganizationSlugs = vi.hoisted(() =>
  vi.fn(async () => [{ slug: "colmena", updatedAt: "2026-10-01T10:00:00Z" }]),
);
vi.mock("@/features/organizations/data", () => ({ getIndexableOrganizationSlugs }));
vi.mock("@/features/events/data", () => ({ getIndexableEventSlugs: vi.fn(async () => ["coro"]) }));
vi.mock("@/features/map/data", () => ({ getNeighborhoodSlugsWithContent: vi.fn(async () => ["opanel"]) }));

async function loadSitemap() {
  return (await import("./sitemap")).default();
}

describe("sitemap.xml", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://mapa.example.org");
    getIndexableOrganizationSlugs.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("without NEXT_PUBLIC_DEMO lists the fixed pages and the indexable content", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO", undefined);
    const urls = (await loadSitemap()).map((entry) => entry.url);
    expect(urls).toEqual([
      "https://mapa.example.org/",
      "https://mapa.example.org/conexiones",
      "https://mapa.example.org/que-es",
      "https://mapa.example.org/legal",
      "https://mapa.example.org/a/colmena",
      "https://mapa.example.org/e/coro",
      "https://mapa.example.org/barrio/opanel",
    ]);
    expect(getIndexableOrganizationSlugs).toHaveBeenCalledOnce();
  });

  it("on the demo site is empty and never reads the database", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO", "1");
    expect(await loadSitemap()).toEqual([]);
    expect(getIndexableOrganizationSlugs).not.toHaveBeenCalled();
  });
});
