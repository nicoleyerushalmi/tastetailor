import { mkdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { test as setup, expect } from "playwright/test";

/** Defaults match the shared local test account; override via env. */
export const E2E_EMAIL = process.env.E2E_EMAIL ?? "test@test.com";
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "test12345678";
export const AUTH_FILE = path.join("e2e", ".auth", "user.json");

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

setup("authenticate test user", async ({ page }) => {
  loadEnvLocal();
  mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.locator('form[data-ready="true"]')).toBeVisible({
    timeout: 30_000,
  });

  await page.locator('input[name="email"]').fill(E2E_EMAIL);
  await page.locator('input[name="password"]').fill(E2E_PASSWORD);
  await expect(page.locator('input[name="email"]')).toHaveValue(E2E_EMAIL);

  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/(generate|onboarding)/, { timeout: 45_000 });

  if (page.url().includes("/onboarding")) {
    await page.getByLabel("Diet type").selectOption("vegetarian");
    await page.getByRole("button", { name: "Save and continue" }).click();
    await page.waitForURL(/\/generate/, { timeout: 30_000 });
  }

  await expect(page).toHaveURL(/\/generate/);
  await expect(page.getByRole("heading", { name: "Generate" })).toBeVisible();
  await page.context().storageState({ path: AUTH_FILE });
});
