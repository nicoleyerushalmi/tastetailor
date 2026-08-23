"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type FavoriteButtonProps = {
  recipeId: string;
  isFavorite: boolean;
};

export function FavoriteButton({ recipeId, isFavorite }: FavoriteButtonProps) {
  const [favorite, setFavorite] = useState(isFavorite);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const next = !favorite;
    setFavorite(next);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("recipes")
      .update({ is_favorite: next })
      .eq("id", recipeId);
    setLoading(false);
    if (error) {
      setFavorite(!next);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      aria-pressed={favorite}
      aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] border transition ${
        favorite
          ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
      }`}
    >
      <Heart
        className="h-4 w-4"
        strokeWidth={2}
        fill={favorite ? "currentColor" : "none"}
      />
    </button>
  );
}
