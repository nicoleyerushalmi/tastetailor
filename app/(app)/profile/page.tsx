import { ProfileForm } from "@/components/profile/ProfileForm";
import { getCurrentUserAndProfile } from "@/lib/profile/get-profile";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const { profile } = await getCurrentUserAndProfile();

  if (!profile) {
    redirect("/onboarding");
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--color-ink)]">
          Your preferences
        </h1>
        <p className="mt-1 text-[var(--color-ink-muted)]">
          Update how TasteTailor should tailor recipes for you.
        </p>
      </div>
      <ProfileForm initial={profile} />
    </main>
  );
}
