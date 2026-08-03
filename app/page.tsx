import Link from "next/link";

export default function HomePage() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(194,106,58,0.18),_transparent_50%),linear-gradient(160deg,#f7f1e8_0%,#e8d7c4_55%,#d9c0a4_100%)]"
      />
      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <span className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-ink)]">
          TasteTailor
        </span>
        <Link
          href="/login"
          className="text-sm font-medium text-[var(--color-ink)] hover:underline"
        >
          Log in
        </Link>
      </header>
      <main className="relative z-10 flex flex-1 flex-col justify-center px-6 pb-24 pt-10 md:px-10">
        <div className="max-w-xl">
          <h1 className="font-[family-name:var(--font-display)] text-5xl leading-tight tracking-tight text-[var(--color-ink)] md:text-6xl">
            TasteTailor
          </h1>
          <p className="mt-4 max-w-md text-lg text-[var(--color-ink-muted)]">
            Adapt any recipe — or start from a dish name — to match your diet,
            goals, and style.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center rounded-md bg-[var(--color-accent)] px-6 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)]"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center rounded-md border border-[var(--color-border)] bg-white/70 px-6 text-sm font-medium text-[var(--color-ink)] backdrop-blur hover:bg-white"
            >
              Log in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
