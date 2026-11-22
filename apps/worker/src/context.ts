import pino, { type Logger } from 'pino';
import { prisma as sharedPrisma, type PrismaClient } from '@blueprint/db';
import {
  assertBudget,
  createAiClient,
  JOB_OPTIONS,
  type AiCall,
  type AiClient,
  type AiResult,
  type JobPayloads,
  type QueueName,
} from '@blueprint/core';
import type { WorkerEnv } from './env';

export interface WorkerContext {
  prisma: PrismaClient;
  ai: AiClient;
  logger: Logger;
  maxTokens: number;
  enqueue<Q extends QueueName>(name: Q, data: JobPayloads[Q]): Promise<void>;
}

export const REDACT = [
  'password',
  '*.password',
  'token',
  '*.token',
  'cookie',
  'headers.cookie',
  'headers.authorization',
  'apiKey',
  'OPENROUTER_API_KEY',
];

export function createLogger(level = 'info'): Logger {
  return pino({ level, redact: { paths: REDACT, censor: '[Redacted]' } });
}

export function createContext(
  env: WorkerEnv,
  deps: { enqueue: WorkerContext['enqueue']; prisma?: PrismaClient; ai?: AiClient },
): WorkerContext {
  return {
    prisma: deps.prisma ?? sharedPrisma,
    ai: deps.ai ?? createAiClient(env),
    logger: createLogger(env.LOG_LEVEL),
    maxTokens: env.MAX_TOKENS_PER_PROJECT,
    enqueue: deps.enqueue,
  };
}

export { JOB_OPTIONS };

/**
 * Wraps the AI client for one project: checks the token budget before every call and records a UsageEvent
 * after it (docs/27 "AI client"). The log line carries numbers only, never content.
 */
export function meteredAi(ctx: WorkerContext, project: { id: string; userId: string }): AiClient {
  return {
    async complete(call: AiCall): Promise<AiResult> {
      const sum = await ctx.prisma.usageEvent.aggregate({
        where: { projectId: project.id },
        _sum: { tokensIn: true, tokensOut: true },
      });
      assertBudget((sum._sum.tokensIn ?? 0) + (sum._sum.tokensOut ?? 0), ctx.maxTokens);
      const started = Date.now();
      const result = await ctx.ai.complete(call);
      await ctx.prisma.usageEvent.create({
        data: {
          userId: project.userId,
          projectId: project.id,
          tag: call.tag,
          model: result.model,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          costUsd: result.costUsd,
        },
      });
      ctx.logger.info(
        {
          tag: call.tag,
          model: result.model,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          costUsd: result.costUsd,
          ms: Date.now() - started,
        },
        'ai call',
      );
      return result;
    },
  };
}
