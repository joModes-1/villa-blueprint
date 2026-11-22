import type { PrismaClient, Project } from '@blueprint/db';
import {
  catalogByKey,
  estimateGeneration,
  isExportPath,
  NotFoundError,
  p0Keys,
  PACK_SPEC,
  transition,
  UnprocessableError,
  type DocumentListItem,
  type Run,
} from '@blueprint/core';
import { getEnv } from './env';
import { toRunView } from './projects';
import { enqueue } from './queue';

export function getEstimate(): { aiCalls: number; tokens: number } {
  return estimateGeneration(PACK_SPEC);
}

export async function tokensUsed(prisma: PrismaClient, projectId: string): Promise<number> {
  const sum = await prisma.usageEvent.aggregate({ where: { projectId }, _sum: { tokensIn: true, tokensOut: true } });
  return (sum._sum.tokensIn ?? 0) + (sum._sum.tokensOut ?? 0);
}

/** POST /generate (docs/27): guards, document rows, a run, and the first scheduler job. */
export async function startGeneration(prisma: PrismaClient, project: Project): Promise<Run> {
  const next = transition(project.status, 'generate');

  const decisions = await prisma.decision.findMany({ where: { projectId: project.id }, select: { key: true, value: true } });
  const values = new Map(decisions.map((d) => [d.key, d.value.trim()]));
  const missing = p0Keys().filter((k) => !values.get(k));
  if (missing.length > 0) {
    throw new UnprocessableError(
      'LEDGER_INCOMPLETE',
      'Some required decisions are still empty.',
      missing.map((k) => ({ key: k, area: catalogByKey(k)?.area ?? k })),
    );
  }

  const max = getEnv().MAX_TOKENS_PER_PROJECT;
  if (max > 0 && (await tokensUsed(prisma, project.id)) + getEstimate().tokens > max) {
    throw new UnprocessableError('BUDGET_EXCEEDED', 'The estimated tokens for this run would exceed the project budget.');
  }

  const run = await prisma.$transaction(async (tx) => {
    const existing = await tx.document.findMany({ where: { projectId: project.id }, select: { path: true } });
    const have = new Set(existing.map((d) => d.path));
    const missingSpecs = PACK_SPEC.filter((s) => !have.has(s.path));
    if (missingSpecs.length > 0) {
      await tx.document.createMany({
        data: missingSpecs.map((s) => ({ projectId: project.id, path: s.path, title: s.title, writer: s.writer, status: 'pending' as const })),
      });
    }
    await tx.document.updateMany({
      where: { projectId: project.id, status: { in: ['stale', 'failed', 'generating'] } },
      data: { status: 'pending', error: null },
    });
    const total = await tx.document.count({ where: { projectId: project.id, status: 'pending' } });
    const created = await tx.pipelineRun.create({ data: { projectId: project.id, stage: 'generate', total, status: 'running' } });
    await tx.project.update({ where: { id: project.id }, data: { status: next } });
    return created;
  });

  try {
    await enqueue('schedule-generation', { projectId: project.id, runId: run.id });
  } catch (err) {
    await prisma.pipelineRun.update({ where: { id: run.id }, data: { status: 'failed', error: 'Could not queue the work. Please retry.', finishedAt: new Date() } });
    await prisma.project.update({ where: { id: project.id }, data: { status: 'failed' } });
    throw err;
  }
  return toRunView(run);
}

export async function listDocuments(prisma: PrismaClient, project: Project): Promise<DocumentListItem[]> {
  const rows = await prisma.document.findMany({ where: { projectId: project.id } });
  const order = new Map(PACK_SPEC.map((s, i) => [s.path, i]));
  return rows
    .filter((d) => isExportPath(d.path))
    .sort((a, b) => (order.get(a.path) ?? 10_000 + 0) - (order.get(b.path) ?? 10_000) || a.path.localeCompare(b.path))
    .map((d) => ({ path: d.path, title: d.title, status: d.status, writer: d.writer, updatedAt: d.updatedAt.toISOString() }));
}

export async function getDocumentContent(
  prisma: PrismaClient,
  project: Project,
  path: string,
): Promise<{ path: string; title: string; content: string; status: string }> {
  if (!isExportPath(path)) throw new NotFoundError('Document not found.');
  const doc = await prisma.document.findUnique({ where: { projectId_path: { projectId: project.id, path } } });
  if (!doc) throw new NotFoundError('Document not found.');
  return { path: doc.path, title: doc.title, content: doc.content, status: doc.status };
}
