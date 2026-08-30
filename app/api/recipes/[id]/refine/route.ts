import { NextResponse } from "next/server";
import { getRecipeProvider } from "@/lib/ai";
import { buildRefinePrompt, buildSystemPrompt } from "@/lib/ai/prompt";
import {
  aiLog,
  getAiRequestContext,
  runWithAiRequestContext,
} from "@/lib/ai/log";
import { generationsPerDay, refundGenerationSlot } from "@/lib/ai/rate-limit";
import { outcomeToErrorResponse, runRecipeGeneration } from "@/lib/ai/run-generation";
import { getCurrentUserAndProfile } from "@/lib/profile/get-profile";
import { appendChatLog } from "@/lib/recipes/chat-log";
import { RefineRequestSchema } from "@/lib/validation/refine";
import { zodIssues } from "@/lib/validation/zod-issues";
import type { ChatLogEntry, Ingredient } from "@/types/recipe";

type RefineRouteParams = { params: Promise<{ id: string }> };

function finish(
  started: number,
  fields: {
    status: number;
    error?: string;
    slotClaimed?: boolean;
  },
) {
  const ctx = getAiRequestContext();
  aiLog.info("api/refine", {
    ...fields,
    totalMs: Date.now() - started,
    geminiCalls: ctx?.geminiCalls ?? 0,
    slotRefunded: ctx?.slotRefunded ?? false,
  });
}

export async function POST(request: Request, { params }: RefineRouteParams) {
  return runWithAiRequestContext(async () => {
    const started = Date.now();
    aiLog.debug("api/refine", { phase: "start" });

    const { id } = await params;
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

    const { data: recipe, error: fetchError } = await supabase
      .from("recipes")
      .select(
        "id, title, servings_base, ingredients, steps, persona_query, chat_log",
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError || !recipe) {
      finish(started, { status: 404, error: "not_found" });
      return NextResponse.json(
        { error: "not_found", message: "Recipe not found." },
        { status: 404 },
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

    const parsedRequest = RefineRequestSchema.safeParse(body);
    if (!parsedRequest.success) {
      finish(started, { status: 400, error: "validation_error" });
      return NextResponse.json(
        { error: "validation_error", issues: zodIssues(parsedRequest.error) },
        { status: 400 },
      );
    }

    const { message } = parsedRequest.data;
    const maxPerDay = generationsPerDay();

    const { data: slotOk, error: slotError } = await supabase.rpc(
      "claim_generation_slot",
      { max_per_day: maxPerDay },
    );

    if (slotError) {
      aiLog.debug("api/refine", {
        phase: "slot_error",
        message: slotError.message,
      });
      finish(started, {
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
    const userPrompt = buildRefinePrompt(
      profile,
      {
        title: recipe.title,
        servings_base: recipe.servings_base,
        ingredients: (recipe.ingredients ?? []) as Ingredient[],
        steps: (recipe.steps ?? []) as string[],
        persona_query: recipe.persona_query,
      },
      (recipe.chat_log ?? []) as ChatLogEntry[],
      message,
    );

    let provider;
    try {
      provider = getRecipeProvider();
    } catch (error) {
      await refundGenerationSlot();
      finish(started, {
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
    const nextChatLog = appendChatLog(
      (recipe.chat_log ?? []) as ChatLogEntry[],
      message,
      ai.change_summary ?? ai.insights.summary,
    );

    const { data: updated, error: updateError } = await supabase
      .from("recipes")
      .update({
        title: ai.title,
        servings_base: ai.servings_base,
        ingredients: ai.ingredients,
        steps: ai.steps,
        insights: ai.insights,
        chat_log: nextChatLog,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select(
        "id, title, mode, servings_base, ingredients, steps, insights, persona_query, persona_fallback_used, is_favorite, chat_log, created_at, updated_at",
      )
      .single();

    if (updateError || !updated) {
      await refundGenerationSlot();
      aiLog.error("api/refine", {
        phase: "update_error",
        message: updateError?.message ?? "missing_row",
      });
      finish(started, {
        status: 500,
        error: "server_error",
        slotClaimed: true,
      });
      return NextResponse.json(
        {
          error: "server_error",
          message: "Could not save the updated recipe. Please try again.",
        },
        { status: 500 },
      );
    }

    finish(started, { status: 200, slotClaimed: true });
    return NextResponse.json({ recipe: updated }, { status: 200 });
  });
}
