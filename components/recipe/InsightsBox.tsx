"use client";

import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { isHttpUrl } from "@/lib/security/isHttpUrl";
import type { RecipeInsights } from "@/types/recipe";

type InsightsBoxProps = {
  insights: RecipeInsights;
  fallbackUsed?: boolean;
  personaQuery?: string | null;
  onRetryPersona?: () => void;
  retryLoading?: boolean;
};

export { isHttpUrl };

export function InsightsBox({
  insights,
  fallbackUsed,
  personaQuery,
  onRetryPersona,
  retryLoading,
}: InsightsBoxProps) {
  const sources = insights.sources ?? [];
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="flex flex-col gap-5"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {fallbackUsed && personaQuery ? (
        <div
          className="flex flex-col items-start gap-2 border border-[var(--color-border)] bg-[var(--color-accent-soft)] px-4 py-3 text-sm text-[var(--color-ink)]"
          role="status"
        >
          <p>
            We couldn’t find “{personaQuery}”’s recipe for this dish — here’s a
            version tailored to your profile instead.
          </p>
          {onRetryPersona ? (
            <Button
              type="button"
              variant="secondary"
              loading={retryLoading}
              onClick={onRetryPersona}
              className="h-9 px-3 text-xs"
            >
              Try again
            </Button>
          ) : null}
        </div>
      ) : null}

      {sources.length > 0 ? (
        <section className="flex flex-col gap-2 border-l-2 border-[var(--color-accent)] pl-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
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

      <section className="flex flex-col gap-3 border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="font-display text-lg font-semibold text-[var(--color-ink)]">
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
    </motion.div>
  );
}
