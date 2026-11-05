import { defineConfig, devices } from "@playwright/test";

// I test end-to-end partono dalla sessione 3. Prima il telefono: il progetto predefinito è un telefono.
export default defineConfig({
  testDir: "./e2e",
  // Il sito demo ha bisogno di un server suo con NEXT_PUBLIC_DEMO=1: npm run e2e:demo (playwright.demo.config.ts).
  testIgnore: "demo.spec.ts",
  forbidOnly: Boolean(process.env.CI),
  // Un solo worker: i test girano contro un unico `next dev` che compila ogni pagina al primo accesso, e con più
  // worker le prime visite vanno in timeout (succede da quando ci sono le pagine dell'iscrizione). Usano anche gli
  // stessi dati di mapa-dev.
  workers: 1,
  use: { baseURL: "http://localhost:3000", trace: "on-first-retry" },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: !process.env.CI },
});
