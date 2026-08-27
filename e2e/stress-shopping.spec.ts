import { test, expect } from "playwright/test";
import {
  AUTH_FILE_A,
  clientFromStorageState,
  userIdFromStorageState,
} from "./env";

const ITEM_COUNT = 50;

test.describe("shopping list stress (STRESS-05)", () => {
  test("50 shopping lines remain usable (check + export)", async ({ page }) => {
    test.setTimeout(60_000);

    await page.addInitScript(() => {
      const store = { text: "" };
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (value: string) => {
            store.text = value;
          },
          readText: async () => store.text,
        },
      });
      (
        window as unknown as { __ttClipboard: { text: string } }
      ).__ttClipboard = store;
    });

    const supabase = await clientFromStorageState(AUTH_FILE_A);
    const userId = await userIdFromStorageState(AUTH_FILE_A);
    const prefix = `stress05-${Date.now()}`;

    await supabase
      .from("shopping_list_items")
      .delete()
      .eq("user_id", userId)
      .like("name", "stress05-%");

    const { count: beforeCount, error: countError } = await supabase
      .from("shopping_list_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    expect(countError).toBeNull();
    const expectedTotal = (beforeCount ?? 0) + ITEM_COUNT;

    const rows = Array.from({ length: ITEM_COUNT }, (_, i) => {
      const n = String(i + 1).padStart(2, "0");
      return {
        user_id: userId,
        name: `${prefix}-${n}`,
        display_name: `Stress item ${n}`,
        quantity: i + 1,
        unit: "g",
        is_checked: false,
        source_recipe_ids: [] as string[],
      };
    });

    const { error: insertError } = await supabase
      .from("shopping_list_items")
      .insert(rows);
    expect(insertError).toBeNull();

    try {
      await page.goto("/shopping-list", { waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("heading", { name: "Shopping list" }),
      ).toBeVisible({ timeout: 15_000 });
      await expect(
        page.getByText(
          `${expectedTotal} item${expectedTotal === 1 ? "" : "s"}`,
        ),
      ).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole("listitem")).toHaveCount(expectedTotal, {
        timeout: 15_000,
      });

      // Prefer a mid-list row so we are not fighting sticky chrome on the first item.
      const target = page.getByRole("checkbox", {
        name: /Mark Stress item 25 as bought/i,
      });
      await target.scrollIntoViewIfNeeded();
      await target.click({ timeout: 10_000 });
      await expect(
        page.getByRole("heading", { name: "Already have" }),
      ).toBeVisible({ timeout: 15_000 });

      await page.getByRole("button", { name: "Export" }).click({ timeout: 10_000 });
      await expect(page.getByRole("status")).toContainText(/copied to clipboard/i, {
        timeout: 10_000,
      });

      const clip = await page.evaluate(
        () =>
          (window as unknown as { __ttClipboard: { text: string } }).__ttClipboard
            .text,
      );
      expect(clip).toContain("Shopping list - TasteTailor");
      expect(clip).toContain("Stress item");
    } finally {
      await supabase
        .from("shopping_list_items")
        .delete()
        .eq("user_id", userId)
        .like("name", `${prefix}%`);
    }
  });
});
