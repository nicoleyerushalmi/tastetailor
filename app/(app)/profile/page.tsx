import { ProfileForm } from "@/components/profile/ProfileForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { getCurrentUserAndProfile } from "@/lib/profile/get-profile";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const { profile } = await getCurrentUserAndProfile();

  if (!profile) {
    redirect("/onboarding");
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 lg:py-12">
      <PageHeader
        eyebrow="Account"
        title="Your preferences"
        lede="Update how TasteTailor should tailor recipes for you."
      />
      <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
        <ProfileForm initial={profile} />
      </div>
    </main>
  );
}
