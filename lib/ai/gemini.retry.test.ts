import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UpstreamError } from "@/lib/ai/provider";

const validGeminiBody = {
  candidates: [
    {
      finishReason: "STOP",
      content: {
        parts: [
          {
            text: JSON.stringify({
              title: "Retry Bowl",
              servings_base: 4,
              ingredients: [{ name: "rice", quantity: 1, unit: "cup" }],
              steps: ["Cook."],
              insights: { summary: "ok", substitutions: [] },
              persona_applied: false,
              refused: false,
            }),
          },
        ],
      },
    },
  ],
};

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () =>
      typeof body === "string" ? body : JSON.stringify(body),
  };
}

describe("Gemini transient retry (UNIT-10–12)", () => {
  const originalKey = process.env.GEMINI_API_KEY;
  const originalModel = process.env.GEMINI_MODEL;
  const originalFallbackModel = process.env.GEMINI_FALLBACK_MODEL;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = originalModel;
    if (originalFallbackModel === undefined) {
      delete process.env.GEMINI_FALLBACK_MODEL;
    } else {
      process.env.GEMINI_FALLBACK_MODEL = originalFallbackModel;
    }
  });

  it("UNIT-10: retries 503 then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, { error: { message: "busy" } }))
      .mockResolvedValue(jsonResponse(200, validGeminiBody));
    vi.stubGlobal("fetch", fetchMock);

    const { createGeminiProvider } = await import("@/lib/ai/gemini");
    const provider = createGeminiProvider();
    const promise = provider.generate({
      systemPrompt: "sys",
      userPrompt: "MODE: scratch\ndish_name: soup",
    });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(result).toMatchObject({ title: "Retry Bowl", refused: false });
  });

  it("UNIT-11: does not retry hard 400 inside callGemini", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(400, { error: { message: "bad request" } }));
    vi.stubGlobal("fetch", fetchMock);

    const { createGeminiProvider } = await import("@/lib/ai/gemini");
    const provider = createGeminiProvider();
    let caught: unknown;
    const promise = provider
      .generate({
        systemPrompt: "sys",
        userPrompt: "MODE: scratch\ndish_name: soup",
      })
      .catch((error) => {
        caught = error;
      });
    await vi.runAllTimersAsync();
    await promise;

    expect(caught).toBeInstanceOf(UpstreamError);
    // Outer search loop may call callGemini twice; each returns immediately on 400.
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(2);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("UNIT-12: exhausted 503 raises UpstreamError with status 503", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(503, { error: { message: "busy" } }));
    vi.stubGlobal("fetch", fetchMock);

    const { createGeminiProvider } = await import("@/lib/ai/gemini");
    const provider = createGeminiProvider();
    let caught: unknown;
    const promise = provider
      .generate({
        systemPrompt: "sys",
        userPrompt: "MODE: scratch\ndish_name: soup",
      })
      .catch((error) => {
        caught = error;
      });
    await vi.runAllTimersAsync();
    await promise;

    expect(caught).toBeInstanceOf(UpstreamError);
    expect((caught as UpstreamError).status).toBe(503);
  });

  it("fails over to a lighter combo after timeouts on the heavy combo", async () => {
    const timeout = Object.assign(new Error("The operation was aborted due to timeout"), {
      name: "TimeoutError",
    });
    const fetchMock = vi
      .fn()
      // Creator path starts with search=true + thinking=0 — time out twice.
      .mockRejectedValueOnce(timeout)
      .mockRejectedValueOnce(timeout)
      // Next combo (search=true, deep thinking) succeeds.
      .mockResolvedValue(jsonResponse(200, validGeminiBody));
    vi.stubGlobal("fetch", fetchMock);

    const { createGeminiProvider } = await import("@/lib/ai/gemini");
    const provider = createGeminiProvider();
    const promise = provider.generate({
      systemPrompt: "sys",
      userPrompt:
        "MODE: scratch\npersona_query: Some Creator\ndish_name: soup",
    });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toMatchObject({ title: "Retry Bowl", refused: false });
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("falls back to GEMINI_FALLBACK_MODEL when the primary model is fully overloaded", async () => {
    process.env.GEMINI_MODEL = "primary-model";
    process.env.GEMINI_FALLBACK_MODEL = "fallback-model";
    const fetchMock = vi
      .fn()
      // Primary model: both combos, both callGemini attempts, all 503.
      .mockResolvedValueOnce(jsonResponse(503, { error: { message: "busy" } }))
      .mockResolvedValueOnce(jsonResponse(503, { error: { message: "busy" } }))
      .mockResolvedValueOnce(jsonResponse(503, { error: { message: "busy" } }))
      .mockResolvedValueOnce(jsonResponse(503, { error: { message: "busy" } }))
      // Fallback model succeeds on its first call.
      .mockResolvedValue(jsonResponse(200, validGeminiBody));
    vi.stubGlobal("fetch", fetchMock);

    const { createGeminiProvider } = await import("@/lib/ai/gemini");
    const provider = createGeminiProvider();
    const promise = provider.generate({
      systemPrompt: "sys",
      userPrompt: "MODE: scratch\ndish_name: soup",
    });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toMatchObject({ title: "Retry Bowl", refused: false });
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.some((url) => url.includes("primary-model"))).toBe(true);
    expect(urls.some((url) => url.includes("fallback-model"))).toBe(true);
  });

  it("does not fall back on a definitive error like a bad request (400)", async () => {
    process.env.GEMINI_MODEL = "primary-model";
    process.env.GEMINI_FALLBACK_MODEL = "fallback-model";
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(400, { error: { message: "bad request" } }));
    vi.stubGlobal("fetch", fetchMock);

    const { createGeminiProvider } = await import("@/lib/ai/gemini");
    const provider = createGeminiProvider();
    let caught: unknown;
    const promise = provider
      .generate({
        systemPrompt: "sys",
        userPrompt: "MODE: scratch\ndish_name: soup",
      })
      .catch((error) => {
        caught = error;
      });
    await vi.runAllTimersAsync();
    await promise;

    expect(caught).toBeInstanceOf(UpstreamError);
    expect((caught as UpstreamError).status).toBe(400);
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.every((url) => url.includes("primary-model"))).toBe(true);
    expect(urls.some((url) => url.includes("fallback-model"))).toBe(false);
  });

  it("does not fall back when GEMINI_FALLBACK_MODEL is unset", async () => {
    process.env.GEMINI_MODEL = "primary-model";
    delete process.env.GEMINI_FALLBACK_MODEL;
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(503, { error: { message: "busy" } }));
    vi.stubGlobal("fetch", fetchMock);

    const { createGeminiProvider } = await import("@/lib/ai/gemini");
    const provider = createGeminiProvider();
    let caught: unknown;
    const promise = provider
      .generate({
        systemPrompt: "sys",
        userPrompt: "MODE: scratch\ndish_name: soup",
      })
      .catch((error) => {
        caught = error;
      });
    await vi.runAllTimersAsync();
    await promise;

    expect(caught).toBeInstanceOf(UpstreamError);
    expect((caught as UpstreamError).status).toBe(503);
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.every((url) => url.includes("primary-model"))).toBe(true);
  });
});
