import { buildPersonaIntensifyPrompt } from "@/lib/ai/prompt";
import {
  aiLog,
  bumpGeminiHttpCall,
  getAiRequestContext,
  truncateUpstreamBody,
} from "@/lib/ai/log";
import {
  UpstreamError,
  type ProviderInput,
  type RecipeProvider,
} from "@/lib/ai/provider";

type GroundingChunk = {
  web?: { uri?: string; title?: string };
};

type ContentPart = {
  text?: string;
  thought?: boolean;
};

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1].trim());
    }
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Model response was not valid JSON");
  }
}

function groundingSources(chunks: GroundingChunk[] | undefined) {
  if (!chunks?.length) return [];
  const seen = new Set<string>();
  const sources: Array<{ label: string; url?: string; note?: string }> = [];
  for (const chunk of chunks) {
    const url = chunk.web?.uri?.trim();
    const label = chunk.web?.title?.trim() || url;
    if (!label) continue;
    const key = `${label}|${url ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({
      label,
      ...(url ? { url } : {}),
      note: "From web search",
    });
  }
  return sources;
}

function mergeSources(
  parsed: unknown,
  grounding: ReturnType<typeof groundingSources>,
) {
  if (!parsed || typeof parsed !== "object") return parsed;
  const record = parsed as Record<string, unknown>;
  const insights =
    record.insights && typeof record.insights === "object"
      ? (record.insights as Record<string, unknown>)
      : {};
  const existing = Array.isArray(insights.sources) ? insights.sources : [];
  const merged = [...existing];
  const seen = new Set(
    merged.map((item) => {
      if (!item || typeof item !== "object") return "";
      const row = item as { label?: string; url?: string };
      return `${row.label ?? ""}|${row.url ?? ""}`;
    }),
  );
  for (const source of grounding) {
    const key = `${source.label}|${source.url ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(source);
  }
  return {
    ...record,
    insights: {
      ...insights,
      sources: merged,
    },
  };
}

function extractText(parts: ContentPart[] | undefined) {
  if (!parts?.length) return "";
  return parts
    .filter((part) => !part.thought && typeof part.text === "string")
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}

/** Deeper reasoning for creator lookup or parsing a pasted recipe. */
const THINKING_BUDGET_DEEP = 1024;

function analyzePrompt(userPrompt: string) {
  const wantsCreator = /persona_query:\s*(?!null\b).+/i.test(userPrompt);
  const isAdapt = /MODE:\s*adapt/i.test(userPrompt);
  const needsDeepThinking = wantsCreator || isAdapt;
  return { wantsCreator, isAdapt, needsDeepThinking };
}

function extractPersonaQuery(userPrompt: string): string | null {
  const match = userPrompt.match(/persona_query:\s*(.+)/i);
  const value = match?.[1]?.trim();
  return value && value.toLowerCase() !== "null" ? value : null;
}

/** True when the model honestly reported it couldn't apply the requested persona. */
function looksPersonaUnknown(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== "object") return false;
  const record = parsed as Record<string, unknown>;
  return record.persona_applied === false && record.refused !== true;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientGeminiStatus(status: number) {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

function isAbortTimeout(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "TimeoutError" ||
    error.name === "AbortError" ||
    /aborted due to timeout/i.test(error.message) ||
    /the operation was aborted/i.test(error.message)
  );
}

async function callGemini(args: {
  apiKey: string;
  model: string;
  input: ProviderInput;
  useSearch: boolean;
  thinkingBudget: number;
}) {
  const { apiKey, model, input, useSearch, thinkingBudget } = args;
  const userText = input.repairOf
    ? `${input.userPrompt}\n\n${input.repairOf}`
    : input.userPrompt;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const { wantsCreator } = analyzePrompt(input.userPrompt);

  const body: Record<string, unknown> = {
    systemInstruction: {
      parts: [{ text: input.systemPrompt }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userText }],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: wantsCreator ? 0.35 : 0.7,
      // Leave headroom so thinking tokens cannot consume the whole output budget.
      maxOutputTokens: 8192,
      thinkingConfig: {
        thinkingBudget,
      },
    },
  };

  if (useSearch) {
    body.tools = [{ google_search: {} }];
  }

  // Brief retries on transient HTTP; avoid long hangs when the model is down.
  const maxAttempts = 2;
  const requestTimeoutMs =
    useSearch || thinkingBudget > 0 ? 30_000 : 15_000;
  let lastNetworkError: unknown;
  let timeoutAttempts = 0;
  let sawTransientHttp = false;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const started = Date.now();
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
      bumpGeminiHttpCall();
      aiLog.debug("gemini", {
        phase: "attempt",
        model,
        search: useSearch,
        thinkingBudget,
        httpStatus: response.status,
        attempt: attempt + 1,
        ms: Date.now() - started,
        repair: Boolean(input.repairOf),
      });

      if (isTransientGeminiStatus(response.status)) {
        sawTransientHttp = true;
      }

      if (
        response.ok ||
        !isTransientGeminiStatus(response.status) ||
        attempt === maxAttempts - 1
      ) {
        return response;
      }

      await sleep(400 * 2 ** attempt);
    } catch (error) {
      bumpGeminiHttpCall();
      lastNetworkError = error;
      const timedOut = isAbortTimeout(error);
      if (timedOut) timeoutAttempts += 1;
      aiLog.debug("gemini", {
        phase: "attempt_network_error",
        model,
        search: useSearch,
        thinkingBudget,
        attempt: attempt + 1,
        ms: Date.now() - started,
        error:
          error instanceof Error
            ? truncateUpstreamBody(error.message, 200)
            : "network_error",
      });
      // If Gemini already answered 503 once, don't burn another full timeout.
      const giveUp =
        attempt === maxAttempts - 1 ||
        (timedOut && (timeoutAttempts >= 2 || sawTransientHttp));
      if (giveUp) {
        throw new UpstreamError(
          error instanceof Error ? error.message : "Gemini network error",
          503,
        );
      }
      await sleep(400 * 2 ** attempt);
    }
  }

  throw new UpstreamError(
    lastNetworkError instanceof Error
      ? lastNetworkError.message
      : "Gemini network error",
    503,
  );
}

type GeminiPayload = {
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: ContentPart[] };
    groundingMetadata?: { groundingChunks?: GroundingChunk[] };
  }>;
  error?: { message?: string };
};

async function parseGeminiResponse(response: Response) {
  const payload = (await response.json()) as GeminiPayload;
  const candidate = payload.candidates?.[0];
  const text = extractText(candidate?.content?.parts);

  return {
    payload,
    candidate,
    text,
    finishReason: candidate?.finishReason ?? null,
  };
}

/** True for a transient/overload signal — including network timeouts, which
 * callGemini already normalizes to status 503 — as opposed to a definitive
 * failure (bad request, invalid output) that a different model won't fix. */
function isBusyError(error: unknown): boolean {
  return (
    error instanceof UpstreamError &&
    error.status !== undefined &&
    isTransientGeminiStatus(error.status)
  );
}

async function runModelAttempt(
  model: string,
  apiKey: string,
  input: ProviderInput,
): Promise<unknown> {
  const started = Date.now();
  const callsAtStart = getAiRequestContext()?.geminiCalls ?? 0;
  const { wantsCreator, needsDeepThinking } = analyzePrompt(input.userPrompt);
  // Prefer search when a creator is named; fall back without tools if needed.
  const searchAttempts = wantsCreator ? [true, false] : [false, true];
  // Try light thinking first so overloaded deep-thinking calls don't block
  // a successful generate for minutes; deep is a follow-up when needed.
  const thinkingAttempts = needsDeepThinking ? [0, THINKING_BUDGET_DEEP] : [0];

  let lastError = "Gemini returned an empty response";
  let lastHttpStatus: number | undefined;
  // A schema-shaped result where the model honestly couldn't apply the
  // persona — kept as a fallback in case the intensified retry below
  // fails outright, so an unresolved persona never turns into a 500.
  let personaUnknownResult: unknown;
  let outcome: "ok" | "persona_fallback" | "error" = "error";
  let failedCombos = 0;
  // Cap combos so a total Gemini outage cannot run for several minutes.
  const maxFailedCombos = 2;

  const logSummary = () => {
    const calls =
      (getAiRequestContext()?.geminiCalls ?? callsAtStart) - callsAtStart;
    aiLog.info("gemini", {
      phase: "summary",
      model,
      outcome,
      calls,
      totalMs: Date.now() - started,
      wantsCreator,
      repair: Boolean(input.repairOf),
    });
  };

  try {
    combos: for (const useSearch of searchAttempts) {
      for (const thinkingBudget of thinkingAttempts) {
        let response: Response;
        try {
          response = await callGemini({
            apiKey,
            model,
            input,
            useSearch,
            thinkingBudget,
          });
        } catch (error) {
          // Timeout / transient upstream must not abort the whole generate —
          // try the next lighter search/thinking combo instead.
          if (
            error instanceof UpstreamError &&
            (error.status === undefined ||
              isTransientGeminiStatus(error.status) ||
              isAbortTimeout(error))
          ) {
            lastError = error.message;
            lastHttpStatus = error.status ?? 503;
            failedCombos += 1;
            aiLog.warn("gemini", {
              phase: "combo_failover",
              model,
              search: useSearch,
              thinkingBudget,
              httpStatus: lastHttpStatus,
              failedCombos,
              error: truncateUpstreamBody(error.message, 200),
            });
            if (failedCombos >= maxFailedCombos) {
              break combos;
            }
            continue;
          }
          throw error;
        }

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          const clipped = truncateUpstreamBody(body);
          lastError = `Gemini HTTP ${response.status}: ${clipped}`;
          lastHttpStatus = response.status;
          aiLog.warn("gemini", {
            phase: "http_error",
            model,
            httpStatus: response.status,
            search: useSearch,
            thinkingBudget,
            body: clipped,
          });
          // Tool + JSON combos often 400; transient load may still fail after
          // callGemini retries — try the next search/thinking combo.
          if (
            response.status === 400 ||
            isTransientGeminiStatus(response.status)
          ) {
            if (isTransientGeminiStatus(response.status)) {
              failedCombos += 1;
              if (failedCombos >= maxFailedCombos) {
                break combos;
              }
            }
            continue;
          }
          throw new UpstreamError(lastError, response.status);
        }

        const { text, candidate, finishReason } = await parseGeminiResponse(
          response,
        );

        if (!text) {
          lastError = `Gemini returned an empty response${
            finishReason ? ` (${finishReason})` : ""
          }`;
          continue;
        }

        try {
          const parsed = extractJson(text);
          const fromSearch = groundingSources(
            candidate?.groundingMetadata?.groundingChunks,
          );
          const merged = mergeSources(parsed, fromSearch);

          if (wantsCreator && looksPersonaUnknown(parsed)) {
            // Valid recipe, but the model gave up on the persona. The first
            // combo already used the strongest settings (search + deep
            // thinking when a creator is named), so weaker combos are
            // unlikely to do better — go straight to the one dedicated,
            // maximally-directed retry below instead of exhausting the rest.
            personaUnknownResult = merged;
            break combos;
          }

          outcome = "ok";
          return merged;
        } catch (error) {
          lastError =
            error instanceof Error
              ? error.message
              : "Failed to parse Gemini JSON";
          continue;
        }
      }
    }

    if (personaUnknownResult !== undefined) {
      // Every combo above resolved to "persona unknown". One last,
      // maximally-directed attempt before accepting the fallback — skipped
      // when this call is itself already a schema-repair retry, so we
      // never stack two different retry mechanisms in one pass.
      if (!input.repairOf) {
        try {
          const intensifiedInput: ProviderInput = {
            ...input,
            repairOf: buildPersonaIntensifyPrompt(
              extractPersonaQuery(input.userPrompt),
            ),
          };
          const response = await callGemini({
            apiKey,
            model,
            input: intensifiedInput,
            useSearch: true,
            thinkingBudget: THINKING_BUDGET_DEEP,
          });

          if (response.ok) {
            const { text, candidate } = await parseGeminiResponse(response);
            if (text) {
              const parsed = extractJson(text);
              const fromSearch = groundingSources(
                candidate?.groundingMetadata?.groundingChunks,
              );
              outcome = looksPersonaUnknown(parsed) ? "persona_fallback" : "ok";
              return mergeSources(parsed, fromSearch);
            }
          }
        } catch {
          // Fall through to the already-valid fallback below.
        }
      }

      outcome = "persona_fallback";
      return personaUnknownResult;
    }

    throw new UpstreamError(lastError, lastHttpStatus);
  } finally {
    logSummary();
  }
}

export function createGeminiProvider(): RecipeProvider {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const fallbackModel = process.env.GEMINI_FALLBACK_MODEL?.trim() || undefined;

  if (!apiKey) {
    throw new UpstreamError("GEMINI_API_KEY is not configured");
  }

  return {
    async generate(input: ProviderInput): Promise<unknown> {
      try {
        return await runModelAttempt(model, apiKey, input);
      } catch (error) {
        if (fallbackModel && isBusyError(error)) {
          aiLog.warn("gemini", {
            phase: "fallback_model",
            from: model,
            to: fallbackModel,
            reason:
              error instanceof Error
                ? truncateUpstreamBody(error.message, 200)
                : "unknown_error",
          });
          return await runModelAttempt(fallbackModel, apiKey, input);
        }
        throw error;
      }
    },
  };
}
