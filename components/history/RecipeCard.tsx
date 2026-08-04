import Link from "next/link";
import type { RecipeSummary } from "@/types/recipe";

type RecipeCardProps = RecipeSummary;

export function RecipeCard({ id, title, created_at, is_favorite, mode }: RecipeCardProps) {
  const date = new Date(created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Link
      href={`/recipes/${id}`}
      className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-accent)]"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 font-medium text-[var(--color-ink)]">{title}</h3>
        {is_favorite ? (
          <span aria-label="Favorite" className="shrink-0 text-[var(--color-accent)]">
            ♥
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
        <span>{date}</span>
        <span aria-hidden="true">·</span>
        <span>{mode === "adapt" ? "Adapted" : "From scratch"}</span>
      </div>
    </Link>
  );
}
