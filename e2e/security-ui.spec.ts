import { test, expect } from "playwright/test";
import { createScratchRecipe } from "./helpers";
import { AUTH_FILE_A, clientFromStorageState } from "./env";

test.describe("security untrusted content (SEC-02/03, UI-09)", () => {
  test("SEC-02/03: hostile title escaped; javascript source is not a link", async ({
    page,
  }) => {
    const { id } = await createScratchRecipe(
      page.request,
      `sec-hostile ${Date.now()}`,
    );

    const supabase = await clientFromStorageState(AUTH_FILE_A);
    const { error } = await supabase
      .from("recipes")
      .update({
        title: '<script>alert("xss")</script> Safe Bowl',
        insights: {
          summary: "Seeded for SEC tests",
          substitutions: [],
          sources: [
            {
              label: "Evil source",
              url: "javascript:alert(1)",
              note: "should not be a link",
            },
            {
              label: "Good source",
              url: "https://example.com/recipe",
              note: "ok",
            },
          ],
        },
      })
      .eq("id", id);
    expect(error).toBeNull();

    let dialogFired = false;
    page.on("dialog", async (dialog) => {
      dialogFired = true;
      await dialog.dismiss();
    });

    await page.goto(`/recipes/${id}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Safe Bowl",
    );
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "<script>",
    );
    await expect(page.locator("h1 script")).toHaveCount(0);
    expect(dialogFired).toBe(false);

    const evil = page.getByText("Evil source");
    await expect(evil).toBeVisible();
    await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);

    const good = page.getByRole("link", { name: "Good source" });
    await expect(good).toBeVisible();
    await expect(good).toHaveAttribute("href", "https://example.com/recipe");
    await expect(good).toHaveAttribute("rel", /noopener/);
    await expect(good).toHaveAttribute("target", "_blank");
  });

  test("UI-09: photo credit shown when image metadata set", async ({ page }) => {
    const { id } = await createScratchRecipe(
      page.request,
      `credit ${Date.now()}`,
    );
    const supabase = await clientFromStorageState(AUTH_FILE_A);
    await supabase
      .from("recipes")
      .update({
        image_url: "https://images.unsplash.com/photo-test",
        image_alt: "seeded photo",
        image_credit_name: "Test Photographer",
        image_credit_url: "https://unsplash.com/@test",
      })
      .eq("id", id);

    await page.goto(`/recipes/${id}`);
    await expect(page.getByText(/photo by/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Test Photographer" }),
    ).toHaveAttribute("href", "https://unsplash.com/@test");
  });

  test("SEC-09: non-Unsplash image_url is not fetched from the bad host", async ({
    page,
  }) => {
    const { id } = await createScratchRecipe(
      page.request,
      `bad-host ${Date.now()}`,
    );
    const supabase = await clientFromStorageState(AUTH_FILE_A);
    await supabase
      .from("recipes")
      .update({
        image_url: "https://evil.example/photo.jpg",
        image_alt: "blocked host",
        image_credit_name: "Nope",
        image_credit_url: "https://evil.example",
      })
      .eq("id", id);

    const badRequests: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("evil.example")) badRequests.push(req.url());
    });

    await page.goto(`/recipes/${id}`, { waitUntil: "networkidle" });
    expect(badRequests).toHaveLength(0);
  });
});

test.describe("UI layout (UI-02, UI-10, UI-12)", () => {
  test("UI-02: auth form usable on desktop and mobile", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /log in/i })).toBeVisible();

    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.getByRole("link", { name: "TasteTailor" }).first()).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("heading", { name: /log in/i })).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await context.close();
  });

  test("UI-10: mobile nav drawer opens and closes", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/generate");
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("navigation", { name: /app mobile/i })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("navigation", { name: /app mobile/i })).toHaveCount(0);
  });

  test("UI-12: ai_unavailable copy shown on refine", async ({ page }) => {
    const { id } = await createScratchRecipe(
      page.request,
      `busy ${Date.now()}`,
    );

    await page.route(`**/api/recipes/${id}/refine`, async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "ai_unavailable",
          message:
            "The AI service is temporarily busy. Please try again in a moment.",
        }),
      });
    });

    await page.goto(`/recipes/${id}`);
    await page.getByPlaceholder(/what would you like to change/i).fill("make it vegan");
    await page.getByRole("button", { name: "Update recipe" }).click();
    await expect(page.getByText(/temporarily busy/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});
