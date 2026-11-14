import { existsSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

// Sessione 6: "Nuevo evento" dal telefono su mapa-dev. Un'associazione di prova (dati inventati) creata con l'API admin,
// con sede e categoria abituale, così il modulo arriva precompilato. Alla fine si cancellano organizzazione e utente.
// ATTENZIONE: i test che pubblicano dal modulo aspettano la migrazione della sessione 6 su mapa-dev (default di slug)
// e i tipi rigenerati (senza il segnaposto dello slug in createEvent). Modifica e sicurezza usano eventi scritti con l'admin.

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const secretKey = process.env.SUPABASE_SECRET_KEY ?? "";
const DEV_PROJECT_REF = "jvthbqxmequhgliofnpb";

let admin: SupabaseClient;
const createdUserIds: string[] = [];
const createdOrganizationIds: string[] = [];

test.beforeAll(() => {
  expect(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL").not.toBe("");
  expect(secretKey, "SUPABASE_SECRET_KEY").not.toBe("");
  expect(new URL(supabaseUrl).hostname, "the e2e tests run only against mapa-dev").toBe(`${DEV_PROJECT_REF}.supabase.co`);
  admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
});

test.afterAll(async () => {
  for (const organizationId of createdOrganizationIds) {
    const deleted = await admin.from("organizations").delete().eq("id", organizationId);
    expect(deleted.error).toBeNull();
  }
  for (const userId of createdUserIds) {
    const deletedUser = await admin.auth.admin.deleteUser(userId);
    expect(deletedUser.error).toBeNull();
  }
});

/** Utente nuovo, membro di un'associazione di prova con sede a Carabanchel, con la sessione nel browser. */
async function signInAsAssociation(page: Page): Promise<string> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const created = await admin.auth.admin.createUser({ email: `e2e-${suffix}@example.org`, email_confirm: true });
  expect(created.error).toBeNull();
  const userId = created.data.user?.id ?? "";
  createdUserIds.push(userId);

  const organization = await admin
    .from("organizations")
    .insert({
      kind: "association",
      entity_type: "association",
      name: `Asociación e2e de eventos ${suffix} (ficticia)`,
      entry_method: "self_declared",
      address: "Calle Inventada 1",
      location: "SRID=4326;POINT(-3.7350 40.3890)",
      usual_category: "musica",
    })
    .select("id")
    .single();
  expect(organization.error).toBeNull();
  const organizationId = organization.data?.id ?? "";
  createdOrganizationIds.push(organizationId);
  const membership = await admin.from("memberships").insert({ user_id: userId, organization_id: organizationId });
  expect(membership.error).toBeNull();

  const link = await admin.auth.admin.generateLink({ type: "magiclink", email: `e2e-${suffix}@example.org` });
  expect(link.error).toBeNull();
  await page.goto(`/auth/confirm?token_hash=${link.data.properties?.hashed_token}&type=magiclink`);
  await expect(page).toHaveURL(/\/panel$/);
  return organizationId;
}

/** Giorno e ora a Madrid di un istante, come li vuole il modulo ("2026-11-13", "19:30"). */
function madridParts(date: Date): { day: string; time: string } {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
  return { day, time };
}

async function openNewEvent(page: Page) {
  await page.getByRole("link", { name: "Nuevo evento" }).click();
  await expect(page).toHaveURL(/\/panel\/eventos\/nuevo$/);
}

async function fillWhen(page: Page, start: Date, end: Date) {
  const from = madridParts(start);
  await page.getByLabel(/^Día/).fill(from.day);
  await page.getByLabel(/^Empieza/).fill(from.time);
  await page.getByLabel(/^Termina/).fill(madridParts(end).time);
}

test("un evento futuro se publica con solo título y hora, y abre su página", async ({ page }) => {
  await signInAsAssociation(page);
  await openNewEvent(page);
  // Precompilato: categoria abituale e sede dell'associazione.
  await expect(page.getByLabel(/^Tipo de evento/)).toHaveValue("musica");
  await expect(page.getByLabel(/^Dirección/)).toHaveValue("Calle Inventada 1");

  const startedAt = Date.now();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  tomorrow.setUTCHours(18, 0, 0, 0);
  await page.getByLabel(/^Título/).fill("Ensayo e2e de mañana");
  await fillWhen(page, tomorrow, new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000));
  await page.getByRole("button", { name: "Publicar" }).click();

  await expect(page).toHaveURL(/\/e\/ensayo-e2e-de-manana/);
  await expect(page.getByRole("heading", { level: 1, name: "Ensayo e2e de mañana" })).toBeVisible();
  // Obiettivo SPEC: meno di un minuto dal telefono (qui senza digitazione umana, solo come rete di sicurezza).
  expect(Date.now() - startedAt).toBeLessThan(60_000);
});

test("un evento de hoy lleva a la mapa Hoy con su punto abierto (D8)", async ({ page }) => {
  await signInAsAssociation(page);
  await openNewEvent(page);
  const start = new Date(Date.now() - 30 * 60 * 1000);
  await page.getByLabel(/^Título/).fill("Charla e2e de hoy");
  await fillWhen(page, start, new Date(Date.now() + 90 * 60 * 1000));
  await page.getByRole("button", { name: "Publicar" }).click();

  await expect(page).toHaveURL(/\/\?evento=charla-e2e-de-hoy/);
  await expect(page.getByTestId("map-view")).toHaveAttribute("data-opened", /:/, { timeout: 30_000 });
  await expect(page.locator(".maplibregl-popup").getByText("Charla e2e de hoy")).toBeVisible();
  // La home non resta ferma dopo una pubblicazione: l'evento c'è anche nella vista elenco, letta di nuovo.
  await page.goto("/?vista=lista");
  await expect(page.getByText("Charla e2e de hoy")).toBeVisible();
});

test("un título con HTML se muestra como texto", async ({ page }) => {
  await signInAsAssociation(page);
  await openNewEvent(page);
  const title = "<img src=x onerror=alert(1)>";
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  tomorrow.setUTCHours(17, 0, 0, 0);
  await page.getByLabel(/^Título/).fill(title);
  await fillWhen(page, tomorrow, new Date(tomorrow.getTime() + 60 * 60 * 1000));
  page.on("dialog", () => {
    throw new Error("an alert opened: HTML was not shown as text");
  });
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page).toHaveURL(/\/e\//);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
});

test("un evento ya terminado no se publica (D4)", async ({ page }) => {
  await signInAsAssociation(page);
  await openNewEvent(page);
  const yesterday = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  yesterday.setUTCHours(17, 0, 0, 0);
  await page.getByLabel(/^Título/).fill("Evento e2e pasado");
  await fillWhen(page, yesterday, new Date(yesterday.getTime() + 60 * 60 * 1000));
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByText("Este evento ya ha terminado")).toBeVisible();
  await expect(page).toHaveURL(/\/panel\/eventos\/nuevo$/);
});

test("Mis eventos muestra el evento publicado y se puede eliminar", async ({ page }) => {
  const organizationId = await signInAsAssociation(page);
  await openNewEvent(page);
  const later = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  later.setUTCHours(17, 0, 0, 0);
  await page.getByLabel(/^Título/).fill("Taller e2e para borrar");
  await fillWhen(page, later, new Date(later.getTime() + 60 * 60 * 1000));
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page).toHaveURL(/\/e\//);

  await page.goto("/panel");
  const list = page.getByRole("list", { name: "Mis eventos" });
  await expect(list.getByRole("link", { name: "Taller e2e para borrar" })).toBeVisible();
  page.once("dialog", (dialog) => void dialog.accept());
  await list.getByRole("button", { name: "Eliminar" }).first().click();
  await expect(page).toHaveURL(/\/panel\?evento=eliminado$/);
  await expect(page.getByText("Evento eliminado.")).toBeVisible();

  const remaining = await admin.from("events").select("id").eq("owner_org", organizationId);
  expect(remaining.error).toBeNull();
  expect(remaining.data).toHaveLength(0);
});

/** Evento futuro scritto direttamente con l'API admin (non dipende dal modulo né dalla migrazione della sessione 6). */
async function insertEvent(organizationId: string, title: string): Promise<{ id: string; slug: string }> {
  const start = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
  start.setUTCHours(17, 0, 0, 0);
  const inserted = await admin
    .from("events")
    .insert({
      title,
      category: "talleres",
      starts_at: start.toISOString(),
      ends_at: new Date(start.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      address: "Calle Inventada 1",
      location: "SRID=4326;POINT(-3.7350 40.3890)",
      owner_org: organizationId,
    })
    .select("id, slug")
    .single();
  expect(inserted.error).toBeNull();
  return { id: inserted.data?.id ?? "", slug: inserted.data?.slug ?? "" };
}

test("Editar cambia el título y deja el mismo enlace (decisión B)", async ({ page }) => {
  const organizationId = await signInAsAssociation(page);
  const event = await insertEvent(organizationId, "Taller e2e para editar");
  await page.goto("/panel");
  await page.getByRole("list", { name: "Mis eventos" }).getByRole("link", { name: "Editar", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/eventos/${event.id}$`));
  await expect(page.getByLabel(/^Título/)).toHaveValue("Taller e2e para editar");
  await page.getByLabel(/^Título/).fill("Taller e2e editado");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page).toHaveURL(/\/panel\?evento=guardado$/);
  await expect(page.getByText("Cambios guardados.")).toBeVisible();

  const saved = await admin.from("events").select("title, slug").eq("id", event.id).single();
  expect(saved.error).toBeNull();
  expect(saved.data).toEqual({ title: "Taller e2e editado", slug: event.slug });
  await page.goto(`/e/${event.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Taller e2e editado");
});

test("otra organización no edita ni elimina un evento que no es suyo", async ({ page, browser }) => {
  // A: titolare dell'evento (in un altro contesto del browser, solo per creare l'organizzazione).
  const otherContext = await browser.newContext();
  const ownerOrganizationId = await signInAsAssociation(await otherContext.newPage());
  await otherContext.close();
  const foreign = await insertEvent(ownerOrganizationId, "Evento e2e ajeno");
  const privateDescription = `Descripción privada e2e ${foreign.id.slice(0, 8)}`;
  const described = await admin.from("events").update({ description: privateDescription }).eq("id", foreign.id);
  expect(described.error).toBeNull();
  const ownerRow = await admin.from("organizations").select("name").eq("id", ownerOrganizationId).single();
  expect(ownerRow.error).toBeNull();

  // B: un'altra associazione, con un evento suo per avere i pulsanti.
  const organizationId = await signInAsAssociation(page);
  const own = await insertEvent(organizationId, "Evento e2e propio");

  // Niente controllo dello status qui: in sviluppo è 404, in produzione 200. La pagina è in streaming e un notFound()
  // che arriva dopo l'inizio della risposta lascia lo status a 200 (comportamento documentato di Next.js 16, con
  // noindex). Conta che non esca niente: si vede il "non trovato", nessun modulo e nessun dato dell'evento o
  // dell'organizzazione di A, né nella pagina né nell'HTML grezzo né nel payload RSC (docs/rapporti/sicurezza-2026-11.md, B15).
  const foreignUrl = `/panel/eventos/${foreign.id}`;
  // L'id dell'evento non è nella lista: è nell'URL chiesto da B, e Next.js lo ripete nello stato del router (parametri
  // della rotta) anche per un uuid inventato e senza sessione. Non è un dato letto dal database.
  const secrets = {
    title: "Evento e2e ajeno",
    description: privateDescription,
    slug: foreign.slug,
    ownerOrganizationId,
    ownerName: ownerRow.data?.name ?? "",
  };
  await page.goto(foreignUrl);
  await expect(page.getByText("This page could not be found.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Guardar cambios" })).toHaveCount(0);
  const html = await (await page.request.get(foreignUrl)).text();
  const rsc = await (await page.request.get(`${foreignUrl}?_rsc=e2e`, { headers: { RSC: "1" } })).text();
  for (const [where, body] of [
    ["pagina", await page.content()],
    ["HTML", html],
    ["RSC", rsc],
  ] as const) {
    for (const [label, secret] of Object.entries(secrets)) {
      expect(body, `${where} contiene ${label} ("${secret}")`).not.toContain(secret);
    }
  }

  // Modifica: il modulo del proprio evento con l'id dell'evento altrui nel campo nascosto.
  await page.goto(`/panel/eventos/${own.id}`);
  await page.locator('input[name="eventId"]').evaluate((input, id) => {
    (input as HTMLInputElement).value = id;
  }, foreign.id);
  await page.getByLabel(/^Título/).fill("Hackeado");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("No podéis publicar eventos con esta organización.")).toBeVisible();

  // Eliminazione: stesso trucco sul pulsante Eliminar.
  await page.goto("/panel");
  const list = page.getByRole("list", { name: "Mis eventos" });
  await list.locator('input[name="eventId"]').first().evaluate((input, id) => {
    (input as HTMLInputElement).value = id;
  }, foreign.id);
  page.once("dialog", (dialog) => void dialog.accept());
  await list.getByRole("button", { name: "Eliminar" }).first().click();
  await expect(page).toHaveURL(/\/panel\?evento=error$/);

  const untouched = await admin.from("events").select("title").eq("id", foreign.id).single();
  expect(untouched.error).toBeNull();
  expect(untouched.data?.title).toBe("Evento e2e ajeno");
});

test("sin sesión /panel/eventos/nuevo lleva a /entrar", async ({ page }) => {
  await page.goto("/panel/eventos/nuevo");
  await expect(page).toHaveURL(/\/entrar$/);
});

// "Mi panel" ed "Editar" (decisione del fondatore del 14 novembre). Sulle pagine statiche sono isole client che chiedono
// GET /sesion dopo il caricamento; sulle mappe Hoy e Conexiones li decide il server a ogni richiesta.

test("sin sesión no aparecen Mi panel, Editar ni enlaces a /entrar o /registro", async ({ page }) => {
  const seed = await admin.from("events").select("slug").eq("title", "Coro vecinal de prueba").limit(1).single();
  expect(seed.error).toBeNull();
  // Senza cookie di sessione le isole non chiamano nemmeno il server.
  const sessionRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/sesion") sessionRequests.push(request.url());
  });

  for (const path of ["/", "/conexiones", `/e/${seed.data?.slug}`, "/que-es"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("link", { name: "Mi panel" }), path).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Editar", exact: true }), path).toHaveCount(0);
    await expect(page.locator('a[href="/entrar"], a[href^="/registro"], a[href^="/panel"]'), path).toHaveCount(0);
  }
  expect(sessionRequests).toEqual([]);

  // La rotta stessa: risposta privata, mai in cache, solo booleani.
  const viewer = await page.request.get("/sesion");
  expect(viewer.headers()["cache-control"]).toContain("no-store");
  expect(await viewer.json()).toEqual({ signedIn: false, canEditEvent: false });
});

test("con sesión: Mi panel en todas partes, Editar solo en los eventos propios", async ({ page, browser }) => {
  // A: un'altra associazione con un evento (contesto separato, solo per crearla).
  const otherContext = await browser.newContext();
  const otherOrganizationId = await signInAsAssociation(await otherContext.newPage());
  await otherContext.close();
  const foreign = await insertEvent(otherOrganizationId, "Evento e2e de otra asociación");

  // B: chi guarda, con un evento suo.
  const organizationId = await signInAsAssociation(page);
  const own = await insertEvent(organizationId, "Evento e2e de la propia asociación");

  // Pagina dell'evento proprio: Mi panel ed Editar verso il modulo di modifica.
  await page.goto(`/e/${own.slug}`);
  await expect(page.getByRole("link", { name: "Mi panel" })).toHaveAttribute("href", "/panel");
  await expect(page.getByRole("link", { name: "Editar", exact: true })).toHaveAttribute("href", `/panel/eventos/${own.id}`);

  // Pagina dell'evento di A: Mi panel sì, Editar no (si aspetta la risposta di /sesion prima di controllare).
  const answered = page.waitForResponse((response) => new URL(response.url()).pathname === "/sesion");
  await page.goto(`/e/${foreign.slug}`);
  expect(await (await answered).json()).toEqual({ signedIn: true, canEditEvent: false });
  await expect(page.getByRole("link", { name: "Mi panel" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Editar", exact: true })).toHaveCount(0);

  // Mappa Hoy: popup del proprio evento con Editar, popup dell'evento di A senza.
  await page.goto(`/?evento=${own.slug}`);
  await expect(page.getByRole("link", { name: "Mi panel" })).toBeVisible();
  await expect(page.getByTestId("map-view")).toHaveAttribute("data-opened", /:/, { timeout: 30_000 });
  await expect(page.locator(".maplibregl-popup").getByRole("link", { name: "Editar" })).toHaveAttribute(
    "href",
    `/panel/eventos/${own.id}`,
  );
  await page.goto(`/?evento=${foreign.slug}`);
  await expect(page.getByTestId("map-view")).toHaveAttribute("data-opened", /:/, { timeout: 30_000 });
  await expect(page.locator(".maplibregl-popup").getByText("Evento e2e de otra asociación")).toBeVisible();
  await expect(page.locator(".maplibregl-popup").getByRole("link", { name: "Editar" })).toHaveCount(0);

  // Vista elenco (stessi elementi della mappa): Editar solo sul proprio evento.
  await page.goto("/?vista=lista");
  const ownItem = page.getByRole("listitem").filter({ hasText: "Evento e2e de la propia asociación" });
  const foreignItem = page.getByRole("listitem").filter({ hasText: "Evento e2e de otra asociación" });
  await expect(ownItem.getByRole("link", { name: "Editar" })).toHaveAttribute("href", `/panel/eventos/${own.id}`);
  await expect(foreignItem.getByRole("link", { name: "Editar" })).toHaveCount(0);

  // Conexiones: Mi panel.
  await page.goto("/conexiones");
  await expect(page.getByRole("link", { name: "Mi panel" })).toHaveAttribute("href", "/panel");
});
