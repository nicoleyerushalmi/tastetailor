import { createClient } from "@/lib/supabase/server";
import { DEFAULT_GENERATIONS_PER_DAY } from "@/lib/constants";
import { markSlotRefunded } from "@/lib/ai/log";

export async function refundGenerationSlot() {
  try {
    const supabase = await createClient();
    await supabase.rpc("refund_generation_slot");
    markSlotRefunded();
  } catch (error) {
    console.error("[refundGenerationSlot] failed:", error);
  }
}

export function generationsPerDay() {
  const raw = process.env.GENERATIONS_PER_DAY;
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_GENERATIONS_PER_DAY;
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_GENERATIONS_PER_DAY;
}
