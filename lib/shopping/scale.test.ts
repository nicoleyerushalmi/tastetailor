import { describe, expect, it } from "vitest";
import { formatQuantity } from "@/lib/format";
import { scaleIngredients, roundQuantity } from "@/lib/shopping/scale";

describe("roundQuantity / scaleIngredients (FEAT-08, EDGE-01, EDGE-02)", () => {
  it("EDGE-01: scaling 4 → 8 doubles quantities after roundQuantity", () => {
    const scaled = scaleIngredients(
      [
        { name: "flour", quantity: 200, unit: "g" },
        { name: "eggs", quantity: 2, unit: "" },
      ],
      4,
      8,
    );
    expect(scaled[0].quantity).toBe(400);
    expect(scaled[1].quantity).toBe(4);
    expect(roundQuantity(200 * (8 / 4))).toBe(400);
  });

  it("EDGE-02: fractional countables are not ceiled", () => {
    const scaled = scaleIngredients(
      [{ name: "egg", quantity: 1, unit: "" }],
      4,
      2,
    );
    expect(scaled[0].quantity).toBe(0.5);
  });

  it("FEAT-08: uses 2-decimal rounding", () => {
    expect(roundQuantity(1 / 3)).toBe(0.33);
    const scaled = scaleIngredients(
      [{ name: "oil", quantity: 1, unit: "tbsp" }],
      3,
      1,
    );
    expect(scaled[0].quantity).toBe(0.33);
  });
});

describe("formatQuantity (UNIT-03)", () => {
  it("rounds to two decimals and drops trailing zeros", () => {
    expect(formatQuantity(0.3333)).toBe("0.33");
    expect(formatQuantity(2.0)).toBe("2");
  });

  it("maps non-finite to 0", () => {
    expect(formatQuantity(Number.NaN)).toBe("0");
    expect(formatQuantity(Number.POSITIVE_INFINITY)).toBe("0");
  });
});
