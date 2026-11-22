export type ModelTier = 'reasoning' | 'fast';

export interface AiCall {
  tag: string;
  model: ModelTier;
  system: string;
  user: string;
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
  /**
   * `false` turns the model's hidden "thinking" off. Thinking models otherwise spend 20,000+ tokens (minutes)
   * deliberating before a 1,000-token answer, which is wasted time and money for simple extraction.
   * Leave unset for calls that benefit from reasoning.
   */
  reasoning?: boolean;
}

export interface AiResult {
  text: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}

export interface AiClient {
  complete(call: AiCall): Promise<AiResult>;
}

export interface AiEnv {
  AI_PROVIDER?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_BASE_URL?: string;
  AI_MODEL_REASONING?: string;
  AI_MODEL_FAST?: string;
  AI_TIMEOUT_MS?: string | number;
}
