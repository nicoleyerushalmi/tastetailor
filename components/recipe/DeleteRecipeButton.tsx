"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

type DeleteRecipeButtonProps = {
  recipeId: string;
  title: string;
};

export function DeleteRecipeButton({ recipeId, title }: DeleteRecipeButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    const ok = window.confirm(`Delete “${title}”? This cannot be undone.`);
    if (!ok) return;

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("recipes")
      .delete()
      .eq("id", recipeId);
    setLoading(false);

    if (deleteError) {
      setError("Could not delete this recipe. Please try again.");
      return;
    }

    router.push("/history");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="ghost"
        loading={loading}
        onClick={onDelete}
        className="h-10 px-3 text-red-700 hover:text-red-800"
      >
        Delete
      </Button>
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
