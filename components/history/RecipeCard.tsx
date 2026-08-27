import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { safeRecipeImageSrc } from "@/lib/images/safeRecipeImage";
import type { RecipeSummary } from "@/types/recipe";

type RecipeCardProps = RecipeSummary & {
  imagePosition?: string;
};

export function RecipeCard({
  id,
  title,
  created_at,
  is_favorite,
  mode,
  image_url,
  image_alt,
  imagePosition = "center",
}: RecipeCardProps) {
  const date = new Date(created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const src = safeRecipeImageSrc(image_url);
  const alt = image_alt?.trim() || "";
  const usingRemote = src.startsWith("http");

  return (
    <Link
      href={`/recipes/${id}`}
      className="group flex flex-col overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] transition hover:-translate-y-0.5 hover:border-[var(--color-ink)] hover:shadow-[var(--shadow-soft)]"
    >
      <div className="relative h-36 w-full overflow-hidden">
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
          style={usingRemote ? undefined : { objectPosition: imagePosition }}
          sizes="(max-width: 640px) 100vw, 33vw"
        />
        <div className="absolute inset-0 bg-[var(--color-ink)]/15" />
        {is_favorite ? (
          <span className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center bg-[var(--color-surface)]/95 text-[var(--color-accent)]">
            <Heart
              aria-label="Favorite"
              className="h-3.5 w-3.5"
              strokeWidth={2}
              fill="currentColor"
            />
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 px-4 py-4">
        <h3 className="line-clamp-2 font-display text-lg font-semibold text-[var(--color-ink)]">
          {title}
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-ink-muted)]">
          <span>{date}</span>
          <span aria-hidden="true">·</span>
          <span className="border border-[var(--color-border)] px-1.5 py-0.5">
            {mode === "adapt" ? "Adapted" : "From scratch"}
          </span>
        </div>
      </div>
    </Link>
  );
}
