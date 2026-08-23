import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  children?: ReactNode;
  showImage?: boolean;
};

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  children,
  showImage = true,
}: EmptyStateProps) {
  return (
    <div className="overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)]">
      {showImage ? (
        <div className="relative h-40 w-full sm:h-48">
          <Image
            src="/images/empty.jpg"
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 640px"
          />
          <div className="absolute inset-0 bg-[var(--color-ink)]/25" />
        </div>
      ) : null}
      <div className="flex flex-col items-start gap-3 px-6 py-8">
        <h2 className="font-display text-xl font-semibold text-[var(--color-ink)]">
          {title}
        </h2>
        {description ? (
          <p className="max-w-md text-sm text-[var(--color-ink-muted)]">
            {description}
          </p>
        ) : null}
        {actionHref && actionLabel ? (
          <Link
            href={actionHref}
            className="mt-1 inline-flex h-10 items-center rounded-[var(--radius-control)] bg-[var(--color-accent)] px-4 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)]"
          >
            {actionLabel}
          </Link>
        ) : null}
        {children}
      </div>
    </div>
  );
}
