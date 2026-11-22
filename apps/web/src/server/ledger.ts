import { z } from 'zod';
import type { Prisma, PrismaClient, Project } from '@blueprint/db';
import {
  catalogByKey,
  computeHashes,
  DECISION_EDIT_STATUSES,
  InvalidStateError,
  LEDGER_CATALOG,
  specWithTaskFiles,
  transition,
  ValidationError,
  type DecisionView,
  type ProjectView,
} from '@blueprint/core';
import { toProjectView } from './projects';

export const patchDecisionSchema = z
  .object({
    value: z.string().max(2000),
    status: z.enum(['confirmed', 'assumed', 'deferred']),
  })
  .refine((v) => v.status === 'deferred' || v.value.trim() !== '', {
    message: 'A confirmed or assumed decision needs a value.',
    path: ['value'],
  });

export async function listDecisions(prisma: PrismaClient, project: Project): Promise<DecisionView[]> {
  const rows = await prisma.decision.findMany({ where: { projectId: project.id } });
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return LEDGER_CATALOG.map((k) => {
    const r = byKey.get(k.key);
    return {
      key: k.key,
      area: k.area,
      category: k.category,
      priority: k.priority,
      value: r?.value ?? '',
      status: r?.status ?? 'deferred',
      rationale: r?.rationale ?? '',
      version: r?.version ?? 0,
    };
  });
}

/** Recomputes every document's inputs hash and marks changed `done` documents stale (docs/29). */
export async function markStale(prisma: PrismaClient, tx: Prisma.TransactionClient, projectId: string): Promise<string[]> {
  void prisma;
  const docs = await tx.document.findMany({ where: { projectId }, select: { id: true, path: true, status: true, inputsHash: true } });
  if (docs.length === 0) return [];
  const ledger = await tx.decision.findMany({ where: { projectId }, select: { key: true, value: true, status: true } });
  const hashes = computeHashes(specWithTaskFiles(docs.map((d) => d.path)), ledger);
  const stale = docs.filter((d) => d.status === 'done' && d.inputsHash !== '' && hashes.get(d.path) !== d.inputsHash);
  if (stale.length > 0) {
    await tx.document.updateMany({ where: { id: { in: stale.map((d) => d.id) } }, data: { status: 'stale' } });
  }
  return stale.map((d) => d.path).filter((p) => !p.startsWith('internal/'));
}

export async function patchDecision(
  prisma: PrismaClient,
  project: Project,
  key: string,
  input: z.infer<typeof patchDecisionSchema>,
): Promise<{ decision: DecisionView; staleDocuments: string[]; project: ProjectView }> {
  const spec = catalogByKey(key);
  if (!spec) throw new ValidationError('Unknown decision key.', [{ field: 'key', message: `"${key}" is not a decision key.` }]);
  if (!DECISION_EDIT_STATUSES.includes(project.status)) {
    throw new InvalidStateError(`Decisions cannot be edited while the project is "${project.status}".`);
  }
  return prisma.$transaction(async (tx) => {
    const row = await tx.decision.findUnique({ where: { projectId_key: { projectId: project.id, key } } });
    const updated = await tx.decision.upsert({
      where: { projectId_key: { projectId: project.id, key } },
      create: { projectId: project.id, key, value: input.value.trim(), status: input.status, rationale: 'Edited by the user', sourceRefs: { edited: true }, version: 1 },
      update: {
        value: input.value.trim(),
        status: input.status,
        rationale: 'Edited by the user',
        sourceRefs: { edited: true } as Prisma.InputJsonObject,
        version: (row?.version ?? 0) + 1,
      },
    });
    const staleDocuments = await markStale(prisma, tx, project.id);
    let next = project;
    if (staleDocuments.length > 0 && (project.status === 'ready' || project.status === 'blocked')) {
      next = await tx.project.update({ where: { id: project.id }, data: { status: transition(project.status, 'ledger_edit_stale') } });
    }
    return {
      decision: {
        key,
        area: spec.area,
        category: spec.category,
        priority: spec.priority,
        value: updated.value,
        status: updated.status,
        rationale: updated.rationale,
        version: updated.version,
      },
      staleDocuments,
      project: toProjectView(next),
    };
  });
}
