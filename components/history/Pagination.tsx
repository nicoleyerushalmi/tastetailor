import Link from "next/link";

type PaginationProps = {
  basePath: string;
  page: number;
  hasNext: boolean;
  query?: Record<string, string | undefined>;
};

function hrefFor(basePath: string, page: number, query?: PaginationProps["query"]) {
  const params = new URLSearchParams();
  if (page > 0) params.set("page", String(page));
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value && value !== "all") params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function Pagination({
  basePath,
  page,
  hasNext,
  query,
}: PaginationProps) {
  const hasPrev = page > 0;

  if (!hasPrev && !hasNext) return null;

  return (
    <div className="mt-6 flex items-center justify-between">
      {hasPrev ? (
        <Link
          href={hrefFor(basePath, page - 1, query)}
          className="text-sm font-medium text-[var(--color-accent)] hover:underline"
        >
          ← Previous
        </Link>
      ) : (
        <span />
      )}
      {hasNext ? (
        <Link
          href={hrefFor(basePath, page + 1, query)}
          className="text-sm font-medium text-[var(--color-accent)] hover:underline"
        >
          Next →
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
