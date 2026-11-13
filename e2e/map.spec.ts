import { expect, test, type Page } from "@playwright/test";

// Ha bisogno della seed di mapa-dev (docs/SPEC.md §15): gli eventi settimanali tengono viva la mappa ogni giorno.

async function readDrawnPoints(page: Page, path: string): Promise<number> {
  await page.goto(path);
  const map = page.getByTestId("map-view");
  // data-rendered-points conta i punti che MapLibre ha davvero disegnato, non solo i dati che ha ricevuto.
  await expect(map).toHaveAttribute("data-rendered-points", /^[1-9]\d*$/, { timeout: 30_000 });
  return Number(await map.getAttribute("data-points"));
}

async function countListItems(page: Page, path: string, listName: string): Promise<number> {
  await page.goto(path);
  // L'elenco arriva in streaming dopo il guscio statico (Suspense): si aspetta prima di contare.
  const list = page.getByRole("list", { name: listName });
  await expect(list).toBeAttached();
  return list.getByRole("listitem").count();
}

test("la home mostra almeno un punto dalla seed e la vista elenco mostra lo stesso numero di elementi", async ({
  page,
}) => {
  const points = await readDrawnPoints(page, "/");
  expect(points).toBeGreaterThan(0);
  expect(await countListItems(page, "/?vista=lista", "Eventos")).toBe(points);
});

test("Solo hoy lascia solo gli eventi di oggi, nella mappa e nell'elenco", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("switch");
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await toggle.click();
  await expect(page).toHaveURL(/solo=hoy/);
  await expect(page.getByRole("switch")).toHaveAttribute("aria-checked", "true");

  const all = await countListItems(page, "/?vista=lista", "Eventos");
  const today = await countListItems(page, "/?vista=lista&solo=hoy", "Eventos");
  expect(today).toBeLessThanOrEqual(all);
  const map = page.getByTestId("map-view");
  await page.goto("/?solo=hoy");
  await expect(map).toHaveAttribute("data-points", String(today));
});

test("/conexiones mostra chi c'è e la vista elenco ha lo stesso numero di elementi", async ({ page }) => {
  const points = await readDrawnPoints(page, "/conexiones");
  expect(points).toBeGreaterThan(0);
  expect(await countListItems(page, "/conexiones?vista=lista", "Asociaciones y espacios")).toBe(points);
});

test("un filtro sconosciuto nell'URL non rompe la pagina", async ({ page }) => {
  const response = await page.goto("/?precio=barato&cat=%3Cscript%3E&barrio=..%2Fetc");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("switch")).toBeVisible();
});
