"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { formatShoppingListForExport } from "@/lib/shopping/exportText";
import type { ShoppingListItemRow } from "@/types/recipe";

type ExportListButtonProps = {
  items: ShoppingListItemRow[];
};

export function ExportListButton({ items }: ExportListButtonProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"success" | "error">("success");

  async function onExport() {
    const text = formatShoppingListForExport(items);
    try {
      await navigator.clipboard.writeText(text);
      setToastTone("success");
      setToast("Copied to clipboard.");
    } catch {
      setToastTone("error");
      setToast("Could not copy the list. Please try again.");
    }
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={onExport}>
        Export
      </Button>
      <Toast message={toast} tone={toastTone} onDismiss={() => setToast(null)} />
    </>
  );
}
