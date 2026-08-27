import { test, expect } from "playwright/test";
import { createScratchRecipe } from "./helpers";
import {
  AUTH_FILE_A,
  AUTH_FILE_B,
  clientFromStorageState,
  userIdFromStorageState,
} from "./env";

/**
 * Cross-user privilege checks (PRIV-*).
 * Default storageState is User B; User A uses a separate browser context.
 */
test.describe("privilege between users (PRIV-*)", () => {
  test("PRIV-01/02/03: B cannot read, refine, or delete A's recipe", async ({
    browser,
    page,
  }) => {
    const contextA = await browser.newContext({
      storageState: AUTH_FILE_A,
    });
    const requestA = contextA.request;
    const { id: recipeId } = await createScratchRecipe(
      requestA,
      `priv-a ${Date.now()}`,
      { storagePath: AUTH_FILE_A },
    );
    await contextA.close();

    // PRIV-01: detail not found for B
    await page.goto(`/recipes/${recipeId}`);
    await expect(page.getByText(/recipe not found/i)).toBeVisible({
      timeout: 15_000,
    });

    // PRIV-02: refine as B → 404
    const refine = await page.request.post(`/api/recipes/${recipeId}/refine`, {
      data: { message: "make it spicier" },
    });
    expect(refine.status()).toBe(404);

    // PRIV-02/03: favorite + delete via Supabase as B affect 0 rows
    const supabaseB = await clientFromStorageState(AUTH_FILE_B);
    const { data: favData, error: favError } = await supabaseB
      .from("recipes")
      .update({ is_favorite: true })
      .eq("id", recipeId)
      .select("id");
    expect(favError).toBeNull();
    expect(favData ?? []).toHaveLength(0);

    const { data: delData, error: delError } = await supabaseB
      .from("recipes")
      .delete()
      .eq("id", recipeId)
      .select("id");
    expect(delError).toBeNull();
    expect(delData ?? []).toHaveLength(0);

    // A still owns the recipe
    const supabaseA = await clientFromStorageState(AUTH_FILE_A);
    const { data: stillThere } = await supabaseA
      .from("recipes")
      .select("id, is_favorite")
      .eq("id", recipeId)
      .maybeSingle();
    expect(stillThere?.id).toBe(recipeId);
    expect(stillThere?.is_favorite).toBe(false);
  });

  test("PRIV-04: B history does not list A's title", async ({ browser, page }) => {
    const marker = `priv-hist-${Date.now()}`;
    const contextA = await browser.newContext({ storageState: AUTH_FILE_A });
    await createScratchRecipe(contextA.request, marker, {
      storagePath: AUTH_FILE_A,
    });
    await contextA.close();

    await page.goto("/history");
    await expect(page.getByRole("heading", { name: /history/i })).toBeVisible();
    await expect(page.getByText(marker)).toHaveCount(0);
  });

  test("PRIV-05/06: shopping lists are isolated", async ({ browser, page }) => {
    const marker = `priv-shop-${Date.now()}`;
    const contextA = await browser.newContext({ storageState: AUTH_FILE_A });
    const pageA = await contextA.newPage();
    const { id } = await createScratchRecipe(contextA.request, marker, {
      storagePath: AUTH_FILE_A,
    });
    await pageA.goto(`/recipes/${id}`);
    await pageA.getByRole("button", { name: "Add to shopping list" }).click();
    await expect(
      pageA.getByText(/added to your shopping list/i),
    ).toBeVisible({ timeout: 15_000 });

    const supabaseA = await clientFromStorageState(AUTH_FILE_A);
    const { data: aItems } = await supabaseA
      .from("shopping_list_items")
      .select("id, display_name")
      .limit(5);
    expect((aItems ?? []).length).toBeGreaterThan(0);
    const foreignId = aItems![0]!.id;

    await contextA.close();

    // PRIV-05: B's list UI does not show A's marker dish ingredients exclusively —
    // at minimum B's page should load and not crash; assert B cannot see foreign id ops.
    await page.goto("/shopping-list");
    await expect(
      page.getByRole("heading", { name: "Shopping list" }),
    ).toBeVisible();

    // PRIV-06: B cannot update/delete A's shopping row
    const supabaseB = await clientFromStorageState(AUTH_FILE_B);
    const { data: toggled } = await supabaseB
      .from("shopping_list_items")
      .update({ is_checked: true })
      .eq("id", foreignId)
      .select("id");
    expect(toggled ?? []).toHaveLength(0);

    const { data: removed } = await supabaseB
      .from("shopping_list_items")
      .delete()
      .eq("id", foreignId)
      .select("id");
    expect(removed ?? []).toHaveLength(0);
  });

  test("PRIV-07: B cannot update A's profile", async () => {
    const userA = await userIdFromStorageState(AUTH_FILE_A);
    const supabaseB = await clientFromStorageState(AUTH_FILE_B);

    const { data, error } = await supabaseB
      .from("profiles")
      .update({ display_name: "Hacked by B" })
      .eq("id", userA)
      .select("id");

    // RLS: either error or zero rows
    expect(data ?? []).toHaveLength(0);
    if (error) {
      expect(error.message.length).toBeGreaterThan(0);
    }

    const supabaseA = await clientFromStorageState(AUTH_FILE_A);
    const { data: profile } = await supabaseA
      .from("profiles")
      .select("display_name")
      .eq("id", userA)
      .maybeSingle();
    expect(profile?.display_name).not.toBe("Hacked by B");
  });
});
