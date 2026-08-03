import { z } from "zod";

export const IngredientInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.coerce.number().finite().positive().max(100_000),
  unit: z
    .string()
    .trim()
    .max(40)
    .transform((u) => u.toLowerCase())
    .default(""),
});

export type IngredientInput = z.infer<typeof IngredientInputSchema>;
