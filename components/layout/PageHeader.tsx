import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  lede?: string;
  children?: ReactNode;
};

export function PageHeader({ eyebrow, title, lede, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--color-ink)] md:text-[2.5rem]">
        {title}
      </h1>
      {lede ? (
        <p className="max-w-2xl text-[var(--color-ink-muted)]">{lede}</p>
      ) : null}
      {children}
    </div>
  );
}
