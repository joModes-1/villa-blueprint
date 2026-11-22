import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  AI_PROVIDER: z.enum(['mock', 'openrouter']).default('mock'),
  MAX_TOKENS_PER_PROJECT: z.coerce.number().int().nonnegative().default(0), // 0 = no limit
  MCP_PUBLIC_URL: z.string().default('http://localhost:3102/mcp'),
  LOG_LEVEL: z.string().default('info'),
});

export type WebEnv = z.infer<typeof schema>;

let cached: WebEnv | undefined;

/** Validates process.env once. Throws with the list of missing or invalid variable names. */
export function getEnv(source: NodeJS.ProcessEnv = process.env): WebEnv {
  if (source === process.env && cached) return cached;
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const names = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Invalid or missing environment variables: ${names}`);
  }
  if (source === process.env) cached = parsed.data;
  return parsed.data;
}

export function resetEnvCache(): void {
  cached = undefined;
}
