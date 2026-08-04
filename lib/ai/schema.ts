import { z } from "zod";
import { IngredientInputSchema } from "@/lib/validation/common";

export const RecipeSourceSchema = z.object({
  label: z.string().trim().min(1).max(200),
  url: z.string().trim().max(2000).optional(),
  note: z.string().trim().max(500).optional(),
});

export const InsightsSchema = z.object({
  summary: z.string().trim().min(1).max(2000),
  substitutions: z
    .array(
      z.object({
        original: z.string().trim().max(200).optional(),
        replacement: z.string().trim().min(1).max(200),
        reason: z.string().trim().min(1).max(500),
      }),
    )
    .max(40)
    .default([]),
  sources: z.array(RecipeSourceSchema).max(20).default([]),
});

export const AiRecipeOutputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  servings_base: z.coerce.number().int().min(1).max(24),
  ingredients: z.array(IngredientInputSchema).min(1).max(80),
  steps: z.array(z.string().trim().min(1).max(2000)).min(1).max(60),
  insights: InsightsSchema,
  persona_applied: z.preprocess((value) => {
    if (typeof value === "string") {
      const lower = value.trim().toLowerCase();
      if (lower === "true" || lower.startsWith("yes")) return true;
      return false;
    }
    return value;
  }, z.boolean()),
  refused: z.preprocess((value) => {
    if (typeof value === "string") {
      const lower = value.trim().toLowerCase();
      return lower === "true" || lower === "yes";
    }
    return value;
  }, z.boolean().optional().default(false)),
  refusal_reason: z.string().trim().max(500).optional(),
  /** Only populated for recipe refinements; omitted for fresh generations. */
  change_summary: z.string().trim().max(300).optional(),
});

/** Looser schema used when the model refuses — recipe fields may be placeholders. */
export const AiRefusalOutputSchema = z.object({
  refused: z.literal(true),
  refusal_reason: z.string().trim().max(500).optional(),
  title: z.string().optional(),
  servings_base: z.number().optional(),
  ingredients: z.array(z.unknown()).optional(),
  steps: z.array(z.unknown()).optional(),
  insights: z.unknown().optional(),
  persona_applied: z.boolean().optional(),
});

export type AiRecipeOutput = z.infer<typeof AiRecipeOutputSchema>;
export type RecipeSource = z.infer<typeof RecipeSourceSchema>;
