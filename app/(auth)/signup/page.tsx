import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-ink)]">
          Create account
        </h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Set up TasteTailor with email and password.
        </p>
      </div>
      <SignupForm />
    </div>
  );
}
