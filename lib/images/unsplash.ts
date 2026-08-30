import { aiLog, truncateUpstreamBody } from "@/lib/ai/log";

export type RecipeImage = {
  url: string;
  alt: string;
  creditName: string;
  creditUrl: string;
};

/**
 * Search Unsplash for a landscape food photo. Returns null when the key is
 * missing, the request fails/times out, or there are no results — callers
 * should fall back to ambient assets.
 */
export async function fetchRecipeImage(
  query: string,
): Promise<RecipeImage | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!accessKey) return null;

  const cleaned = query.replace(/\s+/g, " ").trim().slice(0, 120);
  if (!cleaned) return null;

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", cleaned);
  url.searchParams.set("per_page", "1");
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("content_filter", "high");

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        "Accept-Version": "v1",
      },
      signal: AbortSignal.timeout(2500),
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      aiLog.warn("unsplash", {
        phase: "search_failed",
        httpStatus: response.status,
        body: truncateUpstreamBody(body, 200),
      });
      return null;
    }

    const payload = (await response.json()) as {
      results?: Array<{
        alt_description?: string | null;
        description?: string | null;
        urls?: { regular?: string; small?: string };
        user?: {
          name?: string;
          links?: { html?: string };
        };
        links?: { html?: string };
      }>;
    };

    const photo = payload.results?.[0];
    const imageUrl = photo?.urls?.regular ?? photo?.urls?.small;
    if (!photo || !imageUrl) return null;

    const creditName = photo.user?.name?.trim() || "Unsplash";
    const creditUrl =
      photo.user?.links?.html?.trim() ||
      photo.links?.html?.trim() ||
      "https://unsplash.com";

    return {
      url: imageUrl,
      alt:
        photo.alt_description?.trim() ||
        photo.description?.trim() ||
        cleaned,
      creditName,
      creditUrl,
    };
  } catch (error) {
    aiLog.warn("unsplash", {
      phase: "search_error",
      error:
        error instanceof Error
          ? truncateUpstreamBody(error.message, 200)
          : "unknown",
    });
    return null;
  }
}
