import Link from "next/link";
import { ChefHat } from "lucide-react";
import { DeleteRecipeButton } from "@/components/recipe/DeleteRecipeButton";
import { FavoriteButton } from "@/components/recipe/FavoriteButton";
import { Button } from "@/components/ui/Button";

type RecipeHeaderProps = {
  recipeId: string;
  title: string;
  mode: "adapt" | "scratch";
  servingsBase: number;
  personaQuery: string | null;
  isFavorite: boolean;
  onCookMode?: () => void;
};

export function RecipeHeader({
  recipeId,
  title,
  mode,
  servingsBase,
  personaQuery,
  isFavorite,
  onCookMode,
}: RecipeHeaderProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/history"
          className="text-sm font-medium text-[var(--color-ink-muted)] transition hover:text-[var(--color-ink)]"
        >
          ← History
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {onCookMode ? (
            <Button
              type="button"
              variant="secondary"
              onClick={onCookMode}
              className="h-10 gap-2 px-3"
            >
              <ChefHat className="h-4 w-4" strokeWidth={2} />
              Cook mode
            </Button>
          ) : null}
          <FavoriteButton recipeId={recipeId} isFavorite={isFavorite} />
          <DeleteRecipeButton recipeId={recipeId} title={title} />
        </div>
      </div>
      <header className="flex flex-col gap-3 border-b border-[var(--color-border)] pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
          {mode === "adapt" ? "Adapted recipe" : "From scratch"}
          {" · "}
          base {servingsBase} servings
          {personaQuery ? ` · ${personaQuery}` : ""}
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--color-ink)] md:text-5xl">
          {title}
        </h1>
      </header>
    </div>
  );
}
