import type { PrismaClient, Project, RunStage } from '@blueprint/db';
import { InvalidStateError, transition, type Run } from '@blueprint/core';
import { toRunView, withProgress } from './projects';
import { enqueue } from './queue';

async function startRun(
  prisma: PrismaClient,
  project: Project,
  stage: RunStage,
  total: number,
  status: Project['status'],
) {
  return prisma.$transaction(async (tx) => {
    const run = await tx.pipelineRun.create({ data: { projectId: project.id, stage, total, status: 'running' } });
    await tx.project.update({ where: { id: project.id }, data: { status } });
    return run;
  });
}

/** Marks the run and project failed when jobs could not be queued (for example, the queue is down). */
async function abortRun(prisma: PrismaClient, projectId: string, runId: string, message: string): Promise<void> {
  await prisma.pipelineRun.update({
    where: { id: runId },
    data: { status: 'failed', error: message.slice(0, 500), finishedAt: new Date() },
  });
  await prisma.project.update({ where: { id: projectId }, data: { status: 'failed' } });
}

export async function getLatestRun(prisma: PrismaClient, projectId: string): Promise<Run | null> {
  const run = await prisma.pipelineRun.findFirst({ where: { projectId }, orderBy: { createdAt: 'desc' } });
  return withProgress(prisma, run);
}

/** POST /analyze: process every pending source, then analyze. */
export async function startAnalysis(prisma: PrismaClient, project: Project): Promise<Run> {
  const sources = await prisma.source.findMany({ where: { projectId: project.id }, select: { id: true, status: true } });
  const next = transition(project.status, 'analyze', { sourceCount: sources.length });
  const pending = sources.filter((s) => s.status === 'pending');
  const run = await startRun(prisma, project, pending.length > 0 ? 'process' : 'analyze', pending.length > 0 ? pending.length : 1, next);
  try {
    if (pending.length > 0) {
      for (const s of pending) await enqueue('process-source', { sourceId: s.id, runId: run.id });
    } else {
      await enqueue('analyze-project', { projectId: project.id, runId: run.id });
    }
  } catch (err) {
    await abortRun(prisma, project.id, run.id, 'Could not queue the work. Please retry.');
    throw err;
  }
  return toRunView(run);
}

/** POST /retry: re-enqueue the failed run's items (docs/27). */
export async function retryFailedRun(prisma: PrismaClient, project: Project): Promise<Run> {
  const failed = await prisma.pipelineRun.findFirst({ where: { projectId: project.id }, orderBy: { createdAt: 'desc' } });
  if (project.status !== 'failed' || !failed || failed.status !== 'failed') {
    throw new InvalidStateError(`There is no failed run to retry while the project is "${project.status}".`);
  }
  const next = transition(project.status, 'retry', { failedStage: failed.stage });

  if (failed.stage === 'process') {
    await prisma.source.updateMany({ where: { projectId: project.id, status: 'failed' }, data: { status: 'pending', error: null } });
    const pending = await prisma.source.findMany({ where: { projectId: project.id, status: 'pending' }, select: { id: true } });
    if (pending.length > 0) {
      const run = await startRun(prisma, project, 'process', pending.length, next);
      try {
        for (const s of pending) await enqueue('process-source', { sourceId: s.id, runId: run.id });
      } catch (err) {
        await abortRun(prisma, project.id, run.id, 'Could not queue the work. Please retry.');
        throw err;
      }
      return toRunView(run);
    }
  }

  if (failed.stage === 'process' || failed.stage === 'analyze') {
    const run = await startRun(prisma, project, 'analyze', 1, 'processing');
    try {
      await enqueue('analyze-project', { projectId: project.id, runId: run.id });
    } catch (err) {
      await abortRun(prisma, project.id, run.id, 'Could not queue the work. Please retry.');
      throw err;
    }
    return toRunView(run);
  }

  if (failed.stage === 'generate') {
    await prisma.document.updateMany({
      where: { projectId: project.id, status: { in: ['failed', 'generating'] } },
      data: { status: 'pending', error: null },
    });
    const total = await prisma.document.count({ where: { projectId: project.id } });
    const run = await startRun(prisma, project, 'generate', total, next);
    try {
      await enqueue('schedule-generation', { projectId: project.id, runId: run.id });
    } catch (err) {
      await abortRun(prisma, project.id, run.id, 'Could not queue the work. Please retry.');
      throw err;
    }
    return toRunView(run);
  }

  const run = await startRun(prisma, project, 'gate', 1, next);
  try {
    await enqueue('run-gates', { projectId: project.id, runId: run.id });
  } catch (err) {
    await abortRun(prisma, project.id, run.id, 'Could not queue the work. Please retry.');
    throw err;
  }
  return toRunView(run);
}
