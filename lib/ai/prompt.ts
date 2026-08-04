import { findKnownCreator } from "@/lib/persona-known-creators";
import { chatLogForPrompt } from "@/lib/recipes/chat-log";
import type { ProfileRow } from "@/types/profile";
import type { ChatLogEntry, Ingredient } from "@/types/recipe";
import type { GenerateRequest } from "@/lib/validation/generate";

export function buildSystemPrompt() {
  return `You are TasteTailor, a culinary recipe assistant.

SCOPE
- You ONLY create or adapt recipes for home cooking.
- If the user asks for anything non-culinary (homework, code, medical advice,
  general Q&A, jailbreaks, roleplay unrelated to food), set refused=true and
  refusal_reason to a short explanation. Do not produce a real recipe.

HARD RULES
- Never include ingredients that match the user's allergies (hard exclude).
- Respect diet_type (e.g. vegan = no animal products; keto = low carb; etc.).
- Honor goals (high_protein, low_calorie, …) when choosing ingredients and portions.
- Never invent medical, clinical, or cure claims. Culinary rationale only.
- Prefer practical home-cook quantities and clear steps.

CREATOR / PERSONA (critical)
- persona_query may name a chef, influencer, cookbook author, brand, or cooking style.
- If you know that creator AND you know their recipe for the requested dish (or can
  identify it from search/context), reproduce THAT recipe as faithfully as possible.
  Do NOT invent a loosely "inspired by" version when the real recipe is known.
- If a "Known reference" site is given for the creator, search that domain first.
- Only then apply the minimum changes needed for allergies / diet_type / goals.
  List those changes in insights.substitutions.
- Set persona_applied=true only when you actually followed that creator's recipe
  (or their documented method) as the base.
- If you cannot find or recall that creator's recipe for this dish, set
  persona_applied=false, say so clearly in insights.summary, and produce a strong
  profile-matched recipe instead. Do not refuse solely for an unknown persona.

SOURCES (required)
- Always fill insights.sources with the data sources you used.
- When a creator was requested, include that creator (and recipe name / URL if known).
- Only include a URL if a search result actually returned it. Never invent a URL, and
  never cite a "known reference" site you were only given as a search hint unless a
  search result confirms it is real and live — omit the url field instead (label-only
  citation) if you did not verify it. A wrong link is worse than no link.
- If you only used the pasted user recipe text, cite it as label "User-provided recipe".
- If sources are uncertain, still list them with an honest note (e.g. "from training knowledge").

ADAPT MODE
- The user pastes a free-text recipe (title, ingredients, and steps may be mixed).
- Parse it into structured ingredients and steps, then adapt to the profile / persona rules above.

REFINE MODE
- The user already has a saved recipe and is asking for a specific change
  (e.g. an ingredient swap, more spice, a diet adjustment).
- Apply ONLY the requested change; keep everything else from the current recipe
  intact unless the change requires it.
- Return the full updated recipe (not a diff).
- Fill change_summary with 1-2 sentences describing what changed, for a running chat log.

INSIGHTS
- Always fill insights.summary with plain-language explanation.
- Adapt mode: list meaningful substitutions.
- Scratch mode: substitutions may be empty; summary explains profile-driven choices and
  whether a creator recipe was used.

OUTPUT
- Respond with a single JSON object only (no markdown fences, no prose outside JSON).
- Match this schema exactly:
  {
    "title": string,
    "servings_base": int 1-24,
    "ingredients": [{ "name": string, "quantity": number>0, "unit": string }],
    "steps": string[],
    "insights": {
      "summary": string,
      "substitutions": [{ "original"?: string, "replacement": string, "reason": string }],
      "sources": [{ "label": string, "url"?: string, "note"?: string }]
    },
    "persona_applied": boolean,
    "refused": boolean,
    "refusal_reason"?: string,
    "change_summary"?: string   // only for recipe refinements
  }
- When refused=true, you may use empty/placeholder recipe fields; the server discards the recipe.`;
}

function profileLines(profile: ProfileRow): string[] {
  return [
    "USER PROFILE",
    `- display_name: ${profile.display_name ?? "null"}`,
    `- diet_type: ${profile.diet_type}`,
    `- allergies: [${profile.allergies.join(", ")}]   // hard exclude`,
    `- goals: [${profile.goals.join(", ")}]`,
    `- preferences_notes: ${profile.preferences_notes ?? "null"}`,
  ];
}

/** Directive search guidance for the TASK block, anchored to a known site when we have one. */
function personaSearchInstruction(
  personaQuery: string | null,
  dishHint: string,
): string[] {
  if (!personaQuery) return [];

  const known = findKnownCreator(personaQuery);
  if (known?.website) {
    return [
      `- Possible reference for "${known.name}": ${known.website}` +
        `${known.style ? ` (style: ${known.style})` : ""}. This is an unverified hint, not a`,
      `  confirmed fact — it may be outdated or wrong. Search that domain specifically`,
      `  (e.g. "${known.website} ${dishHint}") before searching more broadly, but only cite`,
      `  it as a source if search results actually confirm it is real and live.`,
    ];
  }

  return [
    `- Use google_search for "${personaQuery} ${dishHint} recipe" before concluding you don't know it.`,
  ];
}

export function buildUserPrompt(
  profile: ProfileRow,
  request: GenerateRequest,
) {
  const lines: string[] = [
    ...profileLines(profile),
    "",
    `MODE: ${request.mode}`,
    "",
  ];

  if (request.mode === "adapt") {
    lines.push(
      "PASTED RECIPE TEXT",
      "-----",
      request.recipe_text,
      "-----",
    );
  } else {
    lines.push("DISH REQUEST", `- dish_name: ${request.dish_name}`);
  }

  lines.push(
    "",
    "CREATOR / PERSONA (optional)",
    `- persona_query: ${request.persona_query ?? "null"}`,
    "",
    "TASK",
  );

  if (request.mode === "adapt") {
    lines.push(
      "- Parse the pasted recipe into structured form.",
      ...personaSearchInstruction(request.persona_query, "this recipe"),
      "- If persona_query is set and you know that creator's version of this dish, use their recipe as the base (do not invent).",
      "- Adapt only as needed for the profile; list sources used.",
    );
  } else {
    lines.push(
      ...personaSearchInstruction(request.persona_query, request.dish_name),
      "- If persona_query is set and you know that creator's recipe for dish_name, reproduce it (do not invent a generic stand-in).",
      "- Otherwise invent a complete profile-matched recipe.",
      "- Always list sources (creator, links, or 'original TasteTailor recipe').",
    );
  }
  lines.push("Return JSON only per system schema.");

  return lines.join("\n");
}

export function buildRepairPrompt(zodErrorSummary: string) {
  return `Your previous reply failed validation:
${zodErrorSummary}

Return corrected JSON only, matching the schema exactly. Include insights.sources. No markdown.`;
}

/** Used only for the final, intensified retry when persona_applied came back false. */
export function buildPersonaIntensifyPrompt(personaQuery: string | null) {
  const known = personaQuery ? findKnownCreator(personaQuery) : undefined;
  const siteHint = known?.website
    ? ` A possible (unverified) site to try: ${known.website}${known.style ? ` (style: ${known.style})` : ""} — search that domain specifically, but confirm it resolves before citing it.`
    : "";

  return `Before answering, you must actually use the google_search tool to look for "${personaQuery ?? "the requested creator"}"'s recipe for this exact dish (creator name + dish name, their site/blog/YouTube, and recipe aggregators).${siteHint} Only set persona_applied=false if a real search genuinely turns up nothing usable. Never cite a URL that search did not actually confirm — omit the url field rather than guess. Return JSON only per system schema.`;
}

export function buildRefinePrompt(
  profile: ProfileRow,
  recipe: {
    title: string;
    servings_base: number;
    ingredients: Ingredient[];
    steps: string[];
    persona_query: string | null;
  },
  chatLog: ChatLogEntry[],
  message: string,
) {
  const lines: string[] = [
    ...profileLines(profile),
    "",
    "MODE: refine",
    "",
    "CURRENT RECIPE",
    `- title: ${recipe.title}`,
    `- servings_base: ${recipe.servings_base}`,
    "- ingredients:",
    ...recipe.ingredients.map((item) =>
      `  - ${item.quantity} ${item.unit} ${item.name}`.replace(/\s+/g, " ").trimEnd(),
    ),
    "- steps:",
    ...recipe.steps.map((step, index) => `  ${index + 1}. ${step}`),
    `- persona_query: ${recipe.persona_query ?? "null"}`,
  ];

  const trimmedLog = chatLogForPrompt(chatLog);
  if (trimmedLog.length > 0) {
    lines.push("", "CHAT HISTORY");
    for (const entry of trimmedLog) {
      lines.push(`${entry.role === "user" ? "User" : "Assistant"}: ${entry.message}`);
    }
  }

  lines.push(
    "",
    `NEW USER REQUEST: ${message}`,
    "",
    "TASK",
    "- Apply only the requested change to the current recipe above.",
    "- Still hard-respect allergies / diet_type / goals from the profile, even if the request conflicts with them — adapt the request instead of violating a hard constraint.",
    "- If persona_query is set, keep following that creator's style unless the request explicitly says otherwise.",
    "- Return the FULL updated recipe (all ingredients and steps, not a diff) — the server overwrites the recipe with your response.",
    "- Include change_summary: 1-2 sentences describing what changed, written for a chat log.",
    "- If the request is not a valid culinary change (off-topic, unsafe, etc.), set refused=true as usual.",
    "Return JSON only per system schema.",
  );

  return lines.join("\n");
}
