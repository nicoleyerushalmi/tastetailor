import { NextResponse } from "next/server";
import { buildRepairPrompt } from "@/lib/ai/prompt";
import type { RecipeProvider } from "@/lib/ai/provider";
import { refundGenerationSlot } from "@/lib/ai/rate-limit";
import {
  AiRecipeOutputSchema,
  AiRefusalOutputSchema,
  type AiRecipeOutput,
} from "@/lib/ai/schema";

export type GenerationOutcome =
  | { kind: "upstream_error" }
  | { kind: "refused"; reason: string | null }
  | { kind: "invalid" }
  | { kind: "success"; data: AiRecipeOutput };

/**
 * Provider call → Zod validation → one repair-retry → refusal/invalid/success
 * classification, shared by fresh generation and recipe refinement. Refunds
 * the caller's already-claimed rate-limit slot on every non-success path
 * except an honest refusal (matches the product decision: never refund a
 * non-culinary refusal, since that's not an upstream/validation failure).
 */
export async function runRecipeGeneration(params: {
  provider: RecipeProvider;
  systemPrompt: string;
  userPrompt: string;
}): Promise<GenerationOutcome> {
  const { provider, systemPrompt, userPrompt } = params;

  let raw: unknown;
  try {
    raw = await provider.generate({ systemPrompt, userPrompt });
  } catch (error) {
    await refundGenerationSlot();
    console.error("[runRecipeGeneration] provider error:", error);
    return { kind: "upstream_error" };
  }

  let parsed = AiRecipeOutputSchema.safeParse(raw);
  const refusedEarly = AiRefusalOutputSchema.safeParse(raw);

  if (!parsed.success && !refusedEarly.success) {
    const summary = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
      .join("; ");

    try {
      raw = await provider.generate({
        systemPrompt,
        userPrompt,
        repairOf: buildRepairPrompt(summary),
      });
    } catch {
      await refundGenerationSlot();
      return { kind: "upstream_error" };
    }

    parsed = AiRecipeOutputSchema.safeParse(raw);
    const refusedRetry = AiRefusalOutputSchema.safeParse(raw);

    if (!parsed.success && refusedRetry.success) {
      return { kind: "refused", reason: refusedRetry.data.refusal_reason ?? null };
    }

    if (!parsed.success) {
      await refundGenerationSlot();
      return { kind: "invalid" };
    }
  } else if (refusedEarly.success && (!parsed.success || parsed.data.refused)) {
    return { kind: "refused", reason: refusedEarly.data.refusal_reason ?? null };
  }

  // Every branch above that leaves `parsed.success` false already returned;
  // this only narrows the type for TypeScript.
  if (!parsed.success) {
    await refundGenerationSlot();
    return { kind: "invalid" };
  }

  const ai = parsed.data;

  if (ai.refused) {
    return { kind: "refused", reason: ai.refusal_reason ?? null };
  }

  return { kind: "success", data: ai };
}

/** Maps a non-success outcome to the route's existing error JSON shape; `null` for success. */
export function outcomeToErrorResponse(
  outcome: GenerationOutcome,
): NextResponse | null {
  switch (outcome.kind) {
    case "upstream_error":
      return NextResponse.json(
        {
          error: "server_error",
          message: "Something went wrong. Please try again.",
        },
        { status: 500 },
      );
    case "refused":
      return NextResponse.json(
        {
          error: "non_culinary",
          message:
            "TasteTailor only generates recipes. Try a dish or recipe instead.",
          reason: outcome.reason,
        },
        { status: 400 },
      );
    case "invalid":
      return NextResponse.json(
        {
          error: "invalid_ai_output",
          message: "Couldn't build a valid recipe. Please try again.",
        },
        { status: 422 },
      );
    case "success":
      return null;
  }
}
