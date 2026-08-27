import { describe, expect, it } from "vitest";
import {
  mergeQuantity,
  normalizeName,
  normalizeUnit,
} from "@/lib/shopping/merge";

describe("shopping merge / normalize (EDGE-04, EDGE-05, BP-05)", () => {
  it("EDGE-05: normalizes name casing and spaces", () => {
    expect(normalizeName(" Flour ")).toBe("flour");
    expect(normalizeName("FLOUR")).toBe("flour");
    expect(normalizeName("olive   oil")).toBe("olive oil");
  });

  it("EDGE-04: different units stay distinct keys", () => {
    expect(normalizeUnit("g")).toBe("g");
    expect(normalizeUnit(" cup ")).toBe("cup");
    expect(normalizeName("flour") + "|" + normalizeUnit("g")).not.toBe(
      normalizeName("flour") + "|" + normalizeUnit("cup"),
    );
  });

  it("BP-05: mergeQuantity adds with 2-decimal rounding", () => {
    expect(mergeQuantity(1.11, 2.22)).toBe(3.33);
  });
});
