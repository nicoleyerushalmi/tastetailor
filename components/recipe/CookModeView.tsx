"use client";

import { useEffect, useState } from "react";
import { Printer, X } from "lucide-react";
import { formatQuantity } from "@/lib/format";
import { scaleIngredients } from "@/lib/shopping/scale";
import type { Ingredient } from "@/types/recipe";

type CookModeViewProps = {
  title: string;
  servings: number;
  ingredients: Ingredient[];
  servingsBase: number;
  steps: string[];
  onClose: () => void;
};

export function CookModeView({
  title,
  servings,
  ingredients,
  servingsBase,
  steps,
  onClose,
}: CookModeViewProps) {
  const scaled = scaleIngredients(ingredients, servingsBase, servings);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [doneSteps, setDoneSteps] = useState<Record<number, boolean>>({});

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function toggleIngredient(index: number) {
    setChecked((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  function toggleStep(index: number) {
    setDoneSteps((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  return (
    <div
      className="cook-mode fixed inset-0 z-[55] overflow-y-auto bg-[var(--background)]"
      role="dialog"
      aria-modal="true"
      aria-label="Cook mode"
    >
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 py-3 backdrop-blur-md print:static print:border-0">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
            Cook mode · {servings} servings
          </p>
          <h1 className="font-display text-xl font-bold text-[var(--color-ink)] sm:text-2xl">
            {title}
          </h1>
        </div>
        <div className="no-print flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-ink)] hover:border-[var(--color-ink)]"
          >
            <Printer className="h-4 w-4" strokeWidth={2} />
            Print
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-ink)] px-3 text-sm font-medium text-white hover:bg-[var(--color-ink)]/90"
          >
            <X className="h-4 w-4" strokeWidth={2} />
            Exit
          </button>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
        <section>
          <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)]">
            Ingredients
          </h2>
          <ul className="mt-4 divide-y divide-[var(--color-border)] border border-[var(--color-border)] bg-[var(--color-surface)]">
            {scaled.map((item, index) => (
              <li key={`${item.name}-${index}`}>
                <label className="flex cursor-pointer items-start gap-3 px-4 py-3.5 text-[var(--color-ink)]">
                  <input
                    type="checkbox"
                    checked={Boolean(checked[index])}
                    onChange={() => toggleIngredient(index)}
                    className="mt-1 h-4 w-4 accent-[var(--color-accent)] no-print"
                  />
                  <span
                    className={`text-base leading-relaxed ${
                      checked[index]
                        ? "text-[var(--color-ink-muted)] line-through"
                        : ""
                    }`}
                  >
                    {formatQuantity(item.quantity)}
                    {item.unit ? ` ${item.unit}` : ""} {item.name}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)]">
            Steps
          </h2>
          <ol className="mt-4 flex flex-col gap-6">
            {steps.map((step, index) => (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => toggleStep(index)}
                  className="flex w-full gap-4 text-left print:pointer-events-none"
                >
                  <span
                    className={`font-display text-lg font-bold ${
                      doneSteps[index]
                        ? "text-[var(--color-ink-muted)]"
                        : "text-[var(--color-accent)]"
                    }`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p
                    className={`text-lg leading-relaxed ${
                      doneSteps[index]
                        ? "text-[var(--color-ink-muted)] line-through"
                        : "text-[var(--color-ink)]"
                    }`}
                  >
                    {step}
                  </p>
                </button>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
