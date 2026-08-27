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
  });

  it("UNIT-10: retries 503 then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, { error: { message: "busy" } }))
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

    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(3);
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
});
