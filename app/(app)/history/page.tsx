import { Pagination } from "@/components/history/Pagination";
import { RecipeCard } from "@/components/history/RecipeCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { HISTORY_PAGE_SIZE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { RecipeSummary } from "@/types/recipe";

const POSITIONS = ["20% 30%", "70% 40%", "40% 70%", "60% 20%", "30% 60%"];

type HistoryPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(0, Number.parseInt(pageParam ?? "0", 10) || 0);
  const from = page * HISTORY_PAGE_SIZE;
  const to = from + HISTORY_PAGE_SIZE - 1;

  const supabase = await createClient();
  const { data, count } = await supabase
    .from("recipes")
    .select("id,title,created_at,is_favorite,mode", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  const recipes = (data ?? []) as RecipeSummary[];
  const hasNext = from + recipes.length < (count ?? 0);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 lg:py-12">
      <PageHeader
        eyebrow="Library"
        title="History"
        lede="Every recipe you’ve fitted — open one to scale, refine, or shop."
      />
      {recipes.length === 0 ? (
        <EmptyState
          title={page > 0 ? "No more recipes" : "No recipes yet"}
          description={
            page > 0
              ? "You've reached the end of your history."
              : "Generated recipes will show up here."
          }
          actionLabel={page > 0 ? "Back to history" : "Go to generate"}
          actionHref={page > 0 ? "/history" : "/generate"}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe, index) => (
              <RecipeCard
                key={recipe.id}
                {...recipe}
                imagePosition={POSITIONS[index % POSITIONS.length]}
              />
            ))}
          </div>
          <Pagination basePath="/history" page={page} hasNext={hasNext} />
        </>
      )}
    </main>
  );
}
