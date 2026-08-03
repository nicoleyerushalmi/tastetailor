export const DIET_TYPES = [
  "none",
  "vegetarian",
  "vegan",
  "pescatarian",
  "keto",
  "paleo",
  "mediterranean",
] as const;

export const ALLERGY_OPTIONS = [
  "gluten",
  "lactose",
  "nuts",
  "peanuts",
  "eggs",
  "soy",
  "shellfish",
  "fish",
  "sesame",
] as const;

export const GOAL_OPTIONS = [
  "high_protein",
  "low_calorie",
  "low_carb",
  "high_fiber",
  "balanced",
] as const;

export const RECIPE_MODES = ["adapt", "scratch"] as const;

export const DEFAULT_GENERATIONS_PER_DAY = 20;
export const HISTORY_PAGE_SIZE = 12;
export const MIN_SERVINGS = 1;
export const MAX_SERVINGS = 24;

export type DietType = (typeof DIET_TYPES)[number];
export type AllergyOption = (typeof ALLERGY_OPTIONS)[number];
export type GoalOption = (typeof GOAL_OPTIONS)[number];
export type RecipeMode = (typeof RECIPE_MODES)[number];
