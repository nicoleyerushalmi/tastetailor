import Link from "next/link";
import { getCurrentUserAndProfile } from "@/lib/profile/get-profile";

export default async function NotFound() {
  const { user, profile } = await getCurrentUserAndProfile();

  const { href, label } = !user
    ? { href: "/", label: "Back home" }
    : profile?.onboarding_completed
      ? { href: "/generate", label: "Go to generate" }
      : { href: "/onboarding", label: "Continue onboarding" };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start justify-center gap-4 px-4 py-24 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--color-ink)]">
        Page not found
      </h1>
      <p className="text-sm text-[var(--color-ink-muted)]">
        The page you&rsquo;re looking for doesn&rsquo;t exist.
      </p>
      <Link
        href={href}
        className="inline-flex h-11 items-center rounded-md bg-[var(--color-accent)] px-5 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)]"
      >
        {label}
      </Link>
    </main>
  );
}
