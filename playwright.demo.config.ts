import { defineConfig, devices } from "@playwright/test";

// The private demo site (NEXT_PUBLIC_DEMO=1): its own dev server on port 3001, started with the variable.
// Next.js allows one `next dev` per folder: stop any other dev server first, and run it after `npm run e2e`.
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
    // Never reuse: a server already on 3001 may have been started without the variable.
    reuseExistingServer: false,
  },
});
