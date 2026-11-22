import type { PipelineRun, Prisma, PrismaClient, RunStage } from '@blueprint/db';
import { InvalidTransitionError, transition } from '@blueprint/core';

type Db = PrismaClient | Prisma.TransactionClient;

export async function createRun(db: Db, projectId: string, stage: RunStage, total: number): Promise<PipelineRun> {
  return db.pipelineRun.create({ data: { projectId, stage, total, status: 'running' } });
}

/** docs/27: one atomic statement. Only the job that receives done = total starts the next stage. */
export async function incrementRun(db: Db, runId: string): Promise<{ done: number; total: number }> {
  const rows = await db.$queryRaw<{ done: number; total: number }[]>`
    UPDATE pipeline_runs SET done = done + 1 WHERE id = ${runId} RETURNING done, total`;
  const row = rows[0];
  if (!row) throw new Error('Run not found.');
  return { done: Number(row.done), total: Number(row.total) };
}

export async function finishRun(db: Db, runId: string): Promise<void> {
  await db.pipelineRun.update({ where: { id: runId }, data: { status: 'succeeded', finishedAt: new Date() } });
}

/** Marks the run failed and moves the project to `failed` (through transition()). */
export async function failRun(prisma: PrismaClient, runId: string, error: string): Promise<void> {
  const message = error.slice(0, 500);
  await prisma.$transaction(async (tx) => {
    const run = await tx.pipelineRun.findUnique({ where: { id: runId } });
    if (!run) return;
    await tx.pipelineRun.update({ where: { id: runId }, data: { status: 'failed', error: message, finishedAt: new Date() } });
    const project = await tx.project.findUnique({ where: { id: run.projectId }, select: { status: true } });
    if (!project) return;
    try {
      const next = transition(project.status, 'run_failed');
      await tx.project.update({ where: { id: run.projectId }, data: { status: next } });
    } catch (err) {
      if (!(err instanceof InvalidTransitionError)) throw err;
    }
  });
}
