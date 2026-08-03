import { z } from "zod";

export const ShoppingUpsertItemSchema = z.object({
  display_name: z.string().trim().min(1).max(120),
  quantity: z.number().finite().positive().max(100_000),
  unit: z.string().trim().max(40).default(""),
  source_recipe_id: z.string().uuid().optional(),
});

export const AddRecipeToListSchema = z.object({
  items: z.array(ShoppingUpsertItemSchema).min(1).max(80),
});

export type ShoppingUpsertItem = z.infer<typeof ShoppingUpsertItemSchema>;
