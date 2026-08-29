import Link from "next/link";

type SiteHeaderProps = {
  variant?: "light" | "on-photo";
};

export function SiteHeader({ variant = "light" }: SiteHeaderProps) {
  const onPhoto = variant === "on-photo";

  return (
    <header className="relative z-20 flex items-center justify-between px-6 py-5 md:px-10">
      <Link
        href="/"
        className={`font-logo text-2xl font-bold tracking-tight ${
          onPhoto ? "text-white" : "text-[var(--color-ink)]"
        }`}
      >
        TasteTailor
      </Link>
      <Link
        href="/login"
        className={`text-sm font-medium transition ${
          onPhoto
            ? "text-white/85 hover:text-white"
            : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
        }`}
      >
        Log in
      </Link>
    </header>
  );
}
