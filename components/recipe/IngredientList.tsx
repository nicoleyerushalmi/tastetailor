import { formatQuantity } from "@/lib/format";
import { scaleIngredients } from "@/lib/shopping/scale";
import type { Ingredient } from "@/types/recipe";

type IngredientListProps = {
  ingredients: Ingredient[];
  servingsBase: number;
  uiServings: number;
};

export function IngredientList({
  ingredients,
  servingsBase,
  uiServings,
}: IngredientListProps) {
  const scaled = scaleIngredients(ingredients, servingsBase, uiServings);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-xl font-semibold text-[var(--color-ink)]">
        Ingredients
      </h2>
      <ul className="divide-y divide-[var(--color-border)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        {scaled.map((item, index) => (
          <li
            key={`${item.name}-${index}`}
            className="px-4 py-3 text-sm text-[var(--color-ink)]"
          >
            {formatQuantity(item.quantity)}
            {item.unit ? ` ${item.unit}` : ""} {item.name}
          </li>
        ))}
      </ul>
    </section>
  );
}
