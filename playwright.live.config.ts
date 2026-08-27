import { defineConfig, devices } from "playwright/test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/** Load .env.local so live keys are available without exporting them by hand. */
function loadEnvLocal() {
  const envPath = path.resolve(".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env) || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

/**
 * Opt-in live Gemini/Unsplash smoke. Not used by `npm run test:e2e`.
 * Requires free port 3000 (or PLAYWRIGHT_BASE_URL) and GEMINI_API_KEY.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  timeout: 240_000,
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
      name: "live",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      testMatch: /live\.spec\.ts/,
    },
  ],
  webServer: {
    command: "npx next dev --port 3000",
    url: baseURL,
    reuseExistingServer:
      !process.env.CI && process.env.PW_REUSE_SERVER === "1",
    timeout: 120_000,
    env: {
      ...process.env,
      AI_PROVIDER: "gemini",
    },
  },
});
