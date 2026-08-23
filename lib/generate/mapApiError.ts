export function mapApiError(payload: {
  error?: string;
  message?: string;
  issues?: Array<{ path: string[]; message: string }>;
}) {
  if (payload.error === "validation_error" && payload.issues?.length) {
    const next: Record<string, string> = {};
    for (const issue of payload.issues) {
      const key = issue.path[0] ?? "form";
      if (!next[key]) next[key] = issue.message;
    }
    return { fieldErrors: next, formError: null as string | null };
  }

  const messages: Record<string, string> = {
    non_culinary:
      "TasteTailor only generates recipes. Try a dish or recipe instead.",
    rate_limited: "Daily generation limit reached. Come back tomorrow.",
    invalid_ai_output: "Couldn't build a valid recipe. Please try again.",
    onboarding_required: "Finish onboarding before generating recipes.",
    ai_unavailable:
      "The AI service is temporarily busy. Please try again in a moment.",
  };

  return {
    fieldErrors: {} as Record<string, string>,
    formError:
      messages[payload.error ?? ""] ??
      payload.message ??
      "Something went wrong. Please try again.",
  };
}
