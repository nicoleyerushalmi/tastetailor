import Link from "next/link";
import { DeleteRecipeButton } from "@/components/recipe/DeleteRecipeButton";
import { FavoriteButton } from "@/components/recipe/FavoriteButton";

type RecipeHeaderProps = {
  recipeId: string;
  title: string;
  mode: "adapt" | "scratch";
  servingsBase: number;
  personaQuery: string | null;
  isFavorite: boolean;
};

export function RecipeHeader({
  recipeId,
  title,
  mode,
  servingsBase,
  personaQuery,
  isFavorite,
}: RecipeHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/history"
          className="text-sm font-medium text-[var(--color-accent)] hover:underline"
        >
          ← History
        </Link>
        <div className="flex items-center gap-2">
          <FavoriteButton recipeId={recipeId} isFavorite={isFavorite} />
          <DeleteRecipeButton recipeId={recipeId} title={title} />
        </div>
      </div>
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
          {mode === "adapt" ? "Adapted recipe" : "From scratch"} · base{" "}
          {servingsBase} servings
          {personaQuery ? ` · ${personaQuery}` : ""}
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--color-ink)] md:text-4xl">
          {title}
        </h1>
      </header>
    </div>
  );
}
