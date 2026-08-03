import { GenerateTabs } from "@/components/generate/GenerateTabs";

export default function GeneratePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--color-ink)]">
          Generate
        </h1>
        <p className="mt-1 text-[var(--color-ink-muted)]">
          Paste a recipe to adapt, or start from a dish name. Add a creator to
          follow their version when we can find it — sources are shown on the
          result.
        </p>
      </div>
      <GenerateTabs />
    </main>
  );
}
