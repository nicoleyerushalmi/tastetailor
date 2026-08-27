import { expect, type APIRequestContext, type Page } from "playwright/test";

/** Create a scratch recipe through the API (uses storage-state cookies). */
export async function createScratchRecipe(
  request: APIRequestContext,
  dishName: string,
) {
  const response = await request.post("/api/generate", {
    data: {
      mode: "scratch",
      dish_name: dishName,
    },
  });
  const body = await response.json().catch(() => ({}));
  expect(
    response.ok(),
    `generate failed: ${response.status()} ${JSON.stringify(body)}`,
  ).toBeTruthy();
  const id = body.recipe?.id as string;
  expect(id).toBeTruthy();
  return { id, recipe: body.recipe };
}

/** Open generate UI, submit from-scratch form, land on detail. */
export async function generateScratchRecipe(page: Page, dishName: string) {
  await page.goto("/generate?tab=scratch", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Generate" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "From scratch" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  const dish = page.locator('input[name="dish_name"]');
  await dish.click();
  await dish.fill(dishName);
  await expect(dish).toHaveValue(dishName);

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/generate") &&
      response.request().method() === "POST",
    { timeout: 120_000 },
  );

  await page.getByRole("button", { name: "Generate recipe" }).click();
  await expect(page.getByLabel("Generating recipe")).toBeVisible({
    timeout: 15_000,
  });

  const response = await responsePromise;
  const body = await response.json().catch(() => ({}));
  expect(
    response.ok(),
    `generate failed: ${response.status()} ${JSON.stringify(body)}`,
  ).toBeTruthy();

  await page.waitForURL(/\/recipes\/[0-9a-f-]+/i, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}
