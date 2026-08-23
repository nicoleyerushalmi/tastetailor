"use client";

import { useEffect } from "react";

type ToastProps = {
  message: string | null;
  onDismiss: () => void;
  tone?: "info" | "error" | "success";
};

const toneClass: Record<NonNullable<ToastProps["tone"]>, string> = {
  info: "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)]",
  error:
    "border-[var(--color-danger)]/30 bg-[#fdf2f1] text-[var(--color-danger)]",
  success: "border-[#86a88a]/40 bg-[#eef5ef] text-[#1f3d24]",
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
      className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-[var(--radius-control)] border px-4 py-3 text-sm shadow-[var(--shadow-soft)] ${toneClass[tone]}`}
      role="status"
    >
      {message}
    </div>
  );
}
