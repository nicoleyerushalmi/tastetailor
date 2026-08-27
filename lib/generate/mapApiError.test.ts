import { describe, expect, it } from "vitest";
import { mapApiError } from "@/lib/generate/mapApiError";

describe("mapApiError (UNIT-04–06)", () => {
  it("UNIT-04: maps known error codes to specific copy", () => {
    expect(mapApiError({ error: "non_culinary" }).formError).toMatch(/only generates recipes/i);
    expect(mapApiError({ error: "rate_limited" }).formError).toMatch(/daily generation limit/i);
    expect(mapApiError({ error: "invalid_ai_output" }).formError).toMatch(/valid recipe/i);
    expect(mapApiError({ error: "onboarding_required" }).formError).toMatch(/onboarding/i);
    expect(mapApiError({ error: "ai_unavailable" }).formError).toMatch(/temporarily busy/i);
  });

  it("UNIT-05: falls back to message then generic copy", () => {
    expect(mapApiError({ error: "weird", message: "Custom" }).formError).toBe("Custom");
    expect(mapApiError({ error: "weird" }).formError).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("UNIT-06: validation_error builds fieldErrors from first path segment", () => {
    const result = mapApiError({
      error: "validation_error",
      issues: [
        { path: ["dish_name"], message: "too short" },
        { path: ["dish_name"], message: "also short" },
        { path: ["persona_query"], message: "too long" },
      ],
    });
    expect(result.formError).toBeNull();
    expect(result.fieldErrors).toEqual({
      dish_name: "too short",
      persona_query: "too long",
    });
  });
});
