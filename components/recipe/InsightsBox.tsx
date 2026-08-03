import type { RecipeInsights } from "@/types/recipe";

type InsightsBoxProps = {
  insights: RecipeInsights;
  fallbackUsed?: boolean;
  personaQuery?: string | null;
};

function isHttpUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function InsightsBox({
  insights,
  fallbackUsed,
  personaQuery,
}: InsightsBoxProps) {
  const sources = insights.sources ?? [];

  return (
    <div className="flex flex-col gap-4">
      {fallbackUsed && personaQuery ? (
        <div
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-accent-soft)] px-4 py-3 text-sm text-[var(--color-ink)]"
          role="status"
        >
          We couldn’t find “{personaQuery}”’s recipe for this dish — here’s a
          version tailored to your profile instead.
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
    </div>
  );
}
