import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-ink)]">
          Log in
        </h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Welcome back — continue to your kitchen.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
