import { EmptyState } from "@/components/ui/EmptyState";

export default function HistoryPlaceholderPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 sm:px-6">
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-3xl text-[var(--color-ink)]">
        History
      </h1>
      <EmptyState
        title="No recipes yet"
        description="Generated recipes will show up here in Phase 6."
        actionLabel="Go to generate"
        actionHref="/generate"
      />
    </main>
  );
}
