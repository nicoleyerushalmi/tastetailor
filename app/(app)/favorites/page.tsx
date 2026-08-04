import { Pagination } from "@/components/history/Pagination";
import { RecipeCard } from "@/components/history/RecipeCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { HISTORY_PAGE_SIZE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { RecipeSummary } from "@/types/recipe";

type FavoritesPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function FavoritesPage({ searchParams }: FavoritesPageProps) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(0, Number.parseInt(pageParam ?? "0", 10) || 0);
  const from = page * HISTORY_PAGE_SIZE;
  const to = from + HISTORY_PAGE_SIZE - 1;

  const supabase = await createClient();
  const { data, count } = await supabase
    .from("recipes")
    .select("id,title,created_at,is_favorite,mode", { count: "exact" })
    .eq("is_favorite", true)
    .order("created_at", { ascending: false })
    .range(from, to);

  const recipes = (data ?? []) as RecipeSummary[];
  const hasNext = from + recipes.length < (count ?? 0);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-10 sm:px-6">
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-3xl text-[var(--color-ink)]">
        Favorites
      </h1>
      {recipes.length === 0 ? (
        <EmptyState
          title={page > 0 ? "No more favorites" : "No favorites yet"}
          description={
            page > 0
              ? "You've reached the end of your favorites."
              : "Heart a recipe to keep it here."
          }
          actionLabel={page > 0 ? "Back to favorites" : "Go to generate"}
          actionHref={page > 0 ? "/favorites" : "/generate"}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} {...recipe} />
            ))}
          </div>
          <Pagination basePath="/favorites" page={page} hasNext={hasNext} />
        </>
      )}
    </main>
  );
}
