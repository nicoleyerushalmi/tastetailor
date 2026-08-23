import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between md:px-10">
        <div>
          <p className="font-display text-lg font-bold text-[var(--color-ink)]">
            TasteTailor
          </p>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Recipes fitted to how you eat.
          </p>
        </div>
        <Link
          href="/login"
          className="text-sm font-medium text-[var(--color-ink-muted)] transition hover:text-[var(--color-ink)]"
        >
          Log in
        </Link>
      </div>
    </footer>
  );
}
