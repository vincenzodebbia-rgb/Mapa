import { defineConfig, devices } from "@playwright/test";

// End-to-end tests start in session 3. Mobile first: the default project is a phone.
export default defineConfig({
  testDir: "./e2e",
  forbidOnly: Boolean(process.env.CI),
  use: { baseURL: "http://localhost:3000", trace: "on-first-retry" },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: !process.env.CI },
});
