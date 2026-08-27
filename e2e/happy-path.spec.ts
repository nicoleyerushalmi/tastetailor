import { test, expect } from "playwright/test";
import { createScratchRecipe, generateScratchRecipe } from "./helpers";
import { AUTH_FILE_A, E2E_EMAIL, E2E_PASSWORD } from "./env";

test.describe("authenticated happy path (BP-01)", () => {
  test("login lands on generate when onboarded (FEAT-02)", async ({ page }) => {
    await page.goto("/generate");
    await expect(page.getByRole("heading", { name: "Generate" })).toBeVisible();
  });

  test("scratch generate → scale → favorite → shopping list → export", async ({
    page,
    context,
    request,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    const dish = `e2e herb bowl ${Date.now()}`;
    // Prefer API create for stability; still exercise detail → list UI.
    const { id } = await createScratchRecipe(request, dish);
    await page.goto(`/recipes/${id}`);

    await expect(page.getByText(/ingredients|steps|insights/i).first()).toBeVisible();

    const increase = page.getByRole("button", { name: "Increase servings" });
    await increase.click();
    await increase.click();

    const fav = page.getByRole("button", {
      name: /add to favorites|remove from favorites/i,
    });
    await fav.click();
    await expect(
      page.getByRole("button", { name: /remove from favorites/i }),
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "Add to shopping list" }).click();
    await expect(
      page.getByText(/added to your shopping list/i),
    ).toBeVisible({ timeout: 15_000 });

    await page.goto("/shopping-list");
    await expect(page.getByText(/to buy/i).first()).toBeVisible();
    await expect(page.getByRole("listitem").first()).toBeVisible();

    await page.getByRole("button", { name: "Export" }).click();
    await expect(page.getByText(/copied to clipboard/i)).toBeVisible();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain("Shopping list - TasteTailor");
  });
});

test.describe("recipe UI (FEAT-17, UI-03)", () => {
  test("cook mode opens and exits (FEAT-17, UI-06)", async ({ page, request }) => {
    const { id } = await createScratchRecipe(request, `cook mode ${Date.now()}`);
    await page.goto(`/recipes/${id}`);
    await page.getByRole("button", { name: "Cook mode" }).click();
    await expect(page.getByLabel("Cook mode")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByLabel("Cook mode")).toHaveCount(0);
  });

  test("generate overlay appears while generating (UI-03)", async ({ page }) => {
    await generateScratchRecipe(page, `overlay ${Date.now()}`);
  });
});

test.describe("history filters (FEAT-14, UI-04)", () => {
  test("filter chips update URL and list", async ({ page }) => {
    await page.goto("/history");
    await expect(page.getByRole("tablist", { name: "Filter recipes" })).toBeVisible();

    await page.getByRole("tab", { name: "From scratch" }).click();
    await expect(page).toHaveURL(/filter=scratch/);

    await page.getByRole("tab", { name: "Favorites" }).click();
    await expect(page).toHaveURL(/filter=favorites/);

    await page.getByRole("tab", { name: "All" }).click();
    await expect(page).toHaveURL(/\/history/);
  });
});

test.describe("auth session (AUTH-07)", () => {
  test("sign out clears session", async ({ browser }) => {
    // Isolated context so signing out does not kill the shared storage token
    // until we refresh the auth file for later projects (privilege).
    const context = await browser.newContext({ storageState: AUTH_FILE_A });
    const page = await context.newPage();
    await page.goto("/generate", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Generate" })).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
    await page.goto("/generate");
    await expect(page).toHaveURL(/\/login/);
    await context.close();

    // Re-login and rewrite storage — Sign out revokes the refresh token.
    const refresh = await browser.newContext();
    const refreshPage = await refresh.newPage();
    await refreshPage.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(refreshPage.locator('form[data-ready="true"]')).toBeVisible({
      timeout: 30_000,
    });
    await refreshPage.locator('input[name="email"]').fill(E2E_EMAIL);
    await refreshPage.locator('input[name="password"]').fill(E2E_PASSWORD);
    await refreshPage.getByRole("button", { name: "Log in" }).click();
    await refreshPage.waitForURL(/\/generate/, { timeout: 45_000 });
    await refresh.storageState({ path: AUTH_FILE_A });
    await refresh.close();
  });
});
