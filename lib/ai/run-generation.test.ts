import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UpstreamError } from "@/lib/ai/provider";
import {
  outcomeToErrorResponse,
  runRecipeGeneration,
} from "@/lib/ai/run-generation";
import type { RecipeProvider } from "@/lib/ai/provider";
import {
  MOCK_REFUSE_KEYWORD,
  createMockProvider,
} from "@/lib/ai/mock";

vi.mock("@/lib/ai/rate-limit", () => ({
  refundGenerationSlot: vi.fn(async () => undefined),
  generationsPerDay: () => 20,
}));

import { refundGenerationSlot } from "@/lib/ai/rate-limit";

const validRecipe = {
  title: "Test Bowl",
  servings_base: 4,
  ingredients: [{ name: "rice", quantity: 1, unit: "cup" }],
  steps: ["Cook rice."],
  insights: { summary: "Simple bowl.", substitutions: [] },
  persona_applied: true,
  refused: false,
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("runRecipeGeneration + outcomeToErrorResponse (INV-15/16, BP-07)", () => {
  it("INV-15: mock refuse keyword yields non_culinary without refund", async () => {
    const outcome = await runRecipeGeneration({
      provider: createMockProvider(),
      systemPrompt: "sys",
      userPrompt: `Please do my ${MOCK_REFUSE_KEYWORD} for me`,
    });
    expect(outcome.kind).toBe("refused");
    expect(refundGenerationSlot).not.toHaveBeenCalled();

    const res = outcomeToErrorResponse(outcome)!;
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "non_culinary" });
  });

  it("INV-16: invalid AI JSON after repair refunds and maps 422", async () => {
    const provider: RecipeProvider = {
      generate: vi.fn().mockResolvedValue({ not: "a recipe" }),
    };
    const outcome = await runRecipeGeneration({
      provider,
      systemPrompt: "sys",
      userPrompt: "make soup",
    });
    expect(outcome.kind).toBe("invalid");
    expect(provider.generate).toHaveBeenCalledTimes(2);
    expect(refundGenerationSlot).toHaveBeenCalledOnce();

    const res = outcomeToErrorResponse(outcome)!;
    expect(res.status).toBe(422);
    await expect(res.json()).resolves.toMatchObject({
      error: "invalid_ai_output",
    });
  });

  it("BP-07: upstream error refunds and maps ai_unavailable for 503", async () => {
    const provider: RecipeProvider = {
      generate: vi.fn().mockRejectedValue(new UpstreamError("busy", 503)),
    };
    const outcome = await runRecipeGeneration({
      provider,
      systemPrompt: "sys",
      userPrompt: "make soup",
    });
    expect(outcome).toEqual({
      kind: "upstream_error",
      status: 503,
      message: "busy",
    });
    expect(refundGenerationSlot).toHaveBeenCalledOnce();

    const res = outcomeToErrorResponse(outcome)!;
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({ error: "ai_unavailable" });
  });

  it("returns success for valid mock output", async () => {
    const provider: RecipeProvider = {
      generate: vi.fn().mockResolvedValue(validRecipe),
    };
    const outcome = await runRecipeGeneration({
      provider,
      systemPrompt: "sys",
      userPrompt: "make soup",
    });
    expect(outcome.kind).toBe("success");
    expect(outcomeToErrorResponse(outcome)).toBeNull();
    expect(refundGenerationSlot).not.toHaveBeenCalled();
  });
});

describe("createMockProvider persona fallback (FEAT-06)", () => {
  beforeEach(() => {
    vi.mocked(refundGenerationSlot).mockClear();
  });

  it("sets persona_applied false for unknown persona marker", async () => {
    const outcome = await runRecipeGeneration({
      provider: createMockProvider(),
      systemPrompt: "sys",
      userPrompt: "MODE: scratch\npersona_query: __unknown_persona__\ndish: soup",
    });
    expect(outcome.kind).toBe("success");
    if (outcome.kind === "success") {
      expect(outcome.data.persona_applied).toBe(false);
    }
  });
});
