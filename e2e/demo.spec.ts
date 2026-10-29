import { expect, test, type Page } from "@playwright/test";

// Runs only against the demo server (playwright.demo.config.ts, NEXT_PUBLIC_DEMO=1) with the seed of mapa-dev.

const COLMENA = "/a/colectivo-vecinal-la-colmena-ficticio";
const BANNER = "Demo · datos de ejemplo";

// The sitemap is empty on the demo site: the event comes from the Colmena profile.
async function getSeedEventPath(page: Page): Promise<string> {
  await page.goto(COLMENA);
  const href = await page.getByRole("list", { name: "Próximos eventos" }).getByRole("link").first().getAttribute("href");
  expect(href).toMatch(/^\/e\//);
  return href ?? "/";
}

test("il banner demo si vede su ogni pagina", async ({ page }) => {
  for (const path of ["/", "/conexiones", "/que-es", COLMENA]) {
    await page.goto(path);
    await expect(page.getByRole("note"), path).toHaveText(BANNER);
    await expect(page.getByRole("note"), path).toBeInViewport();
  }
});

test("sul telefono il banner non fa scorrere le pagine mappa", async ({ page }) => {
  for (const path of ["/", "/conexiones"]) {
    await page.goto(path);
    await expect(page.getByTestId("map-view"), path).toHaveAttribute("data-points", /^\d+$/, { timeout: 30_000 });
    const { scrollHeight, innerHeight } = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
    }));
    expect(scrollHeight, path).toBeLessThanOrEqual(innerHeight);
    // The map starts right under the banner, not behind it.
    const banner = await page.getByRole("note").boundingBox();
    const main = await page.getByRole("main").boundingBox();
    expect(main?.y, path).toBeGreaterThanOrEqual((banner?.y ?? 0) + (banner?.height ?? 0) - 1);
  }
});

test("ogni pagina ha noindex nel meta e nell'header, anche /a, /e e /barrio", async ({ page, request }) => {
  const eventPath = await getSeedEventPath(page);
  for (const path of ["/", "/conexiones", "/que-es", "/legal", COLMENA, eventPath, "/barrio/opanel", "/barrio/atocha"]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()["x-robots-tag"], path).toBe("noindex, nofollow");
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]'), path).toHaveAttribute("content", "noindex, nofollow");
  }
});

test("robots.txt lascia entrare i crawler (niente Disallow) e non indica la sitemap", async ({ request }) => {
  const text = await (await request.get("/robots.txt")).text();
  expect(text).toContain("Allow: /");
  expect(text).not.toContain("Disallow");
  expect(text).not.toContain("Sitemap:");
});

test("la sitemap è vuota", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  expect(await response.text()).not.toContain("<url>");
});
