import { createClient } from "@/lib/supabase/server";
import { DEFAULT_GENERATIONS_PER_DAY } from "@/lib/constants";

export async function refundGenerationSlot() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("daily_generation_count")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.daily_generation_count <= 0) return;

  await supabase
    .from("profiles")
    .update({
      daily_generation_count: profile.daily_generation_count - 1,
    })
    .eq("id", user.id);
}

export function generationsPerDay() {
  const raw = process.env.GENERATIONS_PER_DAY;
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_GENERATIONS_PER_DAY;
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_GENERATIONS_PER_DAY;
}
