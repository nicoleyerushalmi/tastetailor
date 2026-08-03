import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Ingredient, RecipeInsights, RecipeRow } from "@/types/recipe";

type RecipeDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatQuantity(quantity: number) {
  if (Number.isInteger(quantity)) return String(quantity);
  return String(Math.round(quantity * 100) / 100);
}

function isHttpUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default async function RecipeDetailPage({
  params,
}: RecipeDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const recipe = data as RecipeRow;
  const ingredients = (recipe.ingredients ?? []) as Ingredient[];
  const steps = (recipe.steps ?? []) as string[];
  const insights = (recipe.insights ?? {
    summary: "",
    substitutions: [],
    sources: [],
  }) as RecipeInsights;
  const sources = insights.sources ?? [];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/generate"
          className="text-sm font-medium text-[var(--color-accent)] hover:underline"
        >
          ← Generate
        </Link>
        <Link
          href="/history"
          className="text-sm text-[var(--color-ink-muted)] hover:underline"
        >
          History
        </Link>
      </div>

      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
          {recipe.mode === "adapt" ? "Adapted recipe" : "From scratch"} ·{" "}
          {recipe.servings_base} servings
          {recipe.persona_query ? ` · ${recipe.persona_query}` : ""}
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--color-ink)] md:text-4xl">
          {recipe.title}
        </h1>
      </header>

      {recipe.persona_fallback_used && recipe.persona_query ? (
        <div
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-accent-soft)] px-4 py-3 text-sm text-[var(--color-ink)]"
          role="status"
        >
          We couldn’t find “{recipe.persona_query}”’s recipe for this dish —
          here’s a version tailored to your profile instead.
        </div>
      ) : null}

      {sources.length > 0 ? (
        <section className="flex flex-col gap-2 rounded-lg border border-[var(--color-border)] bg-white px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            Sources
          </h2>
          <ul className="space-y-2">
            {sources.map((source, index) => (
              <li key={`${source.label}-${index}`} className="text-sm">
                {isHttpUrl(source.url) ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[var(--color-accent)] hover:underline"
                  >
                    {source.label}
                  </a>
                ) : (
                  <span className="font-medium text-[var(--color-ink)]">
                    {source.label}
                  </span>
                )}
                {source.note ? (
                  <span className="text-[var(--color-ink-muted)]">
                    {" — "}
                    {source.note}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-[var(--color-ink)]">
          Ingredients
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-[var(--color-ink)]">
          {ingredients.map((item, index) => (
            <li key={`${item.name}-${index}`}>
              {formatQuantity(item.quantity)}
              {item.unit ? ` ${item.unit}` : ""} {item.name}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-[var(--color-ink)]">Steps</h2>
        <ol className="list-decimal space-y-2 pl-5 text-[var(--color-ink)]">
          {steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="text-lg font-semibold text-[var(--color-ink)]">
          Insights
        </h2>
        <p className="text-[var(--color-ink-muted)]">{insights.summary}</p>
        {insights.substitutions?.length ? (
          <ul className="space-y-2">
            {insights.substitutions.map((sub, index) => (
              <li key={index} className="text-sm text-[var(--color-ink)]">
                {sub.original ? (
                  <span>
                    <span className="font-medium">{sub.original}</span>
                    {" → "}
                  </span>
                ) : null}
                <span className="font-medium">{sub.replacement}</span>
                <span className="text-[var(--color-ink-muted)]">
                  {" — "}
                  {sub.reason}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
