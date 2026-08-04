export type Ingredient = {
  name: string;
  quantity: number;
  unit: string;
};

export type RecipeSource = {
  label: string;
  url?: string;
  note?: string;
};

export type RecipeInsights = {
  summary: string;
  substitutions: {
    original?: string;
    replacement: string;
    reason: string;
  }[];
  sources?: RecipeSource[];
};

export type RecipeRow = {
  id: string;
  user_id: string;
  title: string;
  mode: "adapt" | "scratch";
  persona_query: string | null;
  persona_fallback_used: boolean;
  servings_base: number;
  ingredients: Ingredient[];
  steps: string[];
  insights: RecipeInsights;
  source_input: Record<string, unknown>;
  is_favorite: boolean;
  created_at: string;
};

export type RecipeSummary = {
  id: string;
  title: string;
  created_at: string;
  is_favorite: boolean;
  mode: "adapt" | "scratch";
};

export type ShoppingListItemRow = {
  id: string;
  user_id: string;
  name: string;
  display_name: string;
  quantity: number;
  unit: string;
  is_checked: boolean;
  source_recipe_ids: string[];
  updated_at: string;
};
