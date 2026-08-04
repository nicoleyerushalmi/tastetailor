"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

type ClearListButtonProps = {
  onCleared: () => void;
};

export function ClearListButton({ onCleared }: ClearListButtonProps) {
  const [loading, setLoading] = useState(false);

  async function onClear() {
    const ok = window.confirm("Clear your entire shopping list? This cannot be undone.");
    if (!ok) return;

    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("shopping_list_items")
      .delete()
      .eq("user_id", user.id);

    setLoading(false);
    if (!error) {
      onCleared();
    }
  }

  return (
    <Button type="button" variant="ghost" loading={loading} onClick={onClear}>
      Clear all
    </Button>
  );
}
