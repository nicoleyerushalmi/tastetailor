import { z } from "zod";

const PersonaQuerySchema = z
  .string()
  .trim()
  .max(120)
  .nullable()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

const AdaptBodySchema = z.object({
  mode: z.literal("adapt"),
  recipe_text: z.string().trim().min(20).max(20_000),
  persona_query: PersonaQuerySchema,
});

const ScratchBodySchema = z.object({
  mode: z.literal("scratch"),
  dish_name: z.string().trim().min(2).max(160),
  persona_query: PersonaQuerySchema,
});

export const GenerateRequestSchema = z.discriminatedUnion("mode", [
  AdaptBodySchema,
  ScratchBodySchema,
]);

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
