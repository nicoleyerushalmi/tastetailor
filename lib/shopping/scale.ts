import type { Ingredient } from "@/types/recipe";

/** Round to 2 decimal places (same rule for all units, including countable). */
export function roundQuantity(n: number): number {
  return Math.round(n * 100) / 100;
}

export function scaleIngredients(
  ingredients: Ingredient[],
  servingsBase: number,
  uiServings: number,
): Ingredient[] {
  const base = servingsBase > 0 ? servingsBase : 1;
  const factor = uiServings / base;

  return ingredients.map((item) => ({
    ...item,
    quantity: roundQuantity(item.quantity * factor),
  }));
}
