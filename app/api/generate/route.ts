import { NextResponse } from "next/server";
import { getRecipeProvider } from "@/lib/ai";
import {
  buildRepairPrompt,
  buildSystemPrompt,
  buildUserPrompt,
} from "@/lib/ai/prompt";
import { UpstreamError } from "@/lib/ai/provider";
import {
  generationsPerDay,
  refundGenerationSlot,
} from "@/lib/ai/rate-limit";
import {
  AiRecipeOutputSchema,
  AiRefusalOutputSchema,
} from "@/lib/ai/schema";
import { getCurrentUserAndProfile } from "@/lib/profile/get-profile";
import { GenerateRequestSchema } from "@/lib/validation/generate";

function zodIssues(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}) {
  return error.issues.map((issue) => ({
    path: issue.path.map(String),
    message: issue.message,
  }));
}

export async function POST(request: Request) {
  const { user, profile, supabase } = await getCurrentUserAndProfile();

  if (!user || !profile) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!profile.onboarding_completed) {
    return NextResponse.json(
      { error: "onboarding_required" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Request body must be JSON." },
      { status: 400 },
    );
  }

  const parsedRequest = GenerateRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "validation_error", issues: zodIssues(parsedRequest.error) },
      { status: 400 },
    );
  }

  const generateRequest = parsedRequest.data;
  const maxPerDay = generationsPerDay();

  const { data: slotOk, error: slotError } = await supabase.rpc(
    "claim_generation_slot",
    { max_per_day: maxPerDay },
  );

  if (slotError) {
    return NextResponse.json(
      { error: "server_error", message: "Could not check generation limit." },
      { status: 500 },
    );
  }

  if (!slotOk) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "Daily generation limit reached. Come back tomorrow.",
      },
      { status: 429 },
    );
  }

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(profile, generateRequest);

  let provider;
  try {
    provider = getRecipeProvider();
  } catch (error) {
    await refundGenerationSlot();
    return NextResponse.json(
      {
        error: "server_error",
        message:
          error instanceof Error ? error.message : "AI provider misconfigured.",
      },
      { status: 500 },
    );
  }

  let raw: unknown;
  try {
    raw = await provider.generate({ systemPrompt, userPrompt });
  } catch (error) {
    await refundGenerationSlot();
    console.error("[api/generate] provider error:", error);
    return NextResponse.json(
      {
        error: "server_error",
        message: "Something went wrong. Please try again.",
      },
      { status: 500 },
    );
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
      return NextResponse.json(
        {
          error: "server_error",
          message: "Something went wrong. Please try again.",
        },
        { status: 500 },
      );
    }

    parsed = AiRecipeOutputSchema.safeParse(raw);
    const refusedRetry = AiRefusalOutputSchema.safeParse(raw);

    if (!parsed.success && refusedRetry.success) {
      return NextResponse.json(
        {
          error: "non_culinary",
          message:
            "TasteTailor only generates recipes. Try a dish or recipe instead.",
          reason: refusedRetry.data.refusal_reason ?? null,
        },
        { status: 400 },
      );
    }

    if (!parsed.success) {
      await refundGenerationSlot();
      return NextResponse.json(
        {
          error: "invalid_ai_output",
          message: "Couldn't build a valid recipe. Please try again.",
        },
        { status: 422 },
      );
    }
  } else if (refusedEarly.success && (!parsed.success || parsed.data.refused)) {
    return NextResponse.json(
      {
        error: "non_culinary",
        message:
          "TasteTailor only generates recipes. Try a dish or recipe instead.",
        reason: refusedEarly.data.refusal_reason ?? null,
      },
      { status: 400 },
    );
  }

  // Every branch above that leaves `parsed.success` false already returned;
  // this only narrows the type for TypeScript.
  if (!parsed.success) {
    await refundGenerationSlot();
    return NextResponse.json(
      {
        error: "invalid_ai_output",
        message: "Couldn't build a valid recipe. Please try again.",
      },
      { status: 422 },
    );
  }

  const ai = parsed.data;

  if (ai.refused) {
    return NextResponse.json(
      {
        error: "non_culinary",
        message:
          "TasteTailor only generates recipes. Try a dish or recipe instead.",
        reason: ai.refusal_reason ?? null,
      },
      { status: 400 },
    );
  }

  const personaQuery = generateRequest.persona_query ?? null;
  const personaFallbackUsed = Boolean(personaQuery) && !ai.persona_applied;

  const { data: recipe, error: insertError } = await supabase
    .from("recipes")
    .insert({
      user_id: user.id,
      title: ai.title,
      mode: generateRequest.mode,
      persona_query: personaQuery,
      persona_fallback_used: personaFallbackUsed,
      servings_base: ai.servings_base,
      ingredients: ai.ingredients,
      steps: ai.steps,
      insights: ai.insights,
      source_input: generateRequest,
      is_favorite: false,
    })
    .select(
      "id, title, mode, servings_base, ingredients, steps, insights, persona_query, persona_fallback_used, is_favorite, created_at",
    )
    .single();

  if (insertError || !recipe) {
    await refundGenerationSlot();
    console.error("[api/generate] insert error:", insertError);
    return NextResponse.json(
      {
        error: "server_error",
        message: "Could not save the recipe. Please try again.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ recipe }, { status: 201 });
}
