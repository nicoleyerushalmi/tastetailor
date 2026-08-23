"use client";

import { Minus, Plus } from "lucide-react";
import { MAX_SERVINGS, MIN_SERVINGS } from "@/lib/constants";

type ServingScalerProps = {
  servingsBase: number;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
};

export function ServingScaler({
  servingsBase,
  value,
  onChange,
  min = MIN_SERVINGS,
  max = MAX_SERVINGS,
}: ServingScalerProps) {
  function clamp(n: number) {
    return Math.min(max, Math.max(min, n));
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-medium text-[var(--color-ink)]">Servings</span>
      <div className="inline-flex items-center gap-1 border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
        <button
          type="button"
          aria-label="Decrease servings"
          className="flex h-9 w-9 items-center justify-center text-[var(--color-ink)] hover:bg-white disabled:opacity-40"
          disabled={value <= min}
          onClick={() => onChange(clamp(value - 1))}
        >
          <Minus className="h-4 w-4" strokeWidth={2} />
        </button>
        <span className="min-w-8 text-center text-sm font-semibold text-[var(--color-ink)]">
          {value}
        </span>
        <button
          type="button"
          aria-label="Increase servings"
          className="flex h-9 w-9 items-center justify-center text-[var(--color-ink)] hover:bg-white disabled:opacity-40"
          disabled={value >= max}
          onClick={() => onChange(clamp(value + 1))}
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
      {value !== servingsBase ? (
        <button
          type="button"
          className="text-xs font-medium text-[var(--color-accent)] hover:underline"
          onClick={() => onChange(servingsBase)}
        >
          Reset to {servingsBase}
        </button>
      ) : null}
    </div>
  );
}
