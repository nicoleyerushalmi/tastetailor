import { formatQuantity } from "@/lib/format";
import type { ShoppingListItemRow } from "@/types/recipe";

function formatLine(item: ShoppingListItemRow): string {
  const parts = [formatQuantity(item.quantity), item.unit, item.display_name].filter(
    (part) => part && part.trim().length > 0,
  );
  return `- ${parts.join(" ")}`;
}

export function formatShoppingListForExport(items: ShoppingListItemRow[]): string {
  const toBuy = items.filter((item) => !item.is_checked);
  const haveIt = items.filter((item) => item.is_checked);

  return [
    "Shopping list - TasteTailor",
    "To buy:",
    ...toBuy.map(formatLine),
    "Already have:",
    ...haveIt.map(formatLine),
  ].join("\n");
}
