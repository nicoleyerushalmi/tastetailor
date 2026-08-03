import { z } from "zod";

export const SignupSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72),
  display_name: z.string().trim().min(1).max(80).optional(),
});

export const LoginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(72),
});

export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
