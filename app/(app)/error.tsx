"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start gap-4 px-4 py-24 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--color-ink)]">
        Something went wrong
      </h1>
      <p className="text-sm text-[var(--color-ink-muted)]">Please try again.</p>
      <div className="flex gap-3">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Link
          href="/generate"
          className="inline-flex h-11 items-center rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 text-sm font-medium text-[var(--color-ink)] hover:bg-white"
        >
          Go to generate
        </Link>
      </div>
    </main>
  );
}
