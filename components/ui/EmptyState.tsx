import Link from "next/link";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  children?: ReactNode;
};

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-10">
      <h2 className="text-lg font-semibold text-[var(--color-ink)]">{title}</h2>
      {description ? (
        <p className="max-w-md text-sm text-[var(--color-ink-muted)]">
          {description}
        </p>
      ) : null}
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-2 inline-flex h-10 items-center rounded-md bg-[var(--color-accent)] px-4 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)]"
        >
          {actionLabel}
        </Link>
      ) : null}
      {children}
    </div>
  );
}
