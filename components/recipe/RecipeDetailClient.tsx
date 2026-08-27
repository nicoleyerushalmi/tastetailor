"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { AddToShoppingListButton } from "@/components/recipe/AddToShoppingListButton";
import { CookModeView } from "@/components/recipe/CookModeView";
import { IngredientList } from "@/components/recipe/IngredientList";
import { InsightsBox } from "@/components/recipe/InsightsBox";
import { RecipeHeader } from "@/components/recipe/RecipeHeader";
import { RefineChat } from "@/components/recipe/RefineChat";
import { ServingScaler } from "@/components/recipe/ServingScaler";
import { StepList } from "@/components/recipe/StepList";
import { Toast } from "@/components/ui/Toast";
import { mapApiError } from "@/lib/generate/mapApiError";
import { safeRecipeImageSrc } from "@/lib/images/safeRecipeImage";
import type { ChatLogEntry, Ingredient, RecipeInsights } from "@/types/recipe";

export type RecipeDetailClientProps = {
  recipeId: string;
  title: string;
  mode: "adapt" | "scratch";
  servingsBase: number;
  personaQuery: string | null;
  personaFallbackUsed: boolean;
  isFavorite: boolean;
  ingredients: Ingredient[];
  steps: string[];
  insights: RecipeInsights;
  chatLog: ChatLogEntry[];
  imageUrl?: string | null;
  imageAlt?: string | null;
  imageCreditName?: string | null;
  imageCreditUrl?: string | null;
};

type RecipeState = {
  title: string;
  servingsBase: number;
  ingredients: Ingredient[];
  steps: string[];
  insights: RecipeInsights;
  personaFallbackUsed: boolean;
  chatLog: ChatLogEntry[];
};

export function RecipeDetailClient({
  recipeId,
  title,
  mode,
  servingsBase,
  personaQuery,
  personaFallbackUsed,
  isFavorite,
  ingredients,
  steps,
  insights,
  chatLog,
  imageUrl,
  imageAlt,
  imageCreditName,
  imageCreditUrl,
}: RecipeDetailClientProps) {
  const reduceMotion = useReducedMotion();
  const [recipe, setRecipe] = useState<RecipeState>({
    title,
    servingsBase,
    ingredients,
    steps,
    insights,
    personaFallbackUsed,
    chatLog,
  });
  const [uiServings, setUiServings] = useState(servingsBase);
  const [refineLoading, setRefineLoading] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [cookMode, setCookMode] = useState(false);

  async function submitRefine(message: string): Promise<boolean> {
    setRefineLoading(true);
    setRefineError(null);

    try {
      const response = await fetch(`/api/recipes/${recipeId}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const mapped = mapApiError(payload);
        setRefineError(
          mapped.formError ??
            mapped.fieldErrors.message ??
            "Something went wrong. Please try again.",
        );
        return false;
      }

      const updated = payload.recipe;
      setRecipe({
        title: updated.title,
        servingsBase: updated.servings_base,
        ingredients: updated.ingredients,
        steps: updated.steps,
        insights: updated.insights,
        personaFallbackUsed: updated.persona_fallback_used,
        chatLog: updated.chat_log ?? [],
      });
      setUiServings(updated.servings_base);
      setToast("Recipe updated");
      return true;
    } catch {
      setRefineError("Something went wrong. Please try again.");
      return false;
    } finally {
      setRefineLoading(false);
    }
  }

  return (
    <>
      {cookMode ? (
        <CookModeView
          title={recipe.title}
          servings={uiServings}
          servingsBase={recipe.servingsBase}
          ingredients={recipe.ingredients}
          steps={recipe.steps}
          onClose={() => setCookMode(false)}
        />
      ) : null}
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 lg:py-12">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <RecipeHeader
          recipeId={recipeId}
          title={recipe.title}
          mode={mode}
          servingsBase={recipe.servingsBase}
          personaQuery={personaQuery}
          isFavorite={isFavorite}
          onCookMode={() => setCookMode(true)}
        />
      </motion.div>

      <div className="flex flex-col gap-2">
        <div className="relative h-40 overflow-hidden border border-[var(--color-border)] sm:h-52">
          <Image
            src={safeRecipeImageSrc(imageUrl)}
            alt={imageAlt?.trim() || ""}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 960px"
            priority
          />
          <div className="absolute inset-0 bg-[var(--color-ink)]/20" />
        </div>
        {imageUrl &&
        safeRecipeImageSrc(imageUrl).startsWith("http") &&
        imageCreditName ? (
          <p className="text-xs text-[var(--color-ink-muted)]">
            Photo by{" "}
            {imageCreditUrl ? (
              <a
                href={imageCreditUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-[var(--color-border)] underline-offset-2 hover:text-[var(--color-ink)]"
              >
                {imageCreditName}
              </a>
            ) : (
              imageCreditName
            )}{" "}
            on{" "}
            <a
              href="https://unsplash.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-[var(--color-border)] underline-offset-2 hover:text-[var(--color-ink)]"
            >
              Unsplash
            </a>
          </p>
        ) : null}
      </div>

      <motion.div
        className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-12"
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05, ease: "easeOut" }}
      >
        <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <ServingScaler
            servingsBase={recipe.servingsBase}
            value={uiServings}
            onChange={setUiServings}
          />
          <IngredientList
            ingredients={recipe.ingredients}
            servingsBase={recipe.servingsBase}
            uiServings={uiServings}
          />
          <AddToShoppingListButton
            recipeId={recipeId}
            ingredients={recipe.ingredients}
            servingsBase={recipe.servingsBase}
            uiServings={uiServings}
          />
        </div>

        <div className="flex flex-col gap-8">
          <StepList steps={recipe.steps} />
          <InsightsBox
            insights={recipe.insights}
            fallbackUsed={recipe.personaFallbackUsed}
            personaQuery={personaQuery}
            retryLoading={refineLoading}
            onRetryPersona={
              personaQuery
                ? () =>
                    submitRefine(
                      `Please search again for "${personaQuery}"'s actual recipe for this dish before falling back to a generic version.`,
                    )
                : undefined
            }
          />
          <RefineChat
            chatLog={recipe.chatLog}
            loading={refineLoading}
            error={refineError}
            onSubmit={submitRefine}
          />
        </div>
      </motion.div>

      <Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
    </main>
    </>
  );
}
