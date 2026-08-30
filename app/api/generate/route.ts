import { NextResponse } from "next/server";
import { getRecipeProvider } from "@/lib/ai";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompt";
import {
  aiLog,
  getAiRequestContext,
  runWithAiRequestContext,
} from "@/lib/ai/log";
import { generationsPerDay, refundGenerationSlot } from "@/lib/ai/rate-limit";
import { outcomeToErrorResponse, runRecipeGeneration } from "@/lib/ai/run-generation";
import { fetchRecipeImage } from "@/lib/images/unsplash";
import { getCurrentUserAndProfile } from "@/lib/profile/get-profile";
import { GenerateRequestSchema } from "@/lib/validation/generate";
import { zodIssues } from "@/lib/validation/zod-issues";

type UnsplashResult = "hit" | "miss" | "skipped" | "attach_failed";

function finish(
  started: number,
  fields: {
    mode?: string;
    status: number;
    error?: string;
    slotClaimed?: boolean;
    unsplash?: UnsplashResult;
    personaFallback?: boolean;
  },
) {
  const ctx = getAiRequestContext();
  aiLog.info("api/generate", {
    ...fields,
    totalMs: Date.now() - started,
    geminiCalls: ctx?.geminiCalls ?? 0,
    slotRefunded: ctx?.slotRefunded ?? false,
  });
}

export async function POST(request: Request) {
  return runWithAiRequestContext(async () => {
    const started = Date.now();
    aiLog.debug("api/generate", { phase: "start" });

    const { user, profile, supabase } = await getCurrentUserAndProfile();

    if (!user || !profile) {
      finish(started, { status: 401, error: "unauthorized" });
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (!profile.onboarding_completed) {
      finish(started, { status: 403, error: "onboarding_required" });
      return NextResponse.json(
        { error: "onboarding_required" },
        { status: 403 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      finish(started, { status: 400, error: "invalid_json" });
      return NextResponse.json(
        { error: "invalid_json", message: "Request body must be JSON." },
        { status: 400 },
      );
    }

    const parsedRequest = GenerateRequestSchema.safeParse(body);
    if (!parsedRequest.success) {
      finish(started, { status: 400, error: "validation_error" });
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
      aiLog.debug("api/generate", {
        phase: "slot_error",
        message: slotError.message,
      });
      finish(started, {
        mode: generateRequest.mode,
        status: 500,
        error: "server_error",
        slotClaimed: false,
      });
      return NextResponse.json(
        { error: "server_error", message: "Could not check generation limit." },
        { status: 500 },
      );
    }

    if (!slotOk) {
      finish(started, {
        mode: generateRequest.mode,
        status: 429,
        error: "rate_limited",
        slotClaimed: false,
      });
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
      finish(started, {
        mode: generateRequest.mode,
        status: 500,
        error: "server_error",
        slotClaimed: true,
      });
      return NextResponse.json(
        {
          error: "server_error",
          message:
            error instanceof Error ? error.message : "AI provider misconfigured.",
        },
        { status: 500 },
      );
    }

    const outcome = await runRecipeGeneration({
      provider,
      systemPrompt,
      userPrompt,
    });
    if (outcome.kind !== "success") {
      const errorResponse =
        outcomeToErrorResponse(outcome) ??
        NextResponse.json(
          {
            error: "server_error",
            message: "Something went wrong. Please try again.",
          },
          { status: 500 },
        );
      const payload = await errorResponse.clone().json().catch(() => ({}));
      finish(started, {
        mode: generateRequest.mode,
        status: errorResponse.status,
        error:
          typeof payload === "object" &&
          payload &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : outcome.kind,
        slotClaimed: true,
      });
      return errorResponse;
    }

    const ai = outcome.data;
    const personaQuery = generateRequest.persona_query ?? null;
    const personaFallbackUsed = Boolean(personaQuery) && !ai.persona_applied;

    // Photo attach is best-effort and must never block saving the recipe
    // (e.g. Unsplash down, or image_* columns not migrated yet).
    const hasUnsplashKey = Boolean(process.env.UNSPLASH_ACCESS_KEY?.trim());
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
      aiLog.error("api/generate", {
        phase: "insert_error",
        message: insertError?.message ?? "missing_row",
      });
      finish(started, {
        mode: generateRequest.mode,
        status: 500,
        error: "server_error",
        slotClaimed: true,
        personaFallback: personaFallbackUsed,
      });
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

    let unsplash: UnsplashResult = hasUnsplashKey ? "miss" : "skipped";
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
        unsplash = "attach_failed";
        aiLog.warn("api/generate", {
          phase: "image_attach_skipped",
          message: imageError.message,
        });
      } else {
        unsplash = "hit";
        recipe = {
          ...recipe,
          image_url: image.url,
          image_alt: image.alt,
          image_credit_name: image.creditName,
          image_credit_url: image.creditUrl,
        };
      }
    }

    finish(started, {
      mode: generateRequest.mode,
      status: 201,
      slotClaimed: true,
      unsplash,
      personaFallback: personaFallbackUsed,
    });
    return NextResponse.json({ recipe }, { status: 201 });
  });
}
