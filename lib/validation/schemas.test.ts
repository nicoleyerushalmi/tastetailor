import { describe, expect, it } from "vitest";
import { LoginSchema, SignupSchema } from "@/lib/validation/auth";
import { GenerateRequestSchema } from "@/lib/validation/generate";
import { OnboardingSchema, ProfileUpdateSchema } from "@/lib/validation/profile";
import { RefineRequestSchema } from "@/lib/validation/refine";

describe("auth schemas (INV-01–03)", () => {
  it("INV-01: rejects bad signup email", () => {
    expect(SignupSchema.safeParse({ email: "not-an-email", password: "password1" }).success).toBe(
      false,
    );
  });

  it("INV-02: rejects short signup password", () => {
    expect(
      SignupSchema.safeParse({ email: "a@b.co", password: "short" }).success,
    ).toBe(false);
  });

  it("INV-03: rejects invalid login email", () => {
    expect(LoginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
  });
});

describe("onboarding / profile (INV-04, INV-14)", () => {
  it("INV-04: rejects empty onboarding prefs when diet is none", () => {
    expect(
      OnboardingSchema.safeParse({
        diet_type: "none",
        allergies: [],
        goals: [],
      }).success,
    ).toBe(false);
  });

  it("INV-14: rejects unknown diet/allergy enums", () => {
    expect(
      ProfileUpdateSchema.safeParse({
        diet_type: "carnivore",
        allergies: ["gluten"],
        goals: [],
      }).success,
    ).toBe(false);
    expect(
      ProfileUpdateSchema.safeParse({
        diet_type: "vegan",
        allergies: ["uranium"],
        goals: [],
      }).success,
    ).toBe(false);
  });
});

describe("generate / refine schemas (INV-05–11, EDGE-10)", () => {
  it("INV-05/06: scratch dish_name length bounds", () => {
    expect(
      GenerateRequestSchema.safeParse({ mode: "scratch", dish_name: "a" }).success,
    ).toBe(false);
    expect(
      GenerateRequestSchema.safeParse({
        mode: "scratch",
        dish_name: "x".repeat(161),
      }).success,
    ).toBe(false);
    expect(
      GenerateRequestSchema.safeParse({ mode: "scratch", dish_name: "ok" }).success,
    ).toBe(true);
  });

  it("INV-07/08: adapt recipe_text length bounds", () => {
    expect(
      GenerateRequestSchema.safeParse({
        mode: "adapt",
        recipe_text: "too short",
      }).success,
    ).toBe(false);
    expect(
      GenerateRequestSchema.safeParse({
        mode: "adapt",
        recipe_text: "a".repeat(20_001),
      }).success,
    ).toBe(false);
    expect(
      GenerateRequestSchema.safeParse({
        mode: "adapt",
        recipe_text: "a".repeat(20),
      }).success,
    ).toBe(true);
  });

  it("INV-09: persona_query max 120", () => {
    expect(
      GenerateRequestSchema.safeParse({
        mode: "scratch",
        dish_name: "soup",
        persona_query: "p".repeat(121),
      }).success,
    ).toBe(false);
  });

  it("EDGE-10: empty persona_query becomes null", () => {
    const parsed = GenerateRequestSchema.safeParse({
      mode: "scratch",
      dish_name: "soup",
      persona_query: "   ",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.persona_query).toBeNull();
  });

  it("INV-10/11: refine message length bounds", () => {
    expect(RefineRequestSchema.safeParse({ message: "a" }).success).toBe(false);
    expect(RefineRequestSchema.safeParse({ message: "x".repeat(501) }).success).toBe(
      false,
    );
    expect(RefineRequestSchema.safeParse({ message: "ok" }).success).toBe(true);
  });
});
