import { EmptyState } from "@/components/ui/EmptyState";

export default function RecipeNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 sm:px-6">
      <EmptyState
        title="Recipe not found"
        description="It may have been deleted, or you don't have access to it."
        actionLabel="Back to history"
        actionHref="/history"
      />
    </main>
  );
}
