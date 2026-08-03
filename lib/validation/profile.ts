import { z } from "zod";
import { ALLERGY_OPTIONS, DIET_TYPES, GOAL_OPTIONS } from "@/lib/constants";

export const ProfileUpdateSchema = z.object({
  display_name: z.string().trim().min(1).max(80).nullable().optional(),
  allergies: z.array(z.enum(ALLERGY_OPTIONS)).max(20).default([]),
  diet_type: z.enum(DIET_TYPES).default("none"),
  goals: z.array(z.enum(GOAL_OPTIONS)).max(10).default([]),
  preferences_notes: z.string().trim().max(1000).nullable().optional(),
});

export const OnboardingSchema = ProfileUpdateSchema.superRefine((val, ctx) => {
  if (
    val.diet_type === "none" &&
    val.allergies.length === 0 &&
    val.goals.length === 0 &&
    !val.preferences_notes
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Add at least one preference (diet, allergy, goal, or note).",
      path: ["diet_type"],
    });
  }
});

export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;
