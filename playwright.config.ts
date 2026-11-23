import { defineConfig, devices } from "@playwright/test";

const TEST_DB = process.env.TEST_DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/cave_test";

/** Test de bout en bout sur la base de TEST. Lancer d'abord `npm run build`. */
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/integration/setup.ts",
  use: { baseURL: "http://localhost:3100", trace: "off", locale: "fr-FR", timezoneId: "Europe/Paris" },
  projects: [
    { name: "ordinateur", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"], viewport: { width: 360, height: 760 } } },
  ],
  webServer: {
    command: "npx next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    env: { DATABASE_URL: TEST_DB, GEOCODE_URL: process.env.GEOCODE_URL || "", SITE_URL: "http://localhost:3100", MAIL_OUTBOX_DIR: "test-results/outbox-e2e" },
  },
});
