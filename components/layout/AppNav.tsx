"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/generate", label: "Generate" },
  { href: "/history", label: "History" },
  { href: "/favorites", label: "Favorites" },
  { href: "/shopping-list", label: "List" },
  { href: "/profile", label: "Profile" },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link
          href="/generate"
          className="font-[family-name:var(--font-display)] text-xl tracking-tight text-[var(--color-ink)]"
        >
          TasteTailor
        </Link>
        <nav className="flex flex-wrap gap-1" aria-label="App">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-[var(--color-accent-soft)] text-[var(--color-ink)]"
                    : "text-[var(--color-ink-muted)] hover:bg-white hover:text-[var(--color-ink)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
