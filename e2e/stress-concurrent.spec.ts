import { test, expect } from "playwright/test";
import {
  generationsPerDayFromEnv,
  resetGenerationBudget,
  setGenerationBudget,
} from "./helpers";
import { AUTH_FILE_A, loadEnvLocal } from "./env";

loadEnvLocal();

/**
 * STRESS-03 — two concurrent generates near the daily cap (two "tabs").
 * Leaves one slot, races two POSTs; expect clean 201/429 only (no 500s).
 */
test.describe("concurrent generate (STRESS-03)", () => {
  test.afterEach(async () => {
    await resetGenerationBudget(AUTH_FILE_A);
  });

  test("two parallel generates near the cap finish cleanly", async ({
    request,
  }) => {
    test.setTimeout(180_000);

    const max = generationsPerDayFromEnv();
    await setGenerationBudget(Math.max(0, max - 1), AUTH_FILE_A);

    const stamp = Date.now();
    const [resA, resB] = await Promise.all([
      request.post("/api/generate", {
        data: { mode: "scratch", dish_name: `stress03-a ${stamp}` },
        timeout: 120_000,
      }),
      request.post("/api/generate", {
        data: { mode: "scratch", dish_name: `stress03-b ${stamp}` },
        timeout: 120_000,
      }),
    ]);

    const bodyA = await resA.json().catch(() => ({}));
    const bodyB = await resB.json().catch(() => ({}));
    const statuses = [resA.status(), resB.status()];

    for (const status of statuses) {
      expect(
        [201, 429].includes(status),
        `unexpected status ${status}; bodies=${JSON.stringify({ bodyA, bodyB })}`,
      ).toBe(true);
    }

    const successes = [
      { status: resA.status(), body: bodyA },
      { status: resB.status(), body: bodyB },
    ].filter((row) => row.status === 201);

    // One slot left → at most one create; the other should be rate-limited.
    expect(successes.length).toBeLessThanOrEqual(1);
    expect(statuses.filter((s) => s === 429).length).toBeGreaterThanOrEqual(
      successes.length === 1 ? 1 : 0,
    );

    for (const row of successes) {
      expect(row.body.recipe?.id).toBeTruthy();
      expect(row.body.recipe?.title).toBeTruthy();
      expect(row.body.recipe?.ingredients?.length).toBeGreaterThan(0);
    }

    for (const row of [
      { status: resA.status(), body: bodyA },
      { status: resB.status(), body: bodyB },
    ].filter((r) => r.status === 429)) {
      expect(row.body.error).toBe("rate_limited");
    }
  });
});
