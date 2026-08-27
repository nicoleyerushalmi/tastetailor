import { describe, expect, it } from "vitest";
import { MAX_CHAT_LOG_ENTRIES, MAX_CHAT_LOG_PROMPT_ENTRIES } from "@/lib/constants";
import { appendChatLog, chatLogForPrompt } from "@/lib/recipes/chat-log";
import type { ChatLogEntry } from "@/types/recipe";

describe("chat-log (UNIT-07–09, DB-06)", () => {
  it("UNIT-07: appends a user/assistant pair with ISO timestamps", () => {
    const next = appendChatLog([], "make it spicy", "Increased the heat.");
    expect(next).toHaveLength(2);
    expect(next[0]).toMatchObject({ role: "user", message: "make it spicy" });
    expect(next[1]).toMatchObject({
      role: "assistant",
      message: "Increased the heat.",
    });
    expect(() => new Date(next[0].created_at).toISOString()).not.toThrow();
  });

  it("UNIT-08: trims to MAX_CHAT_LOG_ENTRIES keeping newest", () => {
    let log: ChatLogEntry[] = [];
    for (let i = 0; i < MAX_CHAT_LOG_ENTRIES / 2 + 2; i++) {
      log = appendChatLog(log, `u${i}`, `a${i}`);
    }
    expect(log.length).toBe(MAX_CHAT_LOG_ENTRIES);
    expect(log[0].message).not.toBe("u0");
    expect(log.at(-1)?.message).toMatch(/^a\d+$/);
  });

  it("UNIT-09: chatLogForPrompt keeps at most MAX_CHAT_LOG_PROMPT_ENTRIES", () => {
    const log: ChatLogEntry[] = Array.from({ length: 30 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      message: `m${i}`,
      created_at: new Date().toISOString(),
    }));
    const window = chatLogForPrompt(log);
    expect(window.length).toBe(MAX_CHAT_LOG_PROMPT_ENTRIES);
    expect(window.at(-1)?.message).toBe("m29");
  });
});
