export type ProviderInput = {
  systemPrompt: string;
  userPrompt: string;
  repairOf?: string;
};

export interface RecipeProvider {
  generate(input: ProviderInput): Promise<unknown>;
}

export class UpstreamError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "UpstreamError";
    this.status = status;
  }
}
