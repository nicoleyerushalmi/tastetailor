import Image from "next/image";
import { GenerateTabs } from "@/components/generate/GenerateTabs";
import { PageHeader } from "@/components/layout/PageHeader";

type GeneratePageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function GeneratePage({ searchParams }: GeneratePageProps) {
  const params = await searchParams;
  const defaultTab = params.tab === "scratch" ? "scratch" : "adapt";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10 sm:px-6 lg:py-12">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-12">
        <div className="flex flex-col gap-6">
          <PageHeader
            eyebrow="Create"
            title="Generate"
            lede="Paste a recipe to adapt, or start from a dish name. Add a creator to follow their version when we can find it — sources show on the result."
          />
          <GenerateTabs defaultTab={defaultTab} />
        </div>

        <aside className="relative hidden min-h-[28rem] overflow-hidden border border-[var(--color-border)] lg:block">
          <Image
            src="/images/generate.jpg"
            alt=""
            fill
            priority
            className="object-cover"
            sizes="40vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-ink)]/60 via-[var(--color-ink)]/10 to-transparent" />
          <div className="absolute inset-x-6 bottom-6 z-10 space-y-4 rounded-2xl border border-white/25 bg-white/15 p-6 text-white shadow-[0_8px_32px_rgba(0,0,0,0.25)] backdrop-blur-md">
            <p className="font-display text-xl font-semibold">Tips</p>
            <ul className="space-y-3 text-sm text-white/85">
              <li>
                Paste the full recipe block — title, ingredients, and steps
                together.
              </li>
              <li>
                Name a creator if you want their version first; we cite sources
                when found.
              </li>
              <li>
                Your profile preferences are applied on every generate.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
