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
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-[var(--color-ink)]">
        Ingredients
      </h2>
      <ul className="list-disc space-y-1 pl-5 text-[var(--color-ink)]">
        {scaled.map((item, index) => (
          <li key={`${item.name}-${index}`}>
            {formatQuantity(item.quantity)}
            {item.unit ? ` ${item.unit}` : ""} {item.name}
          </li>
        ))}
      </ul>
    </section>
  );
}
