import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockProvider } from "@/lib/ai/mock";

const user = { id: "user-a" };
const profile = {
  id: "user-a",
  display_name: "Ada",
  diet_type: "none",
  allergies: [] as string[],
  goals: ["high_protein"] as string[],
  preferences_notes: null as string | null,
  onboarding_completed: true,
  daily_generation_count: 0,
  daily_generation_reset_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const ownedRecipe = {
  id: "recipe-1",
  title: "Herb Bowl",
  servings_base: 4,
  ingredients: [{ name: "rice", quantity: 1, unit: "cup" }],
  steps: ["Cook rice."],
  persona_query: null,
  chat_log: [],
};

function makeSupabase(opts: {
  recipe?: typeof ownedRecipe | null;
  fetchError?: unknown;
  slotOk?: boolean;
  updated?: Record<string, unknown> | null;
  updateError?: unknown;
}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: opts.recipe === undefined ? ownedRecipe : opts.recipe,
    error: opts.fetchError ?? null,
  });
  const eqUser = vi.fn(() => ({ maybeSingle }));
  const eqId = vi.fn(() => ({ eq: eqUser }));
  const select = vi.fn(() => ({ eq: eqId }));

  const updateSingle = vi.fn().mockResolvedValue({
    data: opts.updated ?? { ...ownedRecipe, chat_log: [{ role: "user" }] },
    error: opts.updateError ?? null,
  });
  const updateSelect = vi.fn(() => ({ single: updateSingle }));
  const updateEqUser = vi.fn(() => ({ select: updateSelect }));
  const updateEqId = vi.fn(() => ({ eq: updateEqUser }));
  const update = vi.fn(() => ({ eq: updateEqId }));

  return {
    rpc: vi.fn().mockResolvedValue({
      data: opts.slotOk ?? true,
      error: null,
    }),
    from: vi.fn(() => ({ select, update })),
    _spies: { update, maybeSingle },
  };
}

vi.mock("@/lib/profile/get-profile", () => ({
  getCurrentUserAndProfile: vi.fn(),
}));

vi.mock("@/lib/ai", () => ({
  getRecipeProvider: vi.fn(),
}));

vi.mock("@/lib/ai/rate-limit", () => ({
  generationsPerDay: () => 20,
  refundGenerationSlot: vi.fn(async () => undefined),
}));

import { getCurrentUserAndProfile } from "@/lib/profile/get-profile";
import { getRecipeProvider } from "@/lib/ai";
import { POST } from "@/app/api/recipes/[id]/refine/route";

describe("POST /api/recipes/[id]/refine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRecipeProvider).mockReturnValue(createMockProvider());
  });

  it("AUTH-03: anonymous → 401", async () => {
    const supabase = makeSupabase({});
    vi.mocked(getCurrentUserAndProfile).mockResolvedValue({
      user: null,
      profile: null,
      supabase: supabase as never,
    });

    const res = await POST(
      new Request("http://localhost/api/recipes/recipe-1/refine", {
        method: "POST",
        body: JSON.stringify({ message: "make it spicy" }),
      }),
      { params: Promise.resolve({ id: "recipe-1" }) },
    );
    expect(res.status).toBe(401);
  });

  it("EDGE-08: unknown / non-owned recipe → 404", async () => {
    const supabase = makeSupabase({ recipe: null });
    vi.mocked(getCurrentUserAndProfile).mockResolvedValue({
      user: user as never,
      profile: profile as never,
      supabase: supabase as never,
    });

    const res = await POST(
      new Request("http://localhost/api/recipes/missing/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "make it spicy" }),
      }),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ error: "not_found" });
  });

  it("FEAT-12: valid refine updates recipe and appends chat_log", async () => {
    const supabase = makeSupabase({
      updated: {
        ...ownedRecipe,
        mode: "scratch",
        insights: { summary: "spicier", substitutions: [] },
        persona_fallback_used: false,
        is_favorite: false,
        chat_log: [
          { role: "user", message: "make it spicy", created_at: "t" },
          { role: "assistant", message: "Increased heat", created_at: "t" },
        ],
        created_at: "t",
        updated_at: "t",
      },
    });
    vi.mocked(getCurrentUserAndProfile).mockResolvedValue({
      user: user as never,
      profile: profile as never,
      supabase: supabase as never,
    });

    const res = await POST(
      new Request("http://localhost/api/recipes/recipe-1/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "make it spicy" }),
      }),
      { params: Promise.resolve({ id: "recipe-1" }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.recipe.chat_log.length).toBeGreaterThan(0);
    expect(supabase._spies.update).toHaveBeenCalled();
  });
});
