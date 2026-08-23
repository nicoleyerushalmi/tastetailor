import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Split } from "@/components/layout/Split";
import { getCurrentUserAndProfile } from "@/lib/profile/get-profile";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const { user, profile } = await getCurrentUserAndProfile();

  if (user) {
    redirect(profile?.onboarding_completed ? "/generate" : "/onboarding");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--background)]">
      <Split
        className="min-h-[100svh]"
        media={
          <>
            <Image
              src="/images/auth.jpg"
              alt=""
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="photo-veil absolute inset-0" aria-hidden />
            <div className="absolute inset-0 z-10 flex flex-col justify-between p-6 md:p-10">
              <Link
                href="/"
                className="font-display text-2xl font-bold tracking-tight text-white"
              >
                TasteTailor
              </Link>
              <p className="max-w-xs font-display text-2xl font-semibold leading-snug text-white md:text-3xl">
                Recipes fitted to how you eat.
              </p>
            </div>
          </>
        }
      >
        <div className="paper-grain flex flex-1 flex-col justify-center px-6 py-12 sm:px-10 lg:px-14">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <Link
                href="/"
                className="font-display text-2xl font-bold text-[var(--color-ink)]"
              >
                TasteTailor
              </Link>
            </div>
            <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
              {children}
            </div>
          </div>
        </div>
      </Split>
    </div>
  );
}
