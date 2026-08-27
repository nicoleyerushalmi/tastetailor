import { describe, expect, it } from "vitest";
import { isHttpUrl } from "@/lib/security/isHttpUrl";
import nextConfig from "@/next.config";

describe("isHttpUrl (SEC-01)", () => {
  it("accepts only http(s)", () => {
    expect(isHttpUrl("https://example.com/r")).toBe(true);
    expect(isHttpUrl("http://example.com/r")).toBe(true);
  });

  it("rejects javascript/data/file and malformed values", () => {
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("data:text/html,hi")).toBe(false);
    expect(isHttpUrl("file:///etc/passwd")).toBe(false);
    expect(isHttpUrl("not a url")).toBe(false);
    expect(isHttpUrl(undefined)).toBe(false);
  });
});

describe("image remotePatterns (SEC-09)", () => {
  it("allows only images.unsplash.com", () => {
    const patterns = nextConfig.images?.remotePatterns ?? [];
    expect(patterns).toHaveLength(1);
    expect(patterns[0]).toMatchObject({
      protocol: "https",
      hostname: "images.unsplash.com",
    });
  });
});
