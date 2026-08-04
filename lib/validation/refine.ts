import { z } from "zod";

export const RefineRequestSchema = z.object({
  message: z.string().trim().min(2).max(500),
});

export type RefineRequest = z.infer<typeof RefineRequestSchema>;
