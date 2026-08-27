import { describe, expect, it } from "vitest";
import { safeRecipeImageSrc } from "@/lib/images/safeRecipeImage";

describe("safeRecipeImageSrc", () => {
  it("keeps Unsplash https URLs", () => {
    expect(
      safeRecipeImageSrc("https://images.unsplash.com/photo-123"),
    ).toBe("https://images.unsplash.com/photo-123");
  });

  it("falls back for disallowed hosts and empty values", () => {
    expect(safeRecipeImageSrc("https://evil.example/x.jpg")).toBe(
      "/images/recipe-ambient.jpg",
    );
    expect(safeRecipeImageSrc(null)).toBe("/images/recipe-ambient.jpg");
    expect(safeRecipeImageSrc("")).toBe("/images/recipe-ambient.jpg");
  });
});
