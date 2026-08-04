"use client";

import { useState } from "react";
import { formatQuantity } from "@/lib/format";
import type { ShoppingListItemRow } from "@/types/recipe";

type ShoppingListItemProps = {
  item: ShoppingListItemRow;
  onToggle: (checked: boolean) => Promise<void>;
  onDelete: () => Promise<void>;
};

export function ShoppingListItem({ item, onToggle, onDelete }: ShoppingListItemProps) {
  const [pending, setPending] = useState(false);

  async function handleToggle() {
    setPending(true);
    await onToggle(!item.is_checked);
    setPending(false);
  }

  async function handleDelete() {
    setPending(true);
    await onDelete();
    setPending(false);
  }

  return (
    <li className="flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <input
        type="checkbox"
        checked={item.is_checked}
        onChange={handleToggle}
        disabled={pending}
        className="h-4 w-4 accent-[var(--color-accent)]"
        aria-label={`Mark ${item.display_name} as ${item.is_checked ? "not bought" : "bought"}`}
      />
      <span
        className={`flex-1 text-sm ${
          item.is_checked
            ? "text-[var(--color-ink-muted)] line-through"
            : "text-[var(--color-ink)]"
        }`}
      >
        {formatQuantity(item.quantity)} {item.unit} {item.display_name}
      </span>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        aria-label={`Remove ${item.display_name}`}
        className="text-sm font-medium text-red-700 hover:text-red-800 disabled:opacity-50"
      >
        Remove
      </button>
    </li>
  );
}
