const AMBIENT = "/images/recipe-ambient.jpg";

/** Only Unsplash (or local) URLs are safe for next/image remotePatterns. */
export function safeRecipeImageSrc(imageUrl: string | null | undefined): string {
  const trimmed = imageUrl?.trim();
  if (!trimmed) return AMBIENT;
  if (trimmed.startsWith("/")) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.protocol === "https:" && url.hostname === "images.unsplash.com") {
      return trimmed;
    }
  } catch {
    // fall through
  }
  return AMBIENT;
}
