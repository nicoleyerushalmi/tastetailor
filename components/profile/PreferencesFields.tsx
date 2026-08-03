"use client";

import { CheckboxGroup } from "@/components/ui/CheckboxGroup";
import { Select } from "@/components/ui/Select";
import { TextArea } from "@/components/ui/TextArea";
import { TextField } from "@/components/ui/TextField";
import {
  ALLERGY_CHECKBOX_OPTIONS,
  DIET_TYPE_OPTIONS,
  GOAL_CHECKBOX_OPTIONS,
} from "@/lib/profile/options";
import type { DietType } from "@/lib/constants";

export type PreferencesValues = {
  display_name: string;
  diet_type: DietType;
  allergies: string[];
  goals: string[];
  preferences_notes: string;
};

type PreferencesFieldsProps = {
  values: PreferencesValues;
  onChange: (next: PreferencesValues) => void;
  errors?: Record<string, string>;
};

export function PreferencesFields({
  values,
  onChange,
  errors = {},
}: PreferencesFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      <TextField
        label="Display name"
        name="display_name"
        autoComplete="nickname"
        value={values.display_name}
        onChange={(event) =>
          onChange({ ...values, display_name: event.target.value })
        }
        error={errors.display_name}
      />
      <Select
        label="Diet type"
        name="diet_type"
        options={DIET_TYPE_OPTIONS}
        value={values.diet_type}
        onChange={(event) =>
          onChange({
            ...values,
            diet_type: event.target.value as DietType,
          })
        }
        error={errors.diet_type}
      />
      <CheckboxGroup
        label="Allergies"
        name="allergies"
        options={ALLERGY_CHECKBOX_OPTIONS}
        values={values.allergies}
        onChange={(allergies) => onChange({ ...values, allergies })}
        error={errors.allergies}
      />
      <CheckboxGroup
        label="Goals"
        name="goals"
        options={GOAL_CHECKBOX_OPTIONS}
        values={values.goals}
        onChange={(goals) => onChange({ ...values, goals })}
        error={errors.goals}
      />
      <TextArea
        label="Notes (optional)"
        name="preferences_notes"
        value={values.preferences_notes}
        onChange={(event) =>
          onChange({ ...values, preferences_notes: event.target.value })
        }
        error={errors.preferences_notes}
        placeholder="Anything else we should know about how you eat?"
      />
    </div>
  );
}
