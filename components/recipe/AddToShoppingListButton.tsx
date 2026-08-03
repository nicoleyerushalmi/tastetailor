"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import {
  mergeQuantity,
  normalizeName,
  normalizeUnit,
} from "@/lib/shopping/merge";
import { scaleIngredients } from "@/lib/shopping/scale";
import type { Ingredient, ShoppingListItemRow } from "@/types/recipe";

type AddToShoppingListButtonProps = {
  recipeId: string;
  ingredients: Ingredient[];
  servingsBase: number;
  uiServings: number;
};

export function AddToShoppingListButton({
  recipeId,
  ingredients,
  servingsBase,
  uiServings,
}: AddToShoppingListButtonProps) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"success" | "error">("success");

  async function onAdd() {
    setLoading(true);
    const supabase = createClient();
    const scaled = scaleIngredients(ingredients, servingsBase, uiServings).filter(
      (item) => item.quantity > 0 && item.name.trim().length > 0,
    );

    if (scaled.length === 0) {
      setToastTone("error");
      setToast("No ingredients to add.");
      setLoading(false);
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setToastTone("error");
      setToast("Your session expired. Please log in again.");
      setLoading(false);
      return;
    }

    const { data: existing, error: listError } = await supabase
      .from("shopping_list_items")
      .select("*")
      .eq("user_id", user.id);

    if (listError) {
      setToastTone("error");
      setToast("Could not update your shopping list.");
      setLoading(false);
      return;
    }

    const byKey = new Map<string, ShoppingListItemRow>();
    for (const row of (existing ?? []) as ShoppingListItemRow[]) {
      byKey.set(`${row.name}|${row.unit}`, row);
    }

    for (const item of scaled) {
      const name = normalizeName(item.name);
      const unit = normalizeUnit(item.unit ?? "");
      const key = `${name}|${unit}`;
      const current = byKey.get(key);

      if (current) {
        const sourceIds = current.source_recipe_ids.includes(recipeId)
          ? current.source_recipe_ids
          : [...current.source_recipe_ids, recipeId];

        const { data: updated, error } = await supabase
          .from("shopping_list_items")
          .update({
            quantity: mergeQuantity(current.quantity, item.quantity),
            source_recipe_ids: sourceIds,
            display_name: current.display_name || item.name.trim(),
          })
          .eq("id", current.id)
          .select("*")
          .single();

        if (error) {
          setToastTone("error");
          setToast("Could not update your shopping list.");
          setLoading(false);
          return;
        }

        byKey.set(key, updated as ShoppingListItemRow);
      } else {
        const { data: inserted, error } = await supabase
          .from("shopping_list_items")
          .insert({
            user_id: user.id,
            name,
            display_name: item.name.trim(),
            quantity: item.quantity,
            unit,
            is_checked: false,
            source_recipe_ids: [recipeId],
          })
          .select("*")
          .single();

        if (error) {
          setToastTone("error");
          setToast("Could not update your shopping list.");
          setLoading(false);
          return;
        }

        byKey.set(key, inserted as ShoppingListItemRow);
      }
    }

    setToastTone("success");
    setToast("Added to your shopping list.");
    setLoading(false);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" loading={loading} onClick={onAdd}>
          Add to shopping list
        </Button>
        <Link
          href="/shopping-list"
          className="text-sm font-medium text-[var(--color-accent)] hover:underline"
        >
          View list
        </Link>
      </div>
      <Toast message={toast} tone={toastTone} onDismiss={() => setToast(null)} />
    </>
  );
}
