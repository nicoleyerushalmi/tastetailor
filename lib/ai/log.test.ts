import { describe, expect, it } from "vitest";
import { truncateUpstreamBody } from "@/lib/ai/log";

describe("truncateUpstreamBody", () => {
  it("keeps quota metric lines readable", () => {
    const body = JSON.stringify({
      error: {
        code: 429,
        message:
          "You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. * Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_requests, limit: 10, model: gemini-2.5-flash",
      },
    });
    const clipped = truncateUpstreamBody(body);
    expect(clipped).toMatch(/Quota exceeded for metric:/i);
    expect(clipped.length).toBeLessThanOrEqual(400);
  });

  it("truncates long bodies without a metric", () => {
    const body = "x".repeat(500);
    expect(truncateUpstreamBody(body).endsWith("…")).toBe(true);
  });
});
