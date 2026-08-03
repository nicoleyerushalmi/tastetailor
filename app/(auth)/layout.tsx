import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/profile/get-profile";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const { user, profile } = await getCurrentUserAndProfile();

  if (user) {
    redirect(profile?.onboarding_completed ? "/generate" : "/onboarding");
  }

  return (
    <div className="relative flex min-h-full flex-1 flex-col items-center justify-center px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(194,106,58,0.14),_transparent_55%),linear-gradient(180deg,#f7f1e8_0%,#efe4d6_100%)]"
      />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--color-ink)]"
          >
            TasteTailor
          </Link>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
            Recipes shaped to how you eat
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-white/90 p-6 shadow-sm backdrop-blur">
          {children}
        </div>
      </div>
    </div>
  );
}
