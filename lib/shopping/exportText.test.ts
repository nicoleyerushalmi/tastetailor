import { describe, expect, it } from "vitest";
import { formatShoppingListForExport } from "@/lib/shopping/exportText";
import type { ShoppingListItemRow } from "@/types/recipe";

function item(
  overrides: Partial<ShoppingListItemRow> &
    Pick<ShoppingListItemRow, "display_name" | "quantity" | "is_checked">,
): ShoppingListItemRow {
  return {
    id: "1",
    user_id: "u1",
    name: overrides.display_name.toLowerCase(),
    unit: "",
    source_recipe_ids: [],
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("formatShoppingListForExport (UNIT-01, UNIT-02)", () => {
  it("UNIT-01: splits unchecked and checked sections", () => {
    const text = formatShoppingListForExport([
      item({ display_name: "garlic", quantity: 2, unit: "", is_checked: false }),
      item({ display_name: "salt", quantity: 1, unit: "tsp", is_checked: true }),
    ]);

    expect(text.startsWith("Shopping list - TasteTailor")).toBe(true);
    expect(text).toContain("To buy:");
    expect(text).toContain("Already have:");
    expect(text.indexOf("garlic")).toBeLessThan(text.indexOf("Already have:"));
    expect(text.indexOf("salt")).toBeGreaterThan(text.indexOf("Already have:"));
  });

  it("UNIT-02: blank unit collapses without double space", () => {
    const text = formatShoppingListForExport([
      item({ display_name: "garlic", quantity: 2, unit: "", is_checked: false }),
    ]);
    expect(text).toContain("- 2 garlic");
    expect(text).not.toMatch(/- 2 {2,}garlic/);
  });
});
