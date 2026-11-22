import { vi } from 'vitest';
import { createMockClient, type AiClient } from '@blueprint/core';
import { prisma, resetTestDb } from '@blueprint/db';
import { createLogger, type WorkerContext } from '../src/context';

export { prisma };

export async function resetDb(): Promise<void> {
  await resetTestDb(prisma);
}

export function makeCtx(over: Partial<WorkerContext> & { ai?: AiClient } = {}): WorkerContext & { enqueue: ReturnType<typeof vi.fn> } {
  return {
    prisma,
    ai: over.ai ?? createMockClient(),
    logger: createLogger('silent'),
    maxTokens: over.maxTokens ?? 2_000_000,
    enqueue: vi.fn(async () => undefined),
  } as WorkerContext & { enqueue: ReturnType<typeof vi.fn> };
}

export async function makeProject(status: 'draft' | 'processing' = 'processing') {
  const user = await prisma.user.create({ data: { email: `u${Date.now()}${Math.random()}@x.co`, name: 'U', passwordHash: 'x' } });
  const project = await prisma.project.create({ data: { userId: user.id, name: 'P', status } });
  return { user, project };
}
