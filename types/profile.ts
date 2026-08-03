export type ProfileRow = {
  id: string;
  display_name: string | null;
  allergies: string[];
  diet_type: string;
  goals: string[];
  preferences_notes: string | null;
  onboarding_completed: boolean;
  daily_generation_count: number;
  generation_count_reset_at: string;
  created_at: string;
  updated_at: string;
};
