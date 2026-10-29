import { defineConfig, devices } from "@playwright/test";

// End-to-end tests start in session 3. Mobile first: the default project is a phone.
export default defineConfig({
  testDir: "./e2e",
  // Il sito demo ha bisogno di un server suo con NEXT_PUBLIC_DEMO=1: npm run e2e:demo (playwright.demo.config.ts).
  testIgnore: "demo.spec.ts",
  forbidOnly: Boolean(process.env.CI),
  use: { baseURL: "http://localhost:3000", trace: "on-first-retry" },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: !process.env.CI },
});
