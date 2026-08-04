import Link from "next/link";

type PaginationProps = {
  basePath: string;
  page: number;
  hasNext: boolean;
};

export function Pagination({ basePath, page, hasNext }: PaginationProps) {
  const hasPrev = page > 0;

  if (!hasPrev && !hasNext) return null;

  return (
    <div className="mt-6 flex items-center justify-between">
      {hasPrev ? (
        <Link
          href={`${basePath}?page=${page - 1}`}
          className="text-sm font-medium text-[var(--color-accent)] hover:underline"
        >
          ← Previous
        </Link>
      ) : (
        <span />
      )}
      {hasNext ? (
        <Link
          href={`${basePath}?page=${page + 1}`}
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
