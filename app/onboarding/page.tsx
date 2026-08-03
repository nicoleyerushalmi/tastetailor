import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { getCurrentUserAndProfile } from "@/lib/profile/get-profile";

export default async function OnboardingPage() {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    redirect("/login");
  }

  if (profile?.onboarding_completed) {
    redirect("/generate");
  }

  return (
    <main className="relative mx-auto flex min-h-full w-full max-w-xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(194,106,58,0.12),_transparent_55%),linear-gradient(180deg,#f7f1e8_0%,#efe4d6_100%)]"
      />
      <div>
        <p className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
          TasteTailor
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--color-ink)] md:text-4xl">
          Tell us how you eat
        </h1>
        <p className="mt-2 text-[var(--color-ink-muted)]">
          We use this once to shape every recipe to your diet, goals, and
          constraints.
        </p>
      </div>
      <div className="rounded-xl border border-[var(--color-border)] bg-white/90 p-6 shadow-sm backdrop-blur">
        <OnboardingForm initial={profile} />
      </div>
    </main>
  );
}
