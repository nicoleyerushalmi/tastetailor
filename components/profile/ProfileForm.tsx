"use client";

import { useState } from "react";
import {
  PreferencesFields,
  type PreferencesValues,
} from "@/components/profile/PreferencesFields";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import type { DietType } from "@/lib/constants";
import { ProfileUpdateSchema } from "@/lib/validation/profile";
import type { ProfileRow } from "@/types/profile";

type ProfileFormProps = {
  initial: ProfileRow;
};

function toFormValues(initial: ProfileRow): PreferencesValues {
  return {
    display_name: initial.display_name ?? "",
    diet_type: (initial.diet_type as DietType) || "none",
    allergies: initial.allergies ?? [],
    goals: initial.goals ?? [],
    preferences_notes: initial.preferences_notes ?? "",
  };
}

export function ProfileForm({ initial }: ProfileFormProps) {
  const [values, setValues] = useState<PreferencesValues>(() =>
    toFormValues(initial),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccess(false);
    setFieldErrors({});

    const parsed = ProfileUpdateSchema.safeParse({
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
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: parsed.data.display_name ?? null,
        diet_type: parsed.data.diet_type,
        allergies: parsed.data.allergies,
        goals: parsed.data.goals,
        preferences_notes: parsed.data.preferences_notes ?? null,
      })
      .eq("id", initial.id);

    setLoading(false);

    if (error) {
      setFormError("Could not save your preferences. Please try again.");
      return;
    }

    setSuccess(true);
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-6">
      <PreferencesFields
        values={values}
        onChange={setValues}
        errors={fieldErrors}
      />
      {formError ? (
        <p className="text-sm text-[var(--color-danger)]" role="alert">
          {formError}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm text-[var(--color-ink-muted)]" role="status">
          Preferences saved.
        </p>
      ) : null}
      <Button type="submit" loading={loading} className="w-full sm:w-auto">
        Save changes
      </Button>
    </form>
  );
}
