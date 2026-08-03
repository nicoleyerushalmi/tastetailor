import { notFound } from "next/navigation";
import { RecipeDetailClient } from "@/components/recipe/RecipeDetailClient";
import { createClient } from "@/lib/supabase/server";
import type { Ingredient, RecipeInsights, RecipeRow } from "@/types/recipe";

type RecipeDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RecipeDetailPage({
  params,
}: RecipeDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const recipe = data as RecipeRow;
  const ingredients = (recipe.ingredients ?? []) as Ingredient[];
  const steps = (recipe.steps ?? []) as string[];
  const insights = (recipe.insights ?? {
    summary: "",
    substitutions: [],
    sources: [],
  }) as RecipeInsights;

  return (
    <RecipeDetailClient
      recipeId={recipe.id}
      title={recipe.title}
      mode={recipe.mode}
      servingsBase={recipe.servings_base}
      personaQuery={recipe.persona_query}
      personaFallbackUsed={recipe.persona_fallback_used}
      isFavorite={recipe.is_favorite}
      ingredients={ingredients}
      steps={steps}
      insights={insights}
    />
  );
}
