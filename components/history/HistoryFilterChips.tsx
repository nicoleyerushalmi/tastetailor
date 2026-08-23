import Link from "next/link";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "adapt", label: "Adapted" },
  { id: "scratch", label: "From scratch" },
  { id: "favorites", label: "Favorites" },
] as const;

export type HistoryFilter = (typeof FILTERS)[number]["id"];

type HistoryFilterChipsProps = {
  active: HistoryFilter;
};

export function HistoryFilterChips({ active }: HistoryFilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter recipes">
      {FILTERS.map((filter) => {
        const selected = filter.id === active;
        const href =
          filter.id === "all" ? "/history" : `/history?filter=${filter.id}`;
        return (
          <Link
            key={filter.id}
            href={href}
            role="tab"
            aria-selected={selected}
            className={`rounded-[var(--radius-control)] border px-3 py-1.5 text-sm font-medium transition ${
              selected
                ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:border-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            }`}
          >
            {filter.label}
          </Link>
        );
      })}
    </div>
  );
}

export function parseHistoryFilter(value: string | undefined): HistoryFilter {
  if (
    value === "adapt" ||
    value === "scratch" ||
    value === "favorites"
  ) {
    return value;
  }
  return "all";
}
