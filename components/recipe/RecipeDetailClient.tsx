"use client";

import { useState } from "react";
import { AddToShoppingListButton } from "@/components/recipe/AddToShoppingListButton";
import { IngredientList } from "@/components/recipe/IngredientList";
import { InsightsBox } from "@/components/recipe/InsightsBox";
import { RecipeHeader } from "@/components/recipe/RecipeHeader";
import { ServingScaler } from "@/components/recipe/ServingScaler";
import { StepList } from "@/components/recipe/StepList";
import type { Ingredient, RecipeInsights } from "@/types/recipe";

export type RecipeDetailClientProps = {
  recipeId: string;
  title: string;
  mode: "adapt" | "scratch";
  servingsBase: number;
  personaQuery: string | null;
  personaFallbackUsed: boolean;
  isFavorite: boolean;
  ingredients: Ingredient[];
  steps: string[];
  insights: RecipeInsights;
};

export function RecipeDetailClient({
  recipeId,
  title,
  mode,
  servingsBase,
  personaQuery,
  personaFallbackUsed,
  isFavorite,
  ingredients,
  steps,
  insights,
}: RecipeDetailClientProps) {
  const [uiServings, setUiServings] = useState(servingsBase);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <RecipeHeader
        recipeId={recipeId}
        title={title}
        mode={mode}
        servingsBase={servingsBase}
        personaQuery={personaQuery}
        isFavorite={isFavorite}
      />

      <ServingScaler
        servingsBase={servingsBase}
        value={uiServings}
        onChange={setUiServings}
      />

      <IngredientList
        ingredients={ingredients}
        servingsBase={servingsBase}
        uiServings={uiServings}
      />

      <StepList steps={steps} />

      <AddToShoppingListButton
        recipeId={recipeId}
        ingredients={ingredients}
        servingsBase={servingsBase}
        uiServings={uiServings}
      />

      <InsightsBox
        insights={insights}
        fallbackUsed={personaFallbackUsed}
        personaQuery={personaQuery}
      />
    </main>
  );
}
