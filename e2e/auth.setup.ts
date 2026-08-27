import { mkdirSync } from "node:fs";
import path from "node:path";
import { test as setup, expect } from "playwright/test";
import {
  AUTH_FILE_A,
  AUTH_FILE_B,
  E2E_EMAIL,
  E2E_EMAIL_B,
  E2E_PASSWORD,
  E2E_PASSWORD_B,
  loadEnvLocal,
} from "./env";

async function loginAndSave(
  page: import("playwright/test").Page,
  email: string,
  password: string,
  authFile: string,
) {
  mkdirSync(path.dirname(authFile), { recursive: true });

  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.locator('form[data-ready="true"]')).toBeVisible({
    timeout: 30_000,
  });

  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await expect(page.locator('input[name="email"]')).toHaveValue(email);

  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/(generate|onboarding)/, { timeout: 45_000 });

  if (page.url().includes("/onboarding")) {
    await page.getByLabel("Diet type").selectOption("vegetarian");
    await page.getByRole("button", { name: "Save and continue" }).click();
    await page.waitForURL(/\/generate/, { timeout: 30_000 });
  }

  await expect(page).toHaveURL(/\/generate/);
  await expect(page.getByRole("heading", { name: "Generate" })).toBeVisible();
  await page.context().storageState({ path: authFile });
}

setup("authenticate user A", async ({ page }) => {
  loadEnvLocal();
  await loginAndSave(page, E2E_EMAIL, E2E_PASSWORD, AUTH_FILE_A);
});

setup("authenticate user B", async ({ page }) => {
  loadEnvLocal();
  await loginAndSave(page, E2E_EMAIL_B, E2E_PASSWORD_B, AUTH_FILE_B);
});
