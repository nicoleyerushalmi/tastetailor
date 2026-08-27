import { test, expect } from "playwright/test";
import {
  AUTH_FILE_A,
  clientFromStorageState,
  serviceRoleClient,
  userIdFromStorageState,
} from "./env";

function baseRecipe(userId: string, overrides: Record<string, unknown> = {}) {
  return {
    user_id: userId,
    title: `db-ok-${Date.now()}`,
    mode: "scratch",
    servings_base: 4,
    ingredients: [{ name: "salt", quantity: 1, unit: "tsp" }],
    steps: ["mix"],
    insights: { summary: "ok", substitutions: [] },
    source_input: { dish_name: "db" },
    ...overrides,
  };
}

test.describe("database constraints (DB-*)", () => {
  test("DB-01/02/03: mode, servings_base, and title checks reject bad rows", async () => {
    const supabase = await clientFromStorageState(AUTH_FILE_A);
    const userId = await userIdFromStorageState(AUTH_FILE_A);

    const badMode = await supabase
      .from("recipes")
      .insert(baseRecipe(userId, { mode: "invalid" }))
      .select("id")
      .maybeSingle();
    expect(badMode.error).toBeTruthy();
    expect(badMode.error?.code).toBe("23514");

    const badServings = await supabase
      .from("recipes")
      .insert(baseRecipe(userId, { servings_base: 0 }))
      .select("id")
      .maybeSingle();
    expect(badServings.error).toBeTruthy();
    expect(badServings.error?.code).toBe("23514");

    const emptyTitle = await supabase
      .from("recipes")
      .insert(baseRecipe(userId, { title: "" }))
      .select("id")
      .maybeSingle();
    expect(emptyTitle.error).toBeTruthy();
    expect(emptyTitle.error?.code).toBe("23514");

    const longTitle = await supabase
      .from("recipes")
      .insert(baseRecipe(userId, { title: "x".repeat(161) }))
      .select("id")
      .maybeSingle();
    expect(longTitle.error).toBeTruthy();
    expect(longTitle.error?.code).toBe("23514");
  });

  test("DB-04: handle_new_user creates a profiles row", async () => {
    const admin = serviceRoleClient();
    test.skip(
      !admin,
      "Set SUPABASE_SERVICE_ROLE_KEY in .env.local to run DB-04",
    );

    const email = `db04-${Date.now()}@tastetailor.test`;
    const password = `Db04-${Date.now()}!`;
    const created = await admin!.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: "DB04" },
    });
    expect(created.error).toBeNull();
    const userId = created.data.user?.id;
    expect(userId).toBeTruthy();

    try {
      const { data: profile, error } = await admin!
        .from("profiles")
        .select("id, display_name, onboarding_completed")
        .eq("id", userId!)
        .maybeSingle();
      expect(error).toBeNull();
      expect(profile?.id).toBe(userId);
      expect(profile?.onboarding_completed).toBe(false);
      expect(profile?.display_name).toBeTruthy();
    } finally {
      await admin!.auth.admin.deleteUser(userId!);
    }
  });

  test("DB-05: shopping unique (user_id, name, unit) merges via upsert", async () => {
    const supabase = await clientFromStorageState(AUTH_FILE_A);
    const userId = await userIdFromStorageState(AUTH_FILE_A);
    const marker = `db05-${Date.now()}`;

    const first = await supabase
      .from("shopping_list_items")
      .insert({
        user_id: userId,
        name: marker,
        display_name: marker,
        quantity: 1,
        unit: "cup",
        source_recipe_ids: [],
      })
      .select("id, quantity")
      .single();
    expect(first.error).toBeNull();
    expect(first.data?.quantity).toBe(1);

    const dup = await supabase.from("shopping_list_items").insert({
      user_id: userId,
      name: marker,
      display_name: marker,
      quantity: 2,
      unit: "cup",
      source_recipe_ids: [],
    });
    expect(dup.error).toBeTruthy();
    expect(dup.error?.code).toBe("23505");

    const upserted = await supabase
      .from("shopping_list_items")
      .upsert(
        {
          user_id: userId,
          name: marker,
          display_name: marker,
          quantity: 3,
          unit: "cup",
          source_recipe_ids: [],
        },
        { onConflict: "user_id,name,unit" },
      )
      .select("id, quantity")
      .single();
    expect(upserted.error).toBeNull();
    expect(upserted.data?.id).toBe(first.data!.id);
    expect(Number(upserted.data?.quantity)).toBe(3);

    const { data: rows } = await supabase
      .from("shopping_list_items")
      .select("id")
      .eq("user_id", userId)
      .eq("name", marker)
      .eq("unit", "cup");
    expect(rows ?? []).toHaveLength(1);

    await supabase.from("shopping_list_items").delete().eq("id", first.data!.id);
  });

  test("DB-08: recipe image columns from migration 0004 exist", async () => {
    const supabase = await clientFromStorageState(AUTH_FILE_A);
    const { data, error } = await supabase
      .from("recipes")
      .select("image_url, image_alt, image_credit_name, image_credit_url")
      .limit(1);
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  test("DB-09: deleting a recipe strips its id from shopping source_recipe_ids", async () => {
    const supabase = await clientFromStorageState(AUTH_FILE_A);
    const userId = await userIdFromStorageState(AUTH_FILE_A);

    const recipe = await supabase
      .from("recipes")
      .insert(baseRecipe(userId, { title: `db09-${Date.now()}` }))
      .select("id")
      .single();
    expect(recipe.error).toBeNull();
    const recipeId = recipe.data!.id as string;

    const marker = `db09-shop-${Date.now()}`;
    const item = await supabase
      .from("shopping_list_items")
      .insert({
        user_id: userId,
        name: marker,
        display_name: marker,
        quantity: 1,
        unit: "g",
        source_recipe_ids: [recipeId],
      })
      .select("id")
      .single();
    expect(item.error).toBeNull();

    const deleted = await supabase
      .from("recipes")
      .delete()
      .eq("id", recipeId)
      .select("id");
    expect(deleted.error).toBeNull();
    expect(deleted.data ?? []).toHaveLength(1);

    const { data: after, error } = await supabase
      .from("shopping_list_items")
      .select("id, source_recipe_ids")
      .eq("id", item.data!.id)
      .maybeSingle();
    expect(error).toBeNull();
    expect(after).toBeTruthy();
    expect(after!.source_recipe_ids ?? []).not.toContain(recipeId);

    await supabase.from("shopping_list_items").delete().eq("id", item.data!.id);
  });
});
