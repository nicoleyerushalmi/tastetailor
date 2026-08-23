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
    <div className="flex flex-col gap-5">
      <div
        className="flex gap-0 border-b border-[var(--color-border)]"
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
              className={`relative -mb-px flex-1 px-3 py-2.5 text-sm font-medium transition ${
                selected
                  ? "border-b-2 border-[var(--color-ink)] text-[var(--color-ink)]"
                  : "border-b-2 border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
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
