import { existsSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

// Sessione 6: "Nuevo evento" dal telefono su mapa-dev. Un'associazione di prova (dati inventati) creata con l'API admin,
// con sede e categoria abituale, così il modulo arriva precompilato. Alla fine si cancellano organizzazione e utente.
// ATTENZIONE: servono le migrazioni della sessione 6 su mapa-dev (grant insert (slug), trigger events_not_in_past):
// prima del db push del fondatore la pubblicazione fallisce.

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

test("sin sesión /panel/eventos/nuevo lleva a /entrar", async ({ page }) => {
  await page.goto("/panel/eventos/nuevo");
  await expect(page).toHaveURL(/\/entrar$/);
});
