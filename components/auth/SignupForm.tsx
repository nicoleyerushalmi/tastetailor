"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { createClient } from "@/lib/supabase/client";
import { SignupSchema } from "@/lib/validation/auth";

type SignupFormProps = {
  redirectTo?: string;
};

export function SignupForm({ redirectTo = "/onboarding" }: SignupFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = SignupSchema.safeParse({
      email,
      password,
      display_name: displayName.trim() || undefined,
    });

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
      setFieldErrors(nextErrors);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          display_name: parsed.data.display_name ?? null,
        },
      },
    });
    setLoading(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-4">
      <TextField
        label="Display name"
        name="display_name"
        autoComplete="nickname"
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        error={fieldErrors.display_name}
      />
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={fieldErrors.email}
        required
      />
      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={fieldErrors.password}
        required
      />
      {formError ? (
        <p className="text-sm text-red-600" role="alert">
          {formError}
        </p>
      ) : null}
      <Button type="submit" loading={loading} className="w-full">
        Create account
      </Button>
      <p className="text-center text-sm text-[var(--color-ink-muted)]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-[var(--color-accent)] hover:underline"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}
