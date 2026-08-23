export function RecipeCardSkeleton() {
  return (
    <div className="overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="h-36 w-full animate-pulse bg-[var(--color-border)]/60" />
      <div className="flex flex-col gap-3 px-4 py-4">
        <div className="h-5 w-[80%] animate-pulse rounded bg-[var(--color-border)]/70" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--color-border)]/50" />
      </div>
    </div>
  );
}

export function HistoryGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <RecipeCardSkeleton key={index} />
      ))}
    </div>
  );
}
