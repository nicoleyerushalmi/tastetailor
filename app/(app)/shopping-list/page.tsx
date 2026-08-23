import { PageHeader } from "@/components/layout/PageHeader";
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
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 lg:py-12">
      <PageHeader
        eyebrow="Shop"
        title="Shopping list"
        lede="Merged ingredients from the recipes you add — check off as you go."
      />
      <ShoppingListClient initialItems={items} />
    </main>
  );
}
