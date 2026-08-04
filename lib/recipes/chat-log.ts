import { MAX_CHAT_LOG_ENTRIES, MAX_CHAT_LOG_PROMPT_ENTRIES } from "@/lib/constants";
import type { ChatLogEntry } from "@/types/recipe";

export function appendChatLog(
  existing: ChatLogEntry[],
  userMessage: string,
  assistantMessage: string,
): ChatLogEntry[] {
  const now = new Date().toISOString();
  const entries: ChatLogEntry[] = [
    { role: "user", message: userMessage, created_at: now },
    { role: "assistant", message: assistantMessage, created_at: now },
  ];
  return [...existing, ...entries].slice(-MAX_CHAT_LOG_ENTRIES);
}

export function chatLogForPrompt(chatLog: ChatLogEntry[]): ChatLogEntry[] {
  return chatLog.slice(-MAX_CHAT_LOG_PROMPT_ENTRIES);
}
