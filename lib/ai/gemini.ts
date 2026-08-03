import {
  UpstreamError,
  type ProviderInput,
  type RecipeProvider,
} from "@/lib/ai/provider";

type GroundingChunk = {
  web?: { uri?: string; title?: string };
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

function mergeSources(parsed: unknown, grounding: ReturnType<typeof groundingSources>) {
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

async function callGemini(args: {
  apiKey: string;
  model: string;
  input: ProviderInput;
  useSearch: boolean;
}) {
  const { apiKey, model, input, useSearch } = args;
  const userText = input.repairOf
    ? `${input.userPrompt}\n\n${input.repairOf}`
    : input.userPrompt;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const wantsCreator = /persona_query:\s*(?!null\b).+/i.test(input.userPrompt);

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
    },
  };

  if (useSearch) {
    body.tools = [{ google_search: {} }];
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new UpstreamError(
      error instanceof Error ? error.message : "Gemini network error",
    );
  }

  return response;
}

export function createGeminiProvider(): RecipeProvider {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!apiKey) {
    throw new UpstreamError("GEMINI_API_KEY is not configured");
  }

  return {
    async generate(input: ProviderInput): Promise<unknown> {
      let response = await callGemini({
        apiKey,
        model,
        input,
        useSearch: true,
      });

      // Some model/tool combos reject search + JSON mode; retry without search.
      if (!response.ok) {
        const firstBody = await response.text().catch(() => "");
        if (response.status === 400) {
          response = await callGemini({
            apiKey,
            model,
            input,
            useSearch: false,
          });
          if (!response.ok) {
            const body = await response.text().catch(() => "");
            throw new UpstreamError(
              `Gemini HTTP ${response.status}: ${body.slice(0, 300) || firstBody.slice(0, 300)}`,
              response.status,
            );
          }
        } else {
          throw new UpstreamError(
            `Gemini HTTP ${response.status}: ${firstBody.slice(0, 300)}`,
            response.status,
          );
        }
      }

      const payload = (await response.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
          groundingMetadata?: { groundingChunks?: GroundingChunk[] };
        }>;
      };

      const candidate = payload.candidates?.[0];
      const text = candidate?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim();

      if (!text) {
        throw new UpstreamError("Gemini returned an empty response");
      }

      try {
        const parsed = extractJson(text);
        const fromSearch = groundingSources(
          candidate?.groundingMetadata?.groundingChunks,
        );
        return mergeSources(parsed, fromSearch);
      } catch (error) {
        throw new UpstreamError(
          error instanceof Error ? error.message : "Failed to parse Gemini JSON",
        );
      }
    },
  };
}
