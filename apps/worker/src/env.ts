import path from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  NODE_ENV: z.string().default('development'),
  AI_PROVIDER: z.enum(['mock', 'openrouter']).default('mock'),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().default('https://openrouter.ai/api/v1'),
  AI_MODEL_REASONING: z.string().default('anthropic/claude-sonnet-4.5'),
  AI_MODEL_FAST: z.string().default('deepseek/deepseek-v3.1-terminus'),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(240_000),
  GENERATION_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(4),
  MAX_TOKENS_PER_PROJECT: z.coerce.number().int().nonnegative().default(0), // 0 = no limit
  WORKER_HEALTH_PORT: z.coerce.number().int().min(0).default(3101),
  LOG_LEVEL: z.string().default('info'),
});

export type WorkerEnv = z.infer<typeof schema>;

/** Loads the repository-root .env, then validates. Exits with a readable list of what is wrong. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): WorkerEnv {
  if (source === process.env) loadDotenv({ path: path.resolve(__dirname, '../../../.env') });
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const names = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n  ');
    throw new Error(`Invalid or missing environment variables:\n  ${names}`);
  }
  if (parsed.data.AI_PROVIDER === 'openrouter' && !parsed.data.OPENROUTER_API_KEY) {
    throw new Error('Invalid or missing environment variables:\n  OPENROUTER_API_KEY: required when AI_PROVIDER=openrouter');
  }
  return parsed.data;
}
