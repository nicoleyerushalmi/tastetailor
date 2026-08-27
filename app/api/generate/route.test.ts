import { beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_REFUSE_KEYWORD, createMockProvider } from "@/lib/ai/mock";
import { UpstreamError } from "@/lib/ai/provider";

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

function makeSupabase(opts: {
  slotOk?: boolean;
  slotError?: unknown;
  insertError?: unknown;
  inserted?: Record<string, unknown> | null;
  imageUpdateError?: unknown;
}) {
  const inserted = opts.inserted ?? {
    id: "recipe-1",
    title: "Scratch Herb Bowl",
    mode: "scratch",
    servings_base: 4,
    ingredients: [],
    steps: [],
    insights: { summary: "ok", substitutions: [] },
    persona_query: null,
    persona_fallback_used: false,
    is_favorite: false,
    chat_log: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const single = vi.fn().mockResolvedValue({
    data: opts.insertError ? null : inserted,
    error: opts.insertError ?? null,
  });
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  const updateEqUser = vi.fn().mockResolvedValue({
    error: opts.imageUpdateError ?? null,
  });
  const updateEqId = vi.fn(() => ({ eq: updateEqUser }));
  const update = vi.fn(() => ({ eq: updateEqId }));

  return {
    rpc: vi.fn().mockResolvedValue({
      data: opts.slotOk ?? true,
      error: opts.slotError ?? null,
    }),
    from: vi.fn(() => ({ insert, update })),
    _spies: { insert, update, single, updateEqUser },
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

vi.mock("@/lib/images/unsplash", () => ({
  fetchRecipeImage: vi.fn(async () => null),
}));

import { getCurrentUserAndProfile } from "@/lib/profile/get-profile";
import { getRecipeProvider } from "@/lib/ai";
import { refundGenerationSlot } from "@/lib/ai/rate-limit";
import { fetchRecipeImage } from "@/lib/images/unsplash";
import { POST } from "@/app/api/generate/route";

describe("POST /api/generate (AUTH/INV/BP/FEAT API)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRecipeProvider).mockReturnValue(createMockProvider());
    vi.mocked(fetchRecipeImage).mockResolvedValue(null);
  });

  it("AUTH-02: anonymous → 401 unauthorized", async () => {
    const supabase = makeSupabase({});
    vi.mocked(getCurrentUserAndProfile).mockResolvedValue({
      user: null,
      profile: null,
      supabase: supabase as never,
    });

    const res = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        body: JSON.stringify({ mode: "scratch", dish_name: "soup" }),
      }),
    );
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ error: "unauthorized" });
  });

  it("AUTH-05: onboarding incomplete → 403", async () => {
    const supabase = makeSupabase({});
    vi.mocked(getCurrentUserAndProfile).mockResolvedValue({
      user: user as never,
      profile: { ...profile, onboarding_completed: false } as never,
      supabase: supabase as never,
    });

    const res = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "scratch", dish_name: "soup" }),
      }),
    );
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({
      error: "onboarding_required",
    });
  });

  it("INV-12: malformed JSON → 400 invalid_json", async () => {
    const supabase = makeSupabase({});
    vi.mocked(getCurrentUserAndProfile).mockResolvedValue({
      user: user as never,
      profile: profile as never,
      supabase: supabase as never,
    });

    const res = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        body: "{not-json",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "invalid_json" });
  });

  it("INV-13: wrong mode body → 400 validation_error", async () => {
    const supabase = makeSupabase({});
    vi.mocked(getCurrentUserAndProfile).mockResolvedValue({
      user: user as never,
      profile: profile as never,
      supabase: supabase as never,
    });

    const res = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "scratch" }),
      }),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "validation_error",
    });
  });

  it("BP-06: rate limited → 429", async () => {
    const supabase = makeSupabase({ slotOk: false });
    vi.mocked(getCurrentUserAndProfile).mockResolvedValue({
      user: user as never,
      profile: profile as never,
      supabase: supabase as never,
    });

    const res = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "scratch", dish_name: "soup" }),
      }),
    );
    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toMatchObject({ error: "rate_limited" });
  });

  it("FEAT-04: scratch generate → 201 owned recipe", async () => {
    const supabase = makeSupabase({});
    vi.mocked(getCurrentUserAndProfile).mockResolvedValue({
      user: user as never,
      profile: profile as never,
      supabase: supabase as never,
    });

    const res = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "scratch", dish_name: "herb bowl" }),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.recipe.id).toBe("recipe-1");
    expect(supabase._spies.insert).toHaveBeenCalled();
    const insertArg = supabase._spies.insert.mock.calls[0][0] as {
      user_id: string;
      mode: string;
    };
    expect(insertArg.user_id).toBe("user-a");
    expect(insertArg.mode).toBe("scratch");
  });

  it("FEAT-05: adapt generate → 201", async () => {
    const supabase = makeSupabase({
      inserted: {
        id: "recipe-2",
        title: "Adapted Herb Bowl",
        mode: "adapt",
        servings_base:
          4,
        ingredients: [{ name: "chicken", quantity: 1, unit: "" }],
        steps: ["Cook."],
        insights: { summary: "adapted", substitutions: [], sources: [] },
        persona_query: null,
        persona_fallback_used: false,
        is_favorite: false,
        chat_log: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
    vi.mocked(getCurrentUserAndProfile).mockResolvedValue({
      user: user as never,
      profile: profile as never,
      supabase: supabase as never,
    });

    const res = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "adapt",
          recipe_text: "Title\n1 cup flour\nMix and bake until golden brown.",
        }),
      }),
    );
    expect(res.status).toBe(201);
  });

  it("INV-15: non-culinary refuse → 400, no insert", async () => {
    const supabase = makeSupabase({});
    vi.mocked(getCurrentUserAndProfile).mockResolvedValue({
      user: user as never,
      profile: profile as never,
      supabase: supabase as never,
    });

    const res = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "scratch",
          dish_name: `do my ${MOCK_REFUSE_KEYWORD}`,
        }),
      }),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "non_culinary" });
    expect(supabase._spies.insert).not.toHaveBeenCalled();
    expect(refundGenerationSlot).not.toHaveBeenCalled();
  });

  it("EDGE-06 / BP-08: Unsplash null still returns 201", async () => {
    const supabase = makeSupabase({});
    vi.mocked(getCurrentUserAndProfile).mockResolvedValue({
      user: user as never,
      profile: profile as never,
      supabase: supabase as never,
    });
    vi.mocked(fetchRecipeImage).mockResolvedValue(null);

    const res = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "scratch", dish_name: "pancakes" }),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.recipe.image_url).toBeNull();
  });

  it("EDGE-07: image update failure still 201", async () => {
    const supabase = makeSupabase({
      imageUpdateError: { message: "column missing" },
    });
    vi.mocked(getCurrentUserAndProfile).mockResolvedValue({
      user: user as never,
      profile: profile as never,
      supabase: supabase as never,
    });
    vi.mocked(fetchRecipeImage).mockResolvedValue({
      url: "https://images.unsplash.com/photo.jpg",
      alt: "pancakes",
      creditName: "Ada",
      creditUrl: "https://unsplash.com/@ada",
    });

    const res = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "scratch", dish_name: "pancakes" }),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.recipe.image_url).toBeNull();
  });

  it("BP-07: upstream error refunds slot", async () => {
    const supabase = makeSupabase({});
    vi.mocked(getCurrentUserAndProfile).mockResolvedValue({
      user: user as never,
      profile: profile as never,
      supabase: supabase as never,
    });
    vi.mocked(getRecipeProvider).mockReturnValue({
      generate: vi.fn().mockRejectedValue(new UpstreamError("busy", 503)),
    });

    const res = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "scratch", dish_name: "soup" }),
      }),
    );
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({ error: "ai_unavailable" });
    expect(refundGenerationSlot).toHaveBeenCalled();
  });

  it("PRIV-08: insert always stamps authenticated user_id", async () => {
    const supabase = makeSupabase({});
    vi.mocked(getCurrentUserAndProfile).mockResolvedValue({
      user: { id: "user-a" } as never,
      profile: profile as never,
      supabase: supabase as never,
    });

    await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "scratch", dish_name: "soup" }),
      }),
    );

    const insertArg = supabase._spies.insert.mock.calls[0][0] as {
      user_id: string;
    };
    expect(insertArg.user_id).toBe("user-a");
  });

  it("SEC-07: upstream error JSON does not leak raw Gemini payload", async () => {
    const supabase = makeSupabase({});
    vi.mocked(getCurrentUserAndProfile).mockResolvedValue({
      user: user as never,
      profile: profile as never,
      supabase: supabase as never,
    });
    vi.mocked(getRecipeProvider).mockReturnValue({
      generate: vi
        .fn()
        .mockRejectedValue(
          new UpstreamError('Gemini HTTP 503: {"error":{"code":503}}', 503),
        ),
    });

    const res = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "scratch", dish_name: "soup" }),
      }),
    );
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain("Gemini HTTP");
    expect(body.error).toBe("ai_unavailable");
  });
});
