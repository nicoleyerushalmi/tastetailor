import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_GENERATIONS_PER_DAY } from "@/lib/constants";
import { generationsPerDay } from "@/lib/ai/rate-limit";

const original = process.env.GENERATIONS_PER_DAY;

afterEach(() => {
  if (original === undefined) delete process.env.GENERATIONS_PER_DAY;
  else process.env.GENERATIONS_PER_DAY = original;
});

describe("generationsPerDay (UNIT-20)", () => {
  it.each([
    [undefined, DEFAULT_GENERATIONS_PER_DAY],
    ["abc", DEFAULT_GENERATIONS_PER_DAY],
    ["0", DEFAULT_GENERATIONS_PER_DAY],
    ["-5", DEFAULT_GENERATIONS_PER_DAY],
    ["5", 5],
  ] as const)("env %s → %s", (raw, expected) => {
    if (raw === undefined) delete process.env.GENERATIONS_PER_DAY;
    else process.env.GENERATIONS_PER_DAY = raw;
    expect(generationsPerDay()).toBe(expected);
  });
});
