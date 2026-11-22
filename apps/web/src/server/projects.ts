import type { PipelineRun, PrismaClient, Project } from '@blueprint/db';
import {
  InvalidStateError,
  LEDGER_CATALOG,
  NotFoundError,
  type ProjectSummary,
  type ProjectView,
  type Run,
} from '@blueprint/core';

export function toProjectView(p: Project): ProjectView {
  return {
    id: p.id,
    name: p.name,
    mode: p.mode,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function toRunView(r: PipelineRun): Run {
  return {
    id: r.id,
    stage: r.stage,
    status: r.status,
    total: r.total,
    done: r.done,
    error: r.error,
    createdAt: r.createdAt.toISOString(),
    finishedAt: r.finishedAt ? r.finishedAt.toISOString() : null,
  };
}

/**
 * For a generate run, progress is the state of the documents themselves (finished out of all, `internal/`
 * excluded), so a retried run does not look like it restarted from zero.
 */
export async function withProgress(prisma: PrismaClient, run: PipelineRun | null): Promise<Run | null> {
  if (!run) return null;
  const view = toRunView(run);
  if (run.stage !== 'generate') return view;
  const where = { projectId: run.projectId, NOT: { path: { startsWith: 'internal/' } } };
  const [total, done] = await Promise.all([
    prisma.document.count({ where }),
    prisma.document.count({ where: { ...where, status: 'done' } }),
  ]);
  return total > 0 ? { ...view, total, done } : view;
}

/** Every /projects/:id/** handler starts here (docs/12). Missing and not-owned both give 404. */
export async function loadOwnedProject(prisma: PrismaClient, id: string, userId: string): Promise<Project> {
  const project = await prisma.project.findFirst({ where: { id, userId, deletedAt: null } });
  if (!project) throw new NotFoundError('Project not found.');
  return project;
}

export async function createProject(
  prisma: PrismaClient,
  userId: string,
  input: { name: string; mode?: 'founder' | 'expert' },
): Promise<ProjectView> {
  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: { userId, name: input.name.trim(), mode: input.mode ?? 'founder' },
    });
    await tx.decision.createMany({
      data: LEDGER_CATALOG.map((k) => ({ projectId: created.id, key: k.key, value: '', status: 'deferred' as const })),
    });
    return created;
  });
  return toProjectView(project);
}

export async function listProjects(prisma: PrismaClient, userId: string): Promise<ProjectSummary[]> {
  const projects = await prisma.project.findMany({
    where: { userId, deletedAt: null },
    orderBy: { updatedAt: 'desc' },
  });
  if (projects.length === 0) return [];
  const ids = projects.map((p) => p.id);
  const [docs, blockers] = await Promise.all([
    prisma.document.groupBy({
      by: ['projectId'],
      where: { projectId: { in: ids }, status: 'done', NOT: { path: { startsWith: 'internal/' } } },
      _count: { _all: true },
    }),
    prisma.gateFinding.groupBy({
      by: ['projectId'],
      where: { projectId: { in: ids }, severity: 'blocker', status: 'open' },
      _count: { _all: true },
    }),
  ]);
  const docMap = new Map(docs.map((d) => [d.projectId, d._count._all]));
  const blockMap = new Map(blockers.map((d) => [d.projectId, d._count._all]));
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    mode: p.mode,
    status: p.status,
    updatedAt: p.updatedAt.toISOString(),
    counts: { documents: docMap.get(p.id) ?? 0, openBlockers: blockMap.get(p.id) ?? 0 },
  }));
}

export async function getProject(prisma: PrismaClient, userId: string, id: string) {
  const project = await loadOwnedProject(prisma, id, userId);
  const [sources, facts, openQuestions, documents, openBlockers, latestRun] = await Promise.all([
    prisma.source.count({ where: { projectId: id } }),
    prisma.fact.count({ where: { projectId: id } }),
    prisma.question.count({ where: { projectId: id, status: 'open' } }),
    prisma.document.count({ where: { projectId: id, NOT: { path: { startsWith: 'internal/' } } } }),
    prisma.gateFinding.count({ where: { projectId: id, severity: 'blocker', status: 'open' } }),
    prisma.pipelineRun.findFirst({ where: { projectId: id }, orderBy: { createdAt: 'desc' } }),
  ]);
  return {
    project: toProjectView(project),
    counts: { sources, facts, openQuestions, documents, openBlockers },
    latestRun: await withProgress(prisma, latestRun),
  };
}

export async function renameOrSetMode(
  prisma: PrismaClient,
  userId: string,
  id: string,
  input: { name?: string; mode?: 'founder' | 'expert' },
): Promise<ProjectView> {
  const project = await loadOwnedProject(prisma, id, userId);
  if (input.mode !== undefined && input.mode !== project.mode) {
    if (project.status !== 'draft' && project.status !== 'interviewing') {
      throw new InvalidStateError(`The mode can only change while the project is draft or interviewing (it is "${project.status}").`);
    }
  }
  const updated = await prisma.project.update({
    where: { id: project.id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.mode !== undefined ? { mode: input.mode } : {}),
    },
  });
  return toProjectView(updated);
}

export async function softDelete(prisma: PrismaClient, userId: string, id: string): Promise<void> {
  const project = await loadOwnedProject(prisma, id, userId);
  await prisma.project.update({ where: { id: project.id }, data: { deletedAt: new Date() } });
}
