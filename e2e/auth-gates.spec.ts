import { test, expect } from "playwright/test";

/**
 * E2E specs map to AUTH / UI / FEAT IDs in docs/TESTING.md.
 * Anonymous gates only — authenticated journeys live in happy-path.spec.ts.
 */

test.describe("public / auth gates", () => {
  test("UI-01: landing shows TasteTailor brand and CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/TasteTailor/i).first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: /get started|sign up|log in/i }).first(),
    ).toBeVisible();
  });

  test("AUTH-01: anonymous /generate redirects to login", async ({ page }) => {
    await page.goto("/generate");
    await expect(page).toHaveURL(/\/login/);
  });

  test("AUTH-06: login page is reachable when logged out", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /log in|welcome/i })).toBeVisible();
  });
});

test.describe("API auth gates (no session cookie)", () => {
  test("AUTH-02: POST /api/generate without session → 401", async ({
    request,
  }) => {
    const res = await request.post("/api/generate", {
      data: { mode: "scratch", dish_name: "soup" },
    });
    expect(res.status()).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ error: "unauthorized" });
  });
});
