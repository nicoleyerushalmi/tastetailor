"use client";

import { useState } from "react";
import { ClearListButton } from "@/components/shopping/ClearListButton";
import { ExportListButton } from "@/components/shopping/ExportListButton";
import { ShoppingListItem } from "@/components/shopping/ShoppingListItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/client";
import type { ShoppingListItemRow } from "@/types/recipe";

type ShoppingListClientProps = {
  initialItems: ShoppingListItemRow[];
};

export function ShoppingListClient({ initialItems }: ShoppingListClientProps) {
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);

  async function toggleItem(id: string, checked: boolean) {
    setError(null);
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_checked: checked } : item)),
    );

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("shopping_list_items")
      .update({ is_checked: checked })
      .eq("id", id);

    if (updateError) {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_checked: !checked } : item)),
      );
      setError("Could not update that item. Please try again.");
    }
  }

  async function deleteItem(id: string) {
    setError(null);
    const previous = items;
    setItems((prev) => prev.filter((item) => item.id !== id));

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("shopping_list_items")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setItems(previous);
      setError("Could not remove that item. Please try again.");
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="List is empty"
        description="Add scaled ingredients from a recipe to build your list."
        actionLabel="Go to generate"
        actionHref="/generate"
      />
    );
  }

  const toBuy = items.filter((item) => !item.is_checked);
  const haveIt = items.filter((item) => item.is_checked);

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-[4.25rem] z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--background)]/95 px-4 py-3 backdrop-blur-sm sm:mx-0 sm:border sm:border-[var(--color-border)] sm:bg-[var(--color-surface)] sm:px-4">
        <p className="text-sm text-[var(--color-ink-muted)]">
          {items.length} item{items.length === 1 ? "" : "s"}
        </p>
        <div className="flex items-center gap-2">
          <ExportListButton items={items} />
          <ClearListButton onCleared={() => setItems([])} />
        </div>
      </div>

      {error ? (
        <p className="text-sm text-[var(--color-danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
          To buy
        </h2>
        {toBuy.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">Nothing left to buy.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {toBuy.map((item) => (
              <ShoppingListItem
                key={item.id}
                item={item}
                onToggle={(checked) => toggleItem(item.id, checked)}
                onDelete={() => deleteItem(item.id)}
              />
            ))}
          </ul>
        )}
      </section>

      {haveIt.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            Already have
          </h2>
          <ul className="flex flex-col gap-2">
            {haveIt.map((item) => (
              <ShoppingListItem
                key={item.id}
                item={item}
                onToggle={(checked) => toggleItem(item.id, checked)}
                onDelete={() => deleteItem(item.id)}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
