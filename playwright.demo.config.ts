import { defineConfig, devices } from "@playwright/test";

// Il sito demo privato (NEXT_PUBLIC_DEMO=1): un dev server tutto suo sulla porta 3001, avviato con la variabile.
// Next.js permette un solo `next dev` per cartella: prima spegni ogni altro dev server, e lancialo dopo `npm run e2e`.
export default defineConfig({
  testDir: "./e2e",
  testMatch: "demo.spec.ts",
  forbidOnly: Boolean(process.env.CI),
  use: { baseURL: "http://localhost:3001", trace: "on-first-retry" },
  projects: [{ name: "mobile-demo", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: "npm run dev -- --port 3001",
    url: "http://localhost:3001",
    env: { NEXT_PUBLIC_DEMO: "1" },
    // Mai riusarlo: un server già acceso sulla 3001 potrebbe essere partito senza la variabile.
    reuseExistingServer: false,
  },
});
