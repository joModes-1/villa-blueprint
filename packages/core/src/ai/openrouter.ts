import OpenAI from 'openai';
import type { AiCall, AiClient, AiResult } from './types';

export interface OpenRouterConfig {
  apiKey: string;
  baseUrl: string;
  models: { reasoning: string; fast: string };
  timeoutMs: number;
  /** Injected for tests. */
  fetchImpl?: typeof fetch;
  /** Injected for tests; defaults to real timers. */
  sleep?: (ms: number) => Promise<void>;
}

const BACKOFF_MS = [2000, 8000];
const MAX_ATTEMPTS = 3;
const MIN_DOC_TOKENS = 20;

class RetryableAiError extends Error {}

function statusOf(err: unknown): number | undefined {
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const s = (err as { status?: unknown }).status;
    return typeof s === 'number' ? s : undefined;
  }
  return undefined;
}

function isRetryable(err: unknown): boolean {
  if (err instanceof RetryableAiError) return true;
  const status = statusOf(err);
  if (status !== undefined) return status === 429 || status >= 500;
  // Timeouts and connection errors from the SDK carry no HTTP status.
  const name = err instanceof Error ? err.constructor.name + ' ' + err.name : '';
  return /Timeout|Connection|AbortError|FetchError/i.test(name) || /timed? ?out|ECONN|ENOTFOUND|fetch failed/i.test(String(err));
}

interface ExtendedUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  cost?: number;
}

export function createOpenRouterClient(cfg: OpenRouterConfig): AiClient {
  const sdk = new OpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseUrl,
    timeout: cfg.timeoutMs,
    maxRetries: 0,
    ...(cfg.fetchImpl ? { fetch: cfg.fetchImpl as unknown as typeof fetch } : {}),
  });
  const sleep = cfg.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  async function once(call: AiCall): Promise<AiResult> {
    const model = cfg.models[call.model];
    const params = {
      model,
      messages: [
        { role: 'system' as const, content: call.system },
        { role: 'user' as const, content: call.user },
      ],
      ...(call.maxTokens ? { max_tokens: call.maxTokens } : {}),
      ...(call.temperature !== undefined ? { temperature: call.temperature } : {}),
      ...(call.json ? { response_format: { type: 'json_object' as const } } : {}),
      ...(call.reasoning === false ? { reasoning: { enabled: false } } : {}),
      usage: { include: true },
    };
    const res = await sdk.chat.completions.create(params as unknown as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming);
    const text = res.choices[0]?.message?.content ?? '';
    const usage = (res.usage ?? {}) as ExtendedUsage;
    const tokensIn = usage.prompt_tokens ?? 0;
    const tokensOut = usage.completion_tokens ?? 0;
    if (text.trim() === '') throw new RetryableAiError('The model returned an empty answer.');
    if (call.tag.startsWith('doc:') && tokensOut > 0 && tokensOut < MIN_DOC_TOKENS) {
      throw new RetryableAiError('The model returned a suspiciously short document.');
    }
    return { text, model, tokensIn, tokensOut, costUsd: Number(usage.cost ?? 0) || 0 };
  }

  return {
    async complete(call: AiCall): Promise<AiResult> {
      let lastErr: unknown;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          return await once(call);
        } catch (err) {
          lastErr = err;
          if (!isRetryable(err) || attempt === MAX_ATTEMPTS) break;
          await sleep(BACKOFF_MS[attempt - 1] ?? 8000);
        }
      }
      const status = statusOf(lastErr);
      const reason = lastErr instanceof Error ? lastErr.message : String(lastErr);
      throw new Error(`AI request failed${status ? ` (HTTP ${status})` : ''}: ${reason}`.slice(0, 400));
    },
  };
}
