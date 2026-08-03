"use client";

import { useEffect } from "react";

type ToastProps = {
  message: string | null;
  onDismiss: () => void;
  tone?: "info" | "error" | "success";
};

const toneClass: Record<NonNullable<ToastProps["tone"]>, string> = {
  info: "border-[var(--color-border)] bg-white text-[var(--color-ink)]",
  error: "border-red-200 bg-red-50 text-red-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

export function Toast({ message, onDismiss, tone = "info" }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, 4000);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-md border px-4 py-3 text-sm shadow-sm ${toneClass[tone]}`}
      role="status"
    >
      {message}
    </div>
  );
}
