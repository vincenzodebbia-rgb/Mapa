import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// Needs the seed of mapa-dev (docs/SPEC.md §15): fictitious organizations, events in the next 30 days,
// an event that ended 10 days ago, a suspended association and a professional who said no to Google.

const COLMENA = "/a/colectivo-vecinal-la-colmena-ficticio";

async function getSitemapPaths(request: APIRequestContext): Promise<string[]> {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  const xml = await response.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1] ?? "").pathname);
}

async function readJsonLd(page: Page): Promise<Record<string, unknown>[]> {
  const texts = await page.locator('script[type="application/ld+json"]').allTextContents();
  return texts.map((text) => JSON.parse(text) as Record<string, unknown>);
}

test("una pagina evento della seed contiene JSON-LD Event valido", async ({ page, request }) => {
  const eventPath = (await getSitemapPaths(request)).find((path) => path.startsWith("/e/"));
  expect(eventPath).toBeDefined();
  const response = await page.goto(eventPath ?? "/");
  expect(response?.status()).toBe(200);

  const title = (await page.getByRole("heading", { level: 1 }).textContent())?.trim();
  const event = (await readJsonLd(page)).find((block) => block["@type"] === "Event");
  expect(event).toMatchObject({
    "@context": "https://schema.org",
    "@type": "Event",
    name: title,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", address: { addressLocality: "Madrid" } },
  });
  const startDate = String(event?.startDate);
  const endDate = String(event?.endDate);
  expect(Date.parse(startDate)).toBeLessThan(Date.parse(endDate));
  const location = event?.location as { geo: { latitude: number; longitude: number } };
  // Madrid, roughly: coordinates come from PostGIS, not from typed text.
  expect(location.geo.latitude).toBeGreaterThan(40.3);
  expect(location.geo.latitude).toBeLessThan(40.6);
  expect(location.geo.longitude).toBeGreaterThan(-3.9);
  expect(location.geo.longitude).toBeLessThan(-3.5);
  expect(Array.isArray(event?.organizer) && event.organizer.length).toBeGreaterThan(0);

  await expect(page.getByRole("link", { name: "Enviar por WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\/\?text=/);
});

test("Compartir condivide l'indirizzo della pagina aperta, non quello del sito", async ({ page, request }) => {
  // Same server, another host name: like a Vercel preview, whose site URL is the production domain.
  const eventPath = (await getSitemapPaths(request)).find((path) => path.startsWith("/e/")) ?? "/";
  const otherOrigin = "http://127.0.0.1:3000";
  await page.goto(`${otherOrigin}${eventPath}`);
  const whatsapp = page.getByRole("link", { name: "Enviar por WhatsApp" });
  await expect(whatsapp).toHaveAttribute("href", new RegExp(encodeURIComponent(`${otherOrigin}${eventPath}`)));
  // The canonical stays on the site's own domain.
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^http:\/\/localhost:3000\//);
});

test("la scheda di un'associazione mostra storia, contatti e prossimi eventi", async ({ page }) => {
  const response = await page.goto(COLMENA);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Colectivo Vecinal La Colmena (ficticio)" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nuestra historia" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Web o red social" })).toHaveAttribute("href", "https://example.org/colmena");
  await expect(page.getByRole("list", { name: "Próximos eventos" }).getByRole("listitem").first()).toBeVisible();
  const organization = (await readJsonLd(page)).find((block) => block["@type"] === "Organization");
  expect(organization).toMatchObject({ name: "Colectivo Vecinal La Colmena (ficticio)" });
});

test("la pagina di un barrio con contenuto mostra mappa, eventi, associazioni e vicini", async ({ page }) => {
  const response = await page.goto("/barrio/opanel");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Qué pasa en Opañel" })).toBeVisible();
  await expect(page.getByTestId("map-view")).toHaveAttribute("data-points", /^[1-9]\d*$/, { timeout: 30_000 });
  await expect(page.getByRole("list", { name: "Asociaciones y espacios" }).getByRole("listitem").first()).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Barrios vecinos" }).getByRole("link").first()).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

test("un barrio vuoto ha noindex e non è nella sitemap", async ({ page, request }) => {
  const paths = await getSitemapPaths(request);
  const response = await page.goto("/barrio/atocha");
  expect(response?.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  expect(paths).not.toContain("/barrio/atocha");
});

test("la sitemap contiene solo pagine indicizzabili", async ({ request }) => {
  const paths = await getSitemapPaths(request);
  expect(paths).toEqual(expect.arrayContaining(["/", "/conexiones", "/que-es", "/legal", COLMENA, "/barrio/opanel"]));
  // Professional who turned off "Mostrar mi perfil en Google", suspended association, ended event, private areas.
  for (const excluded of [
    "/a/estudio-de-ilustracion-ficticio",
    "/a/asociacion-suspendida-de-ejemplo-ficticia",
    "/e/fiesta-de-otono-ya-pasada",
    "/panel",
    "/entrar",
    "/registro",
  ]) {
    expect(paths).not.toContain(excluded);
  }
  for (const path of paths) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(200);
    expect(await response.text(), path).not.toMatch(/<meta name="robots" content="noindex/);
  }
});

test("pagine inesistenti danno 404 vero, l'evento finito da 7 giorni un redirect permanente", async ({ request }) => {
  for (const path of ["/a/no-existe", "/e/no-existe", "/barrio/no-existe", "/a/asociacion-suspendida-de-ejemplo-ficticia"]) {
    expect((await request.get(path, { maxRedirects: 0 })).status(), path).toBe(404);
  }
  const redirect = await request.get("/e/fiesta-de-otono-ya-pasada", { maxRedirects: 0 });
  expect(redirect.status()).toBe(308);
  expect(new URL(redirect.headers().location ?? "", "http://localhost").pathname).toBe(COLMENA);
});

test("robots.txt esclude le aree private e indica la sitemap", async ({ request }) => {
  const text = await (await request.get("/robots.txt")).text();
  for (const path of ["/panel", "/profesionales", "/entrar", "/registro", "/invitacion/"]) {
    expect(text).toContain(`Disallow: ${path}`);
  }
  expect(text).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/);
});
