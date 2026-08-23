"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Heart,
  ListChecks,
  LogOut,
  Menu,
  Sparkles,
  User,
  History,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/generate", label: "Generate", icon: Sparkles },
  { href: "/history", label: "History", icon: History },
  { href: "/favorites", label: "Favorites", icon: Heart },
  { href: "/shopping-list", label: "List", icon: ListChecks },
  { href: "/profile", label: "Profile", icon: User },
] as const;

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [signingOut, setSigningOut] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function linkClass(href: string, compact = false) {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return `relative inline-flex items-center gap-2 ${compact ? "px-2 py-1.5" : "px-3 py-2"} text-sm font-medium transition ${
      active
        ? "text-[var(--color-ink)] after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-[var(--color-ink)]"
        : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
    }`;
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Link
            href="/generate"
            className="font-display text-xl font-bold tracking-tight text-[var(--color-ink)]"
          >
            TasteTailor
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="App">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={linkClass(item.href)}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="ml-2 inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--color-ink-muted)] transition hover:text-[var(--color-ink)] disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" strokeWidth={2} />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </nav>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center text-[var(--color-ink)] md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? (
              <X className="h-5 w-5" strokeWidth={2} />
            ) : (
              <Menu className="h-5 w-5" strokeWidth={2} />
            )}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-40 bg-[var(--color-ink)]/40 md:hidden"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 right-0 z-50 flex w-[min(20rem,88vw)] flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)] md:hidden"
              initial={reduceMotion ? false : { x: "100%" }}
              animate={{ x: 0 }}
              exit={reduceMotion ? undefined : { x: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
            >
              <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-4">
                <span className="font-display text-lg font-bold text-[var(--color-ink)]">
                  Menu
                </span>
                <button
                  type="button"
                  aria-label="Close menu"
                  className="inline-flex h-10 w-10 items-center justify-center"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>
              <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="App mobile">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`inline-flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-3 text-sm font-medium ${
                        active
                          ? "bg-[var(--color-accent-soft)] text-[var(--color-ink)]"
                          : "text-[var(--color-ink-muted)] hover:bg-white hover:text-[var(--color-ink)]"
                      }`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={2} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="border-t border-[var(--color-border)] p-3">
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="inline-flex w-full items-center gap-3 px-3 py-3 text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" strokeWidth={2} />
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
