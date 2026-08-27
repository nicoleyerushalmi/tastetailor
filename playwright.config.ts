import { defineConfig, devices } from "playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  timeout: 120_000,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "public",
      use: {
        ...devices["Desktop Chrome"],
        storageState: { cookies: [], origins: [] },
      },
      testMatch: /auth-gates\.spec\.ts/,
    },
    {
      name: "authenticated",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      testMatch: /.*\.spec\.ts/,
      testIgnore: /auth-gates\.spec\.ts|privilege\.spec\.ts|live\.spec\.ts/,
    },
    {
      name: "privilege",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        // Default context is user B; tests create an extra A context when needed.
        storageState: "e2e/.auth/user-b.json",
      },
      testMatch: /privilege\.spec\.ts/,
    },
  ],
  webServer: {
    command: "npx next dev --port 3000",
    url: baseURL,
    reuseExistingServer: !process.env.CI && process.env.PW_REUSE_SERVER === "1",
    timeout: 120_000,
    env: {
      ...process.env,
      AI_PROVIDER: "mock",
    },
  },
});
