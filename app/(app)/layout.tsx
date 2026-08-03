import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/layout/AppNav";
import { getCurrentUserAndProfile } from "@/lib/profile/get-profile";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    redirect("/login");
  }

  if (!profile?.onboarding_completed) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppNav />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
