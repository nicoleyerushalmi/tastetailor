import type { TextareaHTMLAttributes } from "react";

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
};

export function TextArea({
  label,
  error,
  id,
  className = "",
  ...props
}: TextAreaProps) {
  const fieldId = id ?? props.name;

  return (
    <label className="flex flex-col gap-1.5 text-sm" htmlFor={fieldId}>
      <span className="font-medium text-[var(--color-ink)]">{label}</span>
      <textarea
        id={fieldId}
        className={`min-h-28 rounded-md border bg-white px-3 py-2 text-[var(--color-ink)] outline-none transition placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 ${
          error ? "border-red-500" : "border-[var(--color-border)]"
        } ${className}`}
        {...props}
      />
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  );
}
