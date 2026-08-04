"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PersonaField } from "@/components/generate/PersonaField";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { mapApiError } from "@/lib/generate/mapApiError";

type AdaptRecipeFormProps = {
  onGenerated?: (recipeId: string, fallback: boolean) => void;
};

export function AdaptRecipeForm({ onGenerated }: AdaptRecipeFormProps) {
  const router = useRouter();
  const [recipeText, setRecipeText] = useState("");
  const [personaQuery, setPersonaQuery] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "adapt",
          recipe_text: recipeText,
          persona_query: personaQuery.trim() || null,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const mapped = mapApiError(payload);
        setFieldErrors(mapped.fieldErrors);
        setFormError(mapped.formError);
        setLoading(false);
        return;
      }

      const recipeId = payload.recipe?.id as string;
      const fallback = Boolean(payload.recipe?.persona_fallback_used);
      onGenerated?.(recipeId, fallback);
      router.push(`/recipes/${recipeId}`);
      router.refresh();
    } catch {
      setFormError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <TextArea
        label="Paste a recipe"
        name="recipe_text"
        value={recipeText}
        onChange={(event) => setRecipeText(event.target.value)}
        error={fieldErrors.recipe_text}
        placeholder={
          "Paste any recipe as-is — title, ingredients, and steps in one block.\n\nExample:\nCreamy tomato pasta\n\nIngredients:\n- 400g pasta\n- 2 cups tomato sauce\n...\n\nSteps:\n1. Boil pasta...\n2. ..."
        }
        className="min-h-56"
        required
      />
      <PersonaField
        value={personaQuery}
        onChange={setPersonaQuery}
        error={fieldErrors.persona_query}
      />
      {formError ? (
        <p className="text-sm text-red-600" role="alert">
          {formError}
        </p>
      ) : null}
      <Button type="submit" loading={loading} className="w-full sm:w-auto">
        Generate recipe
      </Button>
    </form>
  );
}
