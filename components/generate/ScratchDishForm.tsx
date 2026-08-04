"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PersonaField } from "@/components/generate/PersonaField";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { mapApiError } from "@/lib/generate/mapApiError";

type ScratchDishFormProps = {
  onGenerated?: (recipeId: string, fallback: boolean) => void;
};

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
