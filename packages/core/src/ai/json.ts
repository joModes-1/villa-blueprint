import type { z } from 'zod';
import type { AiCall, AiClient, AiResult } from './types';

/** Removes a wrapping ``` / ```json fence, if present. */
export function stripFences(text: string): string {
  const t = text.trim();
  const m = /^```[a-zA-Z]*\s*\n([\s\S]*?)\n?```$/.exec(t);
  return (m?.[1] ?? t).trim();
}

function sumResults(a: AiResult, b: AiResult): AiResult {
  return {
    text: b.text,
    model: b.model,
    tokensIn: a.tokensIn + b.tokensIn,
    tokensOut: a.tokensOut + b.tokensOut,
    costUsd: a.costUsd + b.costUsd,
  };
}

function parseAndValidate<T>(text: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>): T {
  const raw: unknown = JSON.parse(stripFences(text));
  return schema.parse(raw);
}

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message.slice(0, 600);
  return String(err).slice(0, 600);
}

/**
 * Calls the model for JSON, validates against `schema`. On a parse or validation failure it retries
 * exactly once with the error appended; a second failure throws. Usage of both attempts is summed.
 */
export async function completeJson<T>(
  ai: AiClient,
  call: AiCall,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
): Promise<{ data: T; result: AiResult }> {
  const first = await ai.complete({ ...call, json: true });
  try {
    return { data: parseAndValidate(first.text, schema), result: first };
  } catch (err) {
    const retryCall: AiCall = {
      ...call,
      json: true,
      user: `${call.user}\n\nYour previous reply was not valid: ${describeError(err)}. Return only the JSON.`,
    };
    const second = await ai.complete(retryCall);
    const merged = sumResults(first, second);
    return { data: parseAndValidate(second.text, schema), result: merged };
  }
}
