import { existsSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

// Sessione 7 (docs/piani/sessione-7.md): Mi ficha, Mi cuenta, Archivo, Ayuda y contacto, su mapa-dev dal telefono.
// Realtà di prova inventate, create con l'API admin e cancellate alla fine.
// Servono la migrazione 20261114133035_profile_account su mapa-dev (vecchi slug, update_my_profile).

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const secretKey = process.env.SUPABASE_SECRET_KEY ?? "";
const DEV_PROJECT_REF = "jvthbqxmequhgliofnpb";

let admin: SupabaseClient;
const createdUserIds = new Set<string>();
const createdOrganizationIds = new Set<string>();

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

type TestRealm = { userId: string; email: string; organizationId: string; slug: string; name: string };

/** Utente nuovo con una realtà di prova (associazione con sede, oppure "Gente que hace cosas"), già con la sessione. */
async function signInWithRealm(page: Page, kind: "association" | "professional"): Promise<TestRealm> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `e2e-${suffix}@example.org`;
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  expect(created.error).toBeNull();
  const userId = created.data.user?.id ?? "";
  createdUserIds.add(userId);

  const name = kind === "association" ? `Asociación e2e ficha ${suffix} (ficticia)` : `Estudio e2e ficha ${suffix} (ficticio)`;
  const organization = await admin
    .from("organizations")
    .insert(
      kind === "association"
        ? {
            kind,
            entity_type: "association",
            name,
            entry_method: "self_declared",
            address: "Calle Inventada 1",
            location: "SRID=4326;POINT(-3.7350 40.3890)",
          }
        : { kind, entity_type: "informal", name, one_liner: "Ilustración inventada", entry_method: "email_only" },
    )
    .select("id, slug")
    .single();
  expect(organization.error).toBeNull();
  const organizationId = organization.data?.id ?? "";
  createdOrganizationIds.add(organizationId);
  expect((await admin.from("memberships").insert({ user_id: userId, organization_id: organizationId })).error).toBeNull();
  if (kind === "association") {
    expect((await admin.from("organization_answers").insert({ organization_id: organizationId })).error).toBeNull();
  }

  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  expect(link.error).toBeNull();
  await page.goto(`/auth/confirm?token_hash=${link.data.properties?.hashed_token}&type=magiclink`);
  await expect(page).toHaveURL(/\/panel$/);
  return { userId, email, organizationId, slug: organization.data?.slug ?? "", name };
}

test("Mi ficha guarda contactos e historia, y la ficha pública los muestra", async ({ page }) => {
  const realm = await signInWithRealm(page, "association");
  await page.getByRole("link", { name: "Mi ficha" }).click();
  await expect(page).toHaveURL(/\/panel\/ficha$/);
  await expect(page.getByLabel(/^Nombre/)).toHaveValue(realm.name);
  // NIF e tipo di entità non sono nel modulo.
  await expect(page.getByLabel(/NIF/)).toHaveCount(0);

  await page.getByLabel(/^Qué hacéis, en una frase/).fill("Un coro de vecinos inventado");
  await page.getByLabel(/^Correo/).fill("hola@asociacion-e2e.example");
  await page.getByLabel(/^Web o red social/).fill("https://example.org/e2e");
  await page.getByLabel(/^Nuestra historia/).fill("Empezamos en un garaje inventado.");
  await page.getByRole("button", { name: "Guardar la ficha" }).click();
  await expect(page).toHaveURL(/\/panel\?ficha=guardada$/);
  await expect(page.getByText("Ficha guardada.")).toBeVisible();

  await page.goto(`/a/${realm.slug}`);
  await expect(page.getByText("Un coro de vecinos inventado")).toBeVisible();
  await expect(page.getByText("Empezamos en un garaje inventado.")).toBeVisible();
  await expect(page.getByRole("link", { name: /hola@asociacion-e2e\.example/ })).toHaveAttribute(
    "href",
    "mailto:hola@asociacion-e2e.example",
  );
});

test("Mi ficha rechaza un correo que no es válido", async ({ page }) => {
  await signInWithRealm(page, "association");
  await page.goto("/panel/ficha");
  await page.getByLabel(/^Correo/).fill("x@y.es?bcc=otro@z.es");
  await page.getByRole("button", { name: "Guardar la ficha" }).click();
  await expect(page.getByText("Revisa el correo: no parece válido.")).toBeVisible();
  await expect(page).toHaveURL(/\/panel\/ficha$/);
});

test("cambiar el nombre cambia la dirección y la antigua lleva a la nueva", async ({ page, request }) => {
  const realm = await signInWithRealm(page, "association");
  await page.goto("/panel/ficha");
  const newName = `Asociación renombrada e2e ${Date.now()} (ficticia)`;
  await page.getByLabel(/^Nombre/).fill(newName);
  await page.getByRole("button", { name: "Guardar la ficha" }).click();
  await expect(page).toHaveURL(/\/panel\?ficha=guardada$/);

  const saved = await admin.from("organizations").select("slug").eq("id", realm.organizationId).single();
  expect(saved.error).toBeNull();
  const newSlug = saved.data?.slug ?? "";
  expect(newSlug).not.toBe(realm.slug);

  // Il vecchio indirizzo rimanda al nuovo con un redirect permanente; il panel porta al nuovo.
  const old = await request.get(`/a/${realm.slug}`, { maxRedirects: 0 });
  expect(old.status()).toBe(308);
  expect(new URL(old.headers().location ?? "", "http://localhost").pathname).toBe(`/a/${newSlug}`);
  await page.goto("/panel");
  await expect(page.getByRole("link", { name: "Ver vuestra ficha pública" })).toHaveAttribute("href", `/a/${newSlug}`);
});

test("Gente que hace cosas puede quitar su perfil de Google", async ({ page }) => {
  const realm = await signInWithRealm(page, "professional");
  await page.goto("/panel/ficha");
  // Niente indirizzo né storia per "Gente que hace cosas".
  await expect(page.getByLabel(/^Dirección/)).toHaveCount(0);
  await expect(page.getByLabel(/^Nuestra historia/)).toHaveCount(0);
  const google = page.getByRole("checkbox", { name: /Mostrar mi perfil en Google/ });
  await expect(google).toBeChecked();
  await google.uncheck();
  await page.getByRole("button", { name: "Guardar la ficha" }).click();
  await expect(page).toHaveURL(/\/panel\?ficha=guardada$/);

  await page.goto(`/a/${realm.slug}`);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("Mi cuenta descarga mis datos en JSON, solo con sesión", async ({ page, browser }) => {
  const realm = await signInWithRealm(page, "association");
  await page.goto("/panel/cuenta");
  const download = await page.request.get("/panel/cuenta/datos");
  expect(download.status()).toBe(200);
  expect(download.headers()["cache-control"]).toContain("no-store");
  expect(download.headers()["content-disposition"]).toMatch(/^attachment; filename="mis-datos-\d{4}-\d{2}-\d{2}\.json"$/);
  const data = (await download.json()) as { user?: { email?: string }; organization?: { name?: string } };
  expect(data.user?.email).toBe(realm.email);
  expect(data.organization?.name).toBe(realm.name);

  // Senza sessione: niente dati, rimanda a /entrar.
  const anonymous = await browser.newContext();
  const response = await anonymous.request.get("/panel/cuenta/datos", { maxRedirects: 0 });
  expect(response.status()).toBe(303);
  expect(response.headers().location).toMatch(/\/entrar$/);
  await anonymous.close();
});

test("Eliminar cuenta pide la palabra y borra cuenta, realidad y eventos", async ({ page }) => {
  const realm = await signInWithRealm(page, "association");
  const event = await admin
    .from("events")
    .insert({
      title: "Evento e2e de una cuenta que se borra",
      category: "musica",
      starts_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
      address: "Calle Inventada 1",
      location: "SRID=4326;POINT(-3.7350 40.3890)",
      owner_org: realm.organizationId,
    })
    .select("id")
    .single();
  expect(event.error).toBeNull();

  await page.goto("/panel/cuenta");
  await expect(page.getByText(/se borran también, para siempre/)).toBeVisible();

  await page.getByLabel(/escribe ELIMINAR/).fill("eliminar");
  await page.getByRole("button", { name: "Eliminar la cuenta para siempre" }).click();
  await expect(page.getByText("Escribe ELIMINAR, en mayúsculas, para confirmar.")).toBeVisible();
  expect((await admin.from("organizations").select("id").eq("id", realm.organizationId)).data).toHaveLength(1);

  await page.getByLabel(/escribe ELIMINAR/).fill("ELIMINAR");
  await page.getByRole("button", { name: "Eliminar la cuenta para siempre" }).click();
  await expect(page).toHaveURL(/\/$/);

  expect((await admin.from("organizations").select("id").eq("id", realm.organizationId)).data).toHaveLength(0);
  expect((await admin.from("events").select("id").eq("id", event.data?.id ?? "")).data).toHaveLength(0);
  expect((await admin.auth.admin.getUserById(realm.userId)).data.user).toBeNull();
  createdOrganizationIds.delete(realm.organizationId);
  createdUserIds.delete(realm.userId);

  // La sessione non c'è più e la ficha non esiste più.
  await page.goto("/panel");
  await expect(page).toHaveURL(/\/entrar$/);
  await page.goto(`/a/${realm.slug}`);
  await expect(page.getByText("This page could not be found.")).toBeVisible();
});

test("el panel muestra Archivo y Ayuda y contacto", async ({ page }) => {
  const realm = await signInWithRealm(page, "association");
  const past = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const inserted = await admin.from("events").insert({
    title: "Evento e2e ya hecho",
    category: "musica",
    starts_at: new Date(past.getTime() - 60 * 60 * 1000).toISOString(),
    ends_at: past.toISOString(),
    address: "Calle Inventada 1",
    location: "SRID=4326;POINT(-3.7350 40.3890)",
    owner_org: realm.organizationId,
  });
  expect(inserted.error).toBeNull();

  await page.goto("/panel");
  await expect(page.getByRole("heading", { name: "Archivo" })).toBeVisible();
  await expect(page.getByText("Eventos hechos este año: 1")).toBeVisible();
  await expect(page.getByText("Eventos hechos en total: 1")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ayuda y contacto" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Aviso legal y privacidad" }).first()).toHaveAttribute("href", "/legal");
});
