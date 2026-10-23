import { defineConfig, devices } from "@playwright/test";

// E2E: yerel Postgres + sahte veri + geliştirme girişi. E2E_DATABASE_URL zorunlu.
const db = process.env.E2E_DATABASE_URL ?? "postgres://postgres@127.0.0.1:54329/tayfa_e2e";
const port = 3200;

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: `http://localhost:${port}`,
    ...devices["Pixel 7"],
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
  },
  webServer: {
    command: `pnpm dev -p ${port}`,
    port,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { DATABASE_URL: db, DEV_AUTH: "1" },
  },
});
