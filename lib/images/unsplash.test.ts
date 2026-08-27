import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchRecipeImage } from "@/lib/images/unsplash";

const originalKey = process.env.UNSPLASH_ACCESS_KEY;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (originalKey === undefined) delete process.env.UNSPLASH_ACCESS_KEY;
  else process.env.UNSPLASH_ACCESS_KEY = originalKey;
});

describe("fetchRecipeImage (UNIT-13–19, EDGE-11)", () => {
  it("UNIT-13: missing key returns null without fetch", async () => {
    delete process.env.UNSPLASH_ACCESS_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchRecipeImage("pancakes")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("UNIT-14: blank query returns null without fetch", async () => {
    process.env.UNSPLASH_ACCESS_KEY = "test-key";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchRecipeImage("   ")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("UNIT-15: non-OK response returns null", async () => {
    process.env.UNSPLASH_ACCESS_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => "rate limited",
      }),
    );
    await expect(fetchRecipeImage("soup")).resolves.toBeNull();
  });

  it("UNIT-16: empty results return null", async () => {
    process.env.UNSPLASH_ACCESS_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ results: [] }),
      }),
    );
    await expect(fetchRecipeImage("obscure dish")).resolves.toBeNull();
  });

  it("UNIT-17: network error returns null", async () => {
    process.env.UNSPLASH_ACCESS_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    await expect(fetchRecipeImage("pasta")).resolves.toBeNull();
  });

  it("UNIT-18/19: maps fields and request shape", async () => {
    process.env.UNSPLASH_ACCESS_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            urls: { small: "https://images.unsplash.com/small.jpg" },
            description: "a plated dish",
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const longQuery = `  ${"pancakes ".repeat(20)}  `;
    const image = await fetchRecipeImage(longQuery);
    expect(image).toEqual({
      url: "https://images.unsplash.com/small.jpg",
      alt: "a plated dish",
      creditName: "Unsplash",
      creditUrl: "https://unsplash.com",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [calledUrl, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(String(calledUrl)).toContain("api.unsplash.com/search/photos");
    expect(calledUrl.searchParams.get("per_page")).toBe("1");
    expect(calledUrl.searchParams.get("orientation")).toBe("landscape");
    expect(calledUrl.searchParams.get("content_filter")).toBe("high");
    expect(calledUrl.searchParams.get("query")!.length).toBeLessThanOrEqual(120);
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Client-ID test-key",
    );
  });

  it("EDGE-11: prefers image_query string passed by caller", async () => {
    process.env.UNSPLASH_ACCESS_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            urls: { regular: "https://images.unsplash.com/r.jpg" },
            alt_description: "query photo",
            user: {
              name: "Ada",
              links: { html: "https://unsplash.com/@ada" },
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const image = await fetchRecipeImage("fluffy buttermilk pancakes syrup");
    expect(image?.url).toContain("images.unsplash.com");
    const calledUrl = fetchMock.mock.calls[0][0] as URL;
    expect(calledUrl.searchParams.get("query")).toBe(
      "fluffy buttermilk pancakes syrup",
    );
  });
});
