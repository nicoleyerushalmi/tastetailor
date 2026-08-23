import { HistoryGridSkeleton } from "@/components/history/HistorySkeleton";
import { PageHeader } from "@/components/layout/PageHeader";

export default function HistoryLoading() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 lg:py-12">
      <PageHeader
        eyebrow="Library"
        title="History"
        lede="Every recipe you’ve fitted — open one to scale, refine, or shop."
      />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-9 w-24 animate-pulse rounded-[var(--radius-control)] bg-[var(--color-border)]/60"
          />
        ))}
      </div>
      <HistoryGridSkeleton />
    </main>
  );
}
