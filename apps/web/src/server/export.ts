import type { PrismaClient, Project } from '@blueprint/db';
import { buildZip, projectSlug, UnprocessableError, type Usage } from '@blueprint/core';

export async function exportPack(
  prisma: PrismaClient,
  project: Project,
): Promise<{ filename: string; bytes: Uint8Array }> {
  const openBlockers = await prisma.gateFinding.count({ where: { projectId: project.id, severity: 'blocker', status: 'open' } });
  const allowed = project.status === 'ready' || (project.status === 'blocked' && openBlockers === 0);
  if (!allowed) {
    throw new UnprocessableError('EXPORT_BLOCKED', 'The pack can be downloaded when the checks pass or every blocker is accepted.', { status: project.status, openBlockers });
  }
  const docs = await prisma.document.findMany({ where: { projectId: project.id, status: 'done' }, select: { path: true, content: true } });
  const bytes = await buildZip(project.name, docs);
  return { filename: `${projectSlug(project.name)}.zip`, bytes };
}

export async function getUsage(prisma: PrismaClient, projectId: string): Promise<Usage> {
  const rows = await prisma.usageEvent.findMany({ where: { projectId }, select: { tag: true, tokensIn: true, tokensOut: true, costUsd: true } });
  const total = { tokensIn: 0, tokensOut: 0, costUsd: 0 };
  const byTag: Usage['byTag'] = {};
  for (const r of rows) {
    const key = r.tag.includes(':') ? (r.tag.split(':')[0] as string) : r.tag;
    const cost = Number(r.costUsd);
    const t = (byTag[key] ??= { tokensIn: 0, tokensOut: 0, costUsd: 0, calls: 0 });
    t.tokensIn += r.tokensIn;
    t.tokensOut += r.tokensOut;
    t.costUsd += cost;
    t.calls += 1;
    total.tokensIn += r.tokensIn;
    total.tokensOut += r.tokensOut;
    total.costUsd += cost;
  }
  return { ...total, byTag };
}
