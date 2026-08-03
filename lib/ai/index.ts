import { createGeminiProvider } from "@/lib/ai/gemini";
import { createMockProvider } from "@/lib/ai/mock";
import type { RecipeProvider } from "@/lib/ai/provider";

export function getRecipeProvider(): RecipeProvider {
  const provider = (process.env.AI_PROVIDER || "mock").toLowerCase();

  switch (provider) {
    case "mock":
      return createMockProvider();
    case "gemini":
      return createGeminiProvider();
    default:
      throw new Error(
        `AI_PROVIDER "${provider}" is not implemented. Use "mock" or "gemini".`,
      );
  }
}
