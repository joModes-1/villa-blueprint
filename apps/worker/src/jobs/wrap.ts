import { AppError } from '@blueprint/core';
import type { WorkerContext } from '../context';
import { failRun } from '../runs';

export interface JobLike<T> {
  id: string;
  data: T;
  retryCount?: number;
  retryLimit?: number;
}

/**
 * Runs a handler for one job. A budget error fails the run at once (retrying cannot help). Any other error
 * is rethrown so pg-boss retries; on the last attempt the run and the project are marked failed.
 */
export async function runJob<T extends { runId: string }>(
  ctx: WorkerContext,
  queue: string,
  job: JobLike<T>,
  handler: (ctx: WorkerContext, payload: T) => Promise<void>,
): Promise<void> {
  try {
    await handler(ctx, job.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const budget = err instanceof AppError && err.code === 'BUDGET_EXCEEDED';
    const last = (job.retryCount ?? 0) >= (job.retryLimit ?? 0);
    ctx.logger.error({ queue, jobId: job.id, runId: job.data.runId, outcome: 'error', final: budget || last }, 'job failed');
    if (budget || last) {
      await failRun(ctx.prisma, job.data.runId, message);
      if (budget) return;
    }
    throw err;
  }
}
