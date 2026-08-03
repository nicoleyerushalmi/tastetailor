"use client";

import type { ReactNode } from "react";

type TabItem = {
  id: string;
  label: string;
};

type TabsProps = {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  children: ReactNode;
};

export function Tabs({ items, value, onChange, children }: TabsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1"
        role="tablist"
      >
        {items.map((item) => {
          const selected = item.id === value;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(item.id)}
              className={`flex-1 rounded px-3 py-2 text-sm font-medium transition ${
                selected
                  ? "bg-white text-[var(--color-ink)] shadow-sm"
                  : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel">{children}</div>
    </div>
  );
}
