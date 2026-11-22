import { z } from 'zod';
import type { GateFinding as FindingRow, PrismaClient, Project } from '@blueprint/db';
import { NotFoundError, transition, type GateFinding, type ProjectView } from '@blueprint/core';
import { toProjectView } from './projects';

export const acceptSchema = z.object({ reason: z.string().trim().min(3, 'Give a reason of at least 3 characters.').max(500) });

function toView(f: FindingRow): GateFinding {
  return {
    id: f.id,
    rule: f.rule,
    severity: f.severity,
    documentPath: f.documentPath,
    message: f.message,
    status: f.status,
    acceptReason: f.acceptReason,
  };
}

export async function listFindings(prisma: PrismaClient, project: Project): Promise<GateFinding[]> {
  const rows = await prisma.gateFinding.findMany({ where: { projectId: project.id }, orderBy: [{ createdAt: 'asc' }] });
  const sev = { blocker: 0, warning: 1 } as const;
  return rows.sort((a, b) => sev[a.severity] - sev[b.severity] || a.rule.localeCompare(b.rule)).map(toView);
}

export async function acceptFinding(
  prisma: PrismaClient,
  project: Project,
  findingId: string,
  reason: string,
): Promise<{ finding: GateFinding; project: ProjectView }> {
  return prisma.$transaction(async (tx) => {
    const found = await tx.gateFinding.findFirst({ where: { id: findingId, projectId: project.id } });
    if (!found) throw new NotFoundError('Finding not found.');
    const finding = await tx.gateFinding.update({ where: { id: found.id }, data: { status: 'accepted', acceptReason: reason } });
    const open = await tx.gateFinding.count({ where: { projectId: project.id, severity: 'blocker', status: 'open' } });
    let current = await tx.project.findUniqueOrThrow({ where: { id: project.id } });
    if (open === 0 && current.status === 'blocked') {
      current = await tx.project.update({ where: { id: project.id }, data: { status: transition(current.status, 'blockers_accepted') } });
    }
    return { finding: toView(finding), project: toProjectView(current) };
  });
}
