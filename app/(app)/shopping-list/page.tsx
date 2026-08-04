import { ShoppingListClient } from "@/components/shopping/ShoppingListClient";
import { createClient } from "@/lib/supabase/server";
import type { ShoppingListItemRow } from "@/types/recipe";

export default async function ShoppingListPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shopping_list_items")
    .select("*")
    .order("is_checked", { ascending: true })
    .order("display_name", { ascending: true });

  const items = (data ?? []) as ShoppingListItemRow[];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 sm:px-6">
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-3xl text-[var(--color-ink)]">
        Shopping list
      </h1>
      <ShoppingListClient initialItems={items} />
    </main>
  );
}
