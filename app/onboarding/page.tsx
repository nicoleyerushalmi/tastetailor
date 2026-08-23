import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { PageHeader } from "@/components/layout/PageHeader";
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
    <main className="paper-grain mx-auto flex min-h-full w-full max-w-xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow="TasteTailor"
        title="Tell us how you eat"
        lede="We use this once to shape every recipe to your diet, goals, and constraints."
      />
      <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
        <OnboardingForm initial={profile} />
      </div>
    </main>
  );
}
