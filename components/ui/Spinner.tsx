export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-3 text-sm text-[var(--color-ink-muted)]"
      role="status"
      aria-live="polite"
    >
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
      <span>{label}</span>
    </div>
  );
}
