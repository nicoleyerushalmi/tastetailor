import type { ProviderInput, RecipeProvider } from "@/lib/ai/provider";

/** Dish/title containing this substring triggers a non-culinary refusal in mock. */
export const MOCK_REFUSE_KEYWORD = "homework";

/** Persona string that forces persona_applied: false in mock. */
export const MOCK_UNKNOWN_PERSONA = "__unknown_persona__";

function fixtureRecipe(overrides: Record<string, unknown> = {}) {
  return {
    title: "Herb Chicken Bowl",
    servings_base: 4,
    ingredients: [
      { name: "chicken breast", quantity: 500, unit: "g" },
      { name: "olive oil", quantity: 2, unit: "tbsp" },
      { name: "broccoli", quantity: 2, unit: "cup" },
      { name: "garlic", quantity: 2, unit: "" },
    ],
    steps: [
      "Pat the chicken dry and season lightly.",
      "Sear in olive oil until cooked through.",
      "Steam broccoli and toss with garlic.",
      "Plate chicken over vegetables and serve.",
    ],
    insights: {
      summary:
        "Built as a high-protein bowl that respects common diet preferences from your profile.",
      substitutions: [
        {
          original: "butter",
          replacement: "olive oil",
          reason: "Lighter fat that fits most dietary goals.",
        },
      ],
      sources: [
        {
          label: "TasteTailor mock fixture",
          note: "Deterministic offline provider",
        },
      ],
    },
    persona_applied: true,
    refused: false,
    ...overrides,
  };
}

export function createMockProvider(): RecipeProvider {
  return {
    async generate(input: ProviderInput): Promise<unknown> {
      const haystack = `${input.userPrompt}\n${input.repairOf ?? ""}`.toLowerCase();

      if (haystack.includes(MOCK_REFUSE_KEYWORD)) {
        return {
          refused: true,
          refusal_reason: "Request is not a culinary recipe task.",
          title: "refused",
          servings_base: 1,
          ingredients: [{ name: "n/a", quantity: 1, unit: "" }],
          steps: ["n/a"],
          insights: {
            summary: "Refused non-culinary request.",
            substitutions: [],
          },
          persona_applied: false,
        };
      }

      const unknownPersona = haystack.includes(MOCK_UNKNOWN_PERSONA.toLowerCase());
      const hasPersona = /persona_query:\s*(?!null\b).+/i.test(input.userPrompt);

      return fixtureRecipe({
        persona_applied: hasPersona && !unknownPersona,
        title: haystack.includes("mode: scratch")
          ? "Scratch Herb Bowl"
          : "Adapted Herb Bowl",
        insights: {
          summary: unknownPersona
            ? "Could not apply the requested persona; recipe follows your dietary profile instead."
            : hasPersona && !unknownPersona
              ? "Used the requested creator's approach as the base, then adjusted for your profile."
              : "Built as a high-protein bowl that respects common diet preferences from your profile.",
          substitutions: haystack.includes("mode: adapt")
            ? [
                {
                  original: "butter",
                  replacement: "olive oil",
                  reason: "Lighter fat that fits most dietary goals.",
                },
              ]
            : [],
          sources: haystack.includes("mode: adapt")
            ? [
                {
                  label: "User-provided recipe",
                  note: "Parsed from pasted recipe text",
                },
              ]
            : hasPersona && !unknownPersona
              ? [
                  {
                    label: "Requested creator (mock)",
                    note: "Mock treats known personas as applied",
                  },
                ]
              : [
                  {
                    label: "TasteTailor mock fixture",
                    note: "Deterministic offline provider",
                  },
                ],
        },
      });
    },
  };
}
