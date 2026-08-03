import {
  ALLERGY_OPTIONS,
  DIET_TYPES,
  GOAL_OPTIONS,
  type AllergyOption,
  type DietType,
  type GoalOption,
} from "@/lib/constants";

export function humanizeOption(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const DIET_TYPE_OPTIONS = DIET_TYPES.map((value) => ({
  value,
  label: value === "none" ? "No specific diet" : humanizeOption(value),
}));

export const ALLERGY_CHECKBOX_OPTIONS = ALLERGY_OPTIONS.map((value) => ({
  value,
  label: humanizeOption(value),
}));

export const GOAL_CHECKBOX_OPTIONS = GOAL_OPTIONS.map((value) => ({
  value,
  label: humanizeOption(value),
}));

export type { AllergyOption, DietType, GoalOption };
