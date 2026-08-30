import { AsyncLocalStorage } from "node:async_hooks";

export type AiRequestContext = {
  geminiCalls: number;
  slotRefunded: boolean;
};

const storage = new AsyncLocalStorage<AiRequestContext>();

export function aiDebugEnabled(): boolean {
  const raw = process.env.AI_DEBUG?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

/** Keep quota metric lines readable; never dump huge bodies. */
export function truncateUpstreamBody(body: string, max = 400): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (!flat) return "";

  const metric = flat.match(
    /Quota exceeded for metric:[^.]*?(?=\s\*|,\s*limit:|$)/i,
  );
  if (metric) {
    const limit = flat.match(/limit:\s*[\d.]+/i);
    const model = flat.match(/model:\s*[\w.-]+/i);
    const parts = [metric[0], limit?.[0], model?.[0]].filter(Boolean);
    const joined = parts.join(" ");
    if (joined.length <= max) return joined;
  }

  return flat.length <= max ? flat : `${flat.slice(0, max)}…`;
}

function formatFields(fields: Record<string, unknown>): string {
  return Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => {
      if (typeof value === "string") return `${key}=${JSON.stringify(value)}`;
      if (typeof value === "boolean" || typeof value === "number") {
        return `${key}=${value}`;
      }
      if (value === null) return `${key}=null`;
      try {
        return `${key}=${JSON.stringify(value)}`;
      } catch {
        return `${key}=[unserializable]`;
      }
    })
    .join(" ");
}

export const aiLog = {
  info(scope: string, fields: Record<string, unknown>) {
    console.info(`[${scope}] ${formatFields(fields)}`);
  },
  debug(scope: string, fields: Record<string, unknown>) {
    if (!aiDebugEnabled()) return;
    console.info(`[${scope}] ${formatFields(fields)}`);
  },
  warn(scope: string, fields: Record<string, unknown>) {
    console.warn(`[${scope}] ${formatFields(fields)}`);
  },
  error(scope: string, fields: Record<string, unknown>) {
    console.error(`[${scope}] ${formatFields(fields)}`);
  },
};

export function runWithAiRequestContext<T>(fn: () => Promise<T>): Promise<T> {
  return storage.run({ geminiCalls: 0, slotRefunded: false }, fn);
}

export function getAiRequestContext(): AiRequestContext | undefined {
  return storage.getStore();
}

export function bumpGeminiHttpCall() {
  const ctx = storage.getStore();
  if (ctx) ctx.geminiCalls += 1;
}

export function markSlotRefunded() {
  const ctx = storage.getStore();
  if (ctx) ctx.slotRefunded = true;
}
