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
        className={`h-11 rounded-md border bg-white px-3 text-[var(--color-ink)] outline-none transition placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 ${
          error ? "border-red-500" : "border-[var(--color-border)]"
        } ${className}`}
        {...props}
      />
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  );
}
