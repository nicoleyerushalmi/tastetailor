import { expect, type APIRequestContext, type Page } from "playwright/test";
import { AUTH_FILE_A, clientFromStorageState, userIdFromStorageState } from "./env";

/** Reset the daily generation counter so E2E can keep creating recipes. */
export async function resetGenerationBudget(storagePath: string = AUTH_FILE_A) {
  await setGenerationBudget(0, storagePath);
}

/** Set daily_generation_count (and push reset_at into the future). */
export async function setGenerationBudget(
  count: number,
  storagePath: string = AUTH_FILE_A,
) {
  const supabase = await clientFromStorageState(storagePath);
  const userId = await userIdFromStorageState(storagePath);
  const resetAt = new Date();
  resetAt.setUTCDate(resetAt.getUTCDate() + 1);
  const { error } = await supabase
    .from("profiles")
    .update({
      daily_generation_count: count,
      generation_count_reset_at: resetAt.toISOString(),
    })
    .eq("id", userId);
  if (error) {
    throw new Error(`setGenerationBudget failed: ${error.message}`);
  }
}

export function generationsPerDayFromEnv(): number {
  const raw = process.env.GENERATIONS_PER_DAY;
  const parsed = raw ? Number.parseInt(raw, 10) : 20;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
}

/** Create a scratch recipe through the API (uses storage-state cookies). */
export async function createScratchRecipe(
  request: APIRequestContext,
  dishName: string,
  options?: { storagePath?: string },
) {
  await resetGenerationBudget(options?.storagePath ?? AUTH_FILE_A);

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
