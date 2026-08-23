"use client";

import { KNOWN_CREATORS } from "@/lib/persona-known-creators";
import { PERSONA_SHORTCUTS } from "@/lib/persona-shortcuts";
import { TextField } from "@/components/ui/TextField";

type PersonaFieldProps = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

export function PersonaField({ value, onChange, error }: PersonaFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <TextField
        label="Creator or style (optional)"
        name="persona_query"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        error={error}
        placeholder="e.g. Ottolenghi, Binging with Babish, weeknight quick"
        maxLength={120}
        list="known-creators-list"
      />
      <datalist id="known-creators-list">
        {KNOWN_CREATORS.map((creator) => (
          <option key={creator.name} value={creator.name} />
        ))}
      </datalist>
      <div className="flex flex-wrap gap-2">
        {PERSONA_SHORTCUTS.map((shortcut) => {
          const selected = value === shortcut;
          return (
            <button
              key={shortcut}
              type="button"
              onClick={() => onChange(shortcut)}
              className={`rounded-[var(--radius-control)] border px-2.5 py-1 text-xs transition ${
                selected
                  ? "border-[var(--color-ink)] bg-[var(--color-surface)] text-[var(--color-ink)]"
                  : "border-[var(--color-border)] bg-transparent text-[var(--color-ink-muted)] hover:border-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              {shortcut}
            </button>
          );
        })}
      </div>
    </div>
  );
}
