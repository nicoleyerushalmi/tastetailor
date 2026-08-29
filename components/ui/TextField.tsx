import type { InputHTMLAttributes } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function TextField({
  label,
  error,
  id,
  className = "",
  ...props
}: TextFieldProps) {
  const fieldId = id ?? props.name;

  return (
    <label className="flex flex-col gap-1.5 text-sm" htmlFor={fieldId}>
      <span className="font-medium text-[var(--color-ink)]">{label}</span>
      <input
        id={fieldId}
        className={`h-11 rounded-[var(--radius-input)] border bg-[var(--color-input-bg)] px-3 text-[var(--color-ink)] shadow-[var(--shadow-input)] outline-none transition placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/25 ${
          error ? "border-[var(--color-danger)]" : "border-[var(--color-input-border)]"
        } ${className}`}
        {...props}
      />
      {error ? (
        <span className="text-xs text-[var(--color-danger)]">{error}</span>
      ) : null}
    </label>
  );
}
