"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PreferencesFields,
  type PreferencesValues,
} from "@/components/profile/PreferencesFields";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import type { DietType } from "@/lib/constants";
import { OnboardingSchema } from "@/lib/validation/profile";
import type { ProfileRow } from "@/types/profile";

type OnboardingFormProps = {
  initial: ProfileRow | null;
};

function toFormValues(initial: ProfileRow | null): PreferencesValues {
  return {
    display_name: initial?.display_name ?? "",
    diet_type: (initial?.diet_type as DietType) || "none",
    allergies: initial?.allergies ?? [],
    goals: initial?.goals ?? [],
    preferences_notes: initial?.preferences_notes ?? "",
  };
}

export function OnboardingForm({ initial }: OnboardingFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<PreferencesValues>(() =>
    toFormValues(initial),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = OnboardingSchema.safeParse({
      display_name: values.display_name.trim() || null,
      diet_type: values.diet_type,
      allergies: values.allergies,
      goals: values.goals,
      preferences_notes: values.preferences_notes.trim() || null,
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
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      setFormError("Your session expired. Please log in again.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: parsed.data.display_name ?? null,
        diet_type: parsed.data.diet_type,
        allergies: parsed.data.allergies,
        goals: parsed.data.goals,
        preferences_notes: parsed.data.preferences_notes ?? null,
        onboarding_completed: true,
      })
      .eq("id", user.id);

    setLoading(false);

    if (error) {
      setFormError("Could not save your preferences. Please try again.");
      return;
    }

    router.push("/generate");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-6">
      <PreferencesFields
        values={values}
        onChange={setValues}
        errors={fieldErrors}
      />
      {formError ? (
        <p className="text-sm text-red-600" role="alert">
          {formError}
        </p>
      ) : null}
      <Button type="submit" loading={loading} className="w-full">
        Save and continue
      </Button>
    </form>
  );
}
