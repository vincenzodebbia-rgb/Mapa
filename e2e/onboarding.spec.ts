import { existsSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

// Iscrizione dal telefono su mapa-dev (seed: NIF fittizi G99000037 libero in elenco, G99000011 già usato).
// Gli utenti di prova si creano con l'API admin e si entra con il token_hash del link (nessuna email inviata).
// Alla fine si cancellano organizzazioni e utenti creati qui. Servono, nell'ambiente locale del fondatore,
// NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY e le chiavi di prova di Turnstile (passano sempre).

// The keys stay in the founder's local file: read by Node, never printed.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const secretKey = process.env.SUPABASE_SECRET_KEY ?? "";

// Questi test creano e cancellano utenti: solo su mapa-dev (lo stesso progetto di `npm run db:types`), mai in produzione.
const DEV_PROJECT_REF = "jvthbqxmequhgliofnpb";

let admin: SupabaseClient;
const createdUserIds: string[] = [];

test.beforeAll(() => {
  expect(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL").not.toBe("");
  expect(secretKey, "SUPABASE_SECRET_KEY").not.toBe("");
  expect(new URL(supabaseUrl).hostname, "the e2e tests run only against mapa-dev").toBe(`${DEV_PROJECT_REF}.supabase.co`);
  admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
});

test.afterAll(async () => {
  for (const userId of createdUserIds) {
    const memberships = await admin.from("memberships").select("organization_id").eq("user_id", userId);
    expect(memberships.error).toBeNull();
    for (const membership of memberships.data ?? []) {
      const deleted = await admin.from("organizations").delete().eq("id", membership.organization_id);
      expect(deleted.error).toBeNull();
    }
    const deletedUser = await admin.auth.admin.deleteUser(userId);
    expect(deletedUser.error).toBeNull();
  }
});

/** New confirmed user + session in the browser through /auth/confirm (the same route as the email link). */
async function signInAsNewUser(page: Page): Promise<string> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.org`;
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  expect(created.error).toBeNull();
  const userId = created.data.user?.id ?? "";
  createdUserIds.push(userId);
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  expect(link.error).toBeNull();
  await page.goto(`/auth/confirm?token_hash=${link.data.properties?.hashed_token}&type=magiclink`);
  return userId;
}

async function chooseType(page: Page, label: string) {
  await expect(page).toHaveURL(/\/registro$/);
  await page.getByRole("radio", { name: new RegExp(label) }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
}

async function fillAssociation(page: Page, nif: string) {
  await page.getByLabel(/^NIF/).fill(nif);
  await page.getByLabel(/^Nombre/).fill("Asociación de prueba e2e (ficticia)");
  await page.getByRole("checkbox", { name: /Somos una realidad de verdad/ }).check();
}

async function submit(page: Page) {
  // Turnstile test keys pass on their own: wait for the token before sending.
  await expect(page.locator('input[name="cf-turnstile-response"]')).not.toHaveValue("", { timeout: 15_000 });
  await page.getByRole("button", { name: "Registrarnos" }).click();
}

async function getOrganizationOf(userId: string) {
  const { data, error } = await admin
    .from("memberships")
    .select("organization:organizations(name, verified, flagged_for_review, flag_reason, entry_method)")
    .eq("user_id", userId)
    .maybeSingle();
  // Without this, "no organization" could pass on a failed query.
  expect(error).toBeNull();
  return data?.organization as
    | { name: string; verified: boolean; flagged_for_review: boolean; flag_reason: string | null; entry_method: string }
    | undefined;
}

test("una asociación del registro del Ayuntamiento se registra y llega a /panel verificada", async ({ page }) => {
  const userId = await signInAsNewUser(page);
  await chooseType(page, "Asociación");
  await page.getByLabel(/^NIF/).fill("G99000037");
  await page.getByRole("button", { name: "Comprobar en el registro del Ayuntamiento" }).click();
  await expect(page.getByText("¿Sois «ASOCIACION DE PRUEBA NUMERO TRES (FICTICIA)»?")).toBeVisible();
  await page.getByRole("button", { name: "Sí, usar este nombre" }).click();
  await expect(page.getByLabel(/^Nombre/)).toHaveValue("ASOCIACION DE PRUEBA NUMERO TRES (FICTICIA)");
  await page.getByRole("checkbox", { name: /Somos una realidad de verdad/ }).check();
  await submit(page);

  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hola, ASOCIACION DE PRUEBA NUMERO TRES (FICTICIA)");
  expect(await getOrganizationOf(userId)).toMatchObject({
    verified: true,
    flagged_for_review: false,
    flag_reason: null,
    entry_method: "municipal_registry",
  });

  // Back to /registro with an organization: straight to /panel.
  await page.goto("/registro");
  await expect(page).toHaveURL(/\/panel$/);
});

test("un NIF ya usado o personal no se acepta", async ({ page }) => {
  const userId = await signInAsNewUser(page);
  await chooseType(page, "Asociación");

  await fillAssociation(page, "G99000011");
  await submit(page);
  await expect(page.getByText("Este NIF ya está registrado")).toBeVisible();

  await fillAssociation(page, "12345678Z");
  await submit(page);
  await expect(page.getByText("No aceptamos DNI, NIE ni documentos personales")).toBeVisible();

  await fillAssociation(page, "B12345678");
  await submit(page);
  await expect(page.getByText("Este NIF no corresponde a este tipo de entidad")).toBeVisible();

  await expect(page).toHaveURL(/\/registro\?tipo=asociacion$/);
  expect(await getOrganizationOf(userId)).toBeUndefined();
});

test("una asociación fuera del registro entra con aviso para la revisión", async ({ page }) => {
  const userId = await signInAsNewUser(page);
  await chooseType(page, "Asociación");
  await fillAssociation(page, "G99900017");
  await submit(page);

  await expect(page).toHaveURL(/\/panel$/);
  expect(await getOrganizationOf(userId)).toMatchObject({
    verified: false,
    flagged_for_review: true,
    flag_reason: "not_in_registry",
    entry_method: "self_declared",
  });
});

test("las páginas privadas no se abren sin sesión", async ({ page }) => {
  await page.goto("/panel");
  await expect(page).toHaveURL(/\/entrar$/);
  const review = await page.goto("/revision");
  expect(review?.status()).toBe(404);
  await page.goto("/registro");
  await expect(page.getByLabel("Tu correo")).toBeVisible();
});

test("un enlace no válido vuelve a /entrar con un aviso", async ({ page }) => {
  await page.goto("/auth/confirm?token_hash=no-valido&type=email");
  await expect(page).toHaveURL(/\/entrar\?error=enlace$/);
  await expect(page.getByText("El enlace no es válido")).toBeVisible();
});

test("una actividad comercial sin NIF coloca el punto en el mapa y entra con aviso", async ({ page }) => {
  const userId = await signInAsNewUser(page);
  await chooseType(page, "Actividad comercial");
  await page.getByLabel(/^Nombre/).fill("Librería de prueba e2e (ficticia)");
  await page.getByLabel(/^Tipo de actividad/).selectOption("libreria");
  await page.getByLabel(/^¿Quiénes sois\?/).fill("Una librería de barrio inventada para las pruebas.");
  await page.getByLabel(/^¿Qué ofrecéis a nivel cultural\?/).fill("Presentaciones y lecturas inventadas.");
  await page.getByLabel(/^Dirección/).fill("Calle de Atocha 12, Madrid");
  await page.getByRole("button", { name: "Buscar en el mapa" }).click();
  await expect(page.getByTestId("location-picker")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("checkbox", { name: /Somos una realidad de verdad/ }).check();
  await submit(page);

  await expect(page).toHaveURL(/\/panel$/);
  expect(await getOrganizationOf(userId)).toMatchObject({ flagged_for_review: true, flag_reason: "no_nif" });
});
