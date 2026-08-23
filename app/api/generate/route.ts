import { NextResponse } from "next/server";
import { getRecipeProvider } from "@/lib/ai";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompt";
import { generationsPerDay, refundGenerationSlot } from "@/lib/ai/rate-limit";
import { outcomeToErrorResponse, runRecipeGeneration } from "@/lib/ai/run-generation";
import { fetchRecipeImage } from "@/lib/images/unsplash";
import { getCurrentUserAndProfile } from "@/lib/profile/get-profile";
import { GenerateRequestSchema } from "@/lib/validation/generate";
import { zodIssues } from "@/lib/validation/zod-issues";

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

  const outcome = await runRecipeGeneration({ provider, systemPrompt, userPrompt });
  if (outcome.kind !== "success") {
    return (
      outcomeToErrorResponse(outcome) ??
      NextResponse.json(
        { error: "server_error", message: "Something went wrong. Please try again." },
        { status: 500 },
      )
    );
  }

  const ai = outcome.data;
  const personaQuery = generateRequest.persona_query ?? null;
  const personaFallbackUsed = Boolean(personaQuery) && !ai.persona_applied;

  // Photo attach is best-effort and must never block saving the recipe
  // (e.g. Unsplash down, or image_* columns not migrated yet).
  const imagePromise = fetchRecipeImage(ai.image_query?.trim() || ai.title);

  const { data: inserted, error: insertError } = await supabase
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
      "id, title, mode, servings_base, ingredients, steps, insights, persona_query, persona_fallback_used, is_favorite, chat_log, created_at, updated_at",
    )
    .single();

  if (insertError || !inserted) {
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

  let recipe = {
    ...inserted,
    image_url: null as string | null,
    image_alt: null as string | null,
    image_credit_name: null as string | null,
    image_credit_url: null as string | null,
  };

  const image = await imagePromise;
  if (image) {
    const { error: imageError } = await supabase
      .from("recipes")
      .update({
        image_url: image.url,
        image_alt: image.alt,
        image_credit_name: image.creditName,
        image_credit_url: image.creditUrl,
      })
      .eq("id", inserted.id)
      .eq("user_id", user.id);

    if (imageError) {
      console.warn(
        "[api/generate] recipe saved but image attach skipped:",
        imageError.message,
      );
    } else {
      recipe = {
        ...recipe,
        image_url: image.url,
        image_alt: image.alt,
        image_credit_name: image.creditName,
        image_credit_url: image.creditUrl,
      };
    }
  }

  return NextResponse.json({ recipe }, { status: 201 });
}
