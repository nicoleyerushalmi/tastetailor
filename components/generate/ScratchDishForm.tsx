"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PersonaField } from "@/components/generate/PersonaField";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

type ScratchDishFormProps = {
  onGenerated?: (recipeId: string, fallback: boolean) => void;
};

function mapApiError(payload: {
  error?: string;
  message?: string;
  issues?: Array<{ path: string[]; message: string }>;
}) {
  if (payload.error === "validation_error" && payload.issues?.length) {
    const next: Record<string, string> = {};
    for (const issue of payload.issues) {
      const key = issue.path[0] ?? "form";
      if (!next[key]) next[key] = issue.message;
    }
    return { fieldErrors: next, formError: null as string | null };
  }

  const messages: Record<string, string> = {
    non_culinary:
      "TasteTailor only generates recipes. Try a dish or recipe instead.",
    rate_limited: "Daily generation limit reached. Come back tomorrow.",
    invalid_ai_output: "Couldn't build a valid recipe. Please try again.",
    onboarding_required: "Finish onboarding before generating recipes.",
  };

  return {
    fieldErrors: {} as Record<string, string>,
    formError:
      messages[payload.error ?? ""] ??
      payload.message ??
      "Something went wrong. Please try again.",
  };
}

export function ScratchDishForm({ onGenerated }: ScratchDishFormProps) {
  const router = useRouter();
  const [dishName, setDishName] = useState("");
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
          mode: "scratch",
          dish_name: dishName,
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
      <TextField
        label="Dish name"
        name="dish_name"
        value={dishName}
        onChange={(event) => setDishName(event.target.value)}
        error={fieldErrors.dish_name}
        placeholder="e.g. lemon garlic chicken"
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
