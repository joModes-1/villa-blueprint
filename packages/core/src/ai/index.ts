import { createMockClient } from './mock';
import { createOpenRouterClient } from './openrouter';
import type { AiClient, AiEnv } from './types';

export * from './types';
export * from './budget';
export * from './json';
export { createMockClient, MOCK_CONTRADICTION_MARKER } from './mock';
export { createOpenRouterClient } from './openrouter';
export type { OpenRouterConfig } from './openrouter';

/** The only place in core that interprets environment configuration (docs/19). */
export function createAiClient(env: AiEnv): AiClient {
  const provider = env.AI_PROVIDER ?? 'mock';
  if (provider === 'mock') return createMockClient();
  if (provider !== 'openrouter') throw new Error(`Unknown AI_PROVIDER "${provider}". Use "mock" or "openrouter".`);
  if (!env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is required when AI_PROVIDER=openrouter.');
  return createOpenRouterClient({
    apiKey: env.OPENROUTER_API_KEY,
    baseUrl: env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
    models: {
      reasoning: env.AI_MODEL_REASONING ?? 'anthropic/claude-sonnet-4.5',
      fast: env.AI_MODEL_FAST ?? 'deepseek/deepseek-v3.1-terminus',
    },
    timeoutMs: Number(env.AI_TIMEOUT_MS ?? 240_000) || 240_000,
  });
}
