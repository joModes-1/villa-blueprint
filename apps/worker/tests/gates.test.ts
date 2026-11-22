import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { runGatesJob } from '../src/jobs/run-gates';
import { makeCtx, prisma, resetDb } from './helpers';
import { drain, seedGenerating } from './generation.test';

beforeEach(async () => {
  await resetDb();
});
afterAll(async () => {
  await prisma.$disconnect();
});

async function generated() {
  const { project, run } = await seedGenerating();
  const ctx = makeCtx();
  const jobs = await drain(ctx, [{ name: 'schedule-generation', data: { projectId: project.id, runId: run.id } }]);
  const gate = jobs.find((j) => j.name === 'run-gates')!.data as { projectId: string; runId: string };
  return { project, ctx, gate };
}

describe('run-gates', () => {
  it('AC-09: the full mock flow ends ready with 0 blockers', async () => {
    const { project, ctx, gate } = await generated();
    await runGatesJob(ctx, gate);
    expect((await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).status).toBe('ready');
    expect(await prisma.gateFinding.count({ where: { projectId: project.id, severity: 'blocker' } })).toBe(0);
    expect((await prisma.pipelineRun.findUniqueOrThrow({ where: { id: gate.runId } })).status).toBe('succeeded');
    expect(await prisma.usageEvent.count({ where: { projectId: project.id, tag: 'contradictions' } })).toBeGreaterThan(0);
  });

  it('the contradiction test: Clerk vs the ledger plus MOCK_CONTRADICTION blocks on 08', async () => {
    const { project, ctx, gate } = await generated();
    const path = 'docs/08-technology-stack-and-adrs.md';
    const row = await prisma.document.findUniqueOrThrow({ where: { projectId_path: { projectId: project.id, path } } });
    await prisma.document.update({
      where: { id: row.id },
      data: { content: `${row.content}\n\nADR-005: authentication is handled by Clerk. MOCK_CONTRADICTION` },
    });
    await runGatesJob(ctx, gate);
    expect((await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).status).toBe('blocked');
    const f = await prisma.gateFinding.findFirstOrThrow({ where: { projectId: project.id, rule: 'G11' } });
    expect(f).toMatchObject({ severity: 'blocker', documentPath: path, status: 'open' });
  });

  it('re-running keeps previously accepted findings accepted, and moves a blocked project on', async () => {
    const { project, ctx, gate } = await generated();
    const path = 'docs/08-technology-stack-and-adrs.md';
    const row = await prisma.document.findUniqueOrThrow({ where: { projectId_path: { projectId: project.id, path } } });
    await prisma.document.update({ where: { id: row.id }, data: { content: `${row.content}\nMOCK_CONTRADICTION` } });
    await runGatesJob(ctx, gate);
    await prisma.gateFinding.updateMany({ where: { projectId: project.id }, data: { status: 'accepted', acceptReason: 'known' } });
    await prisma.project.update({ where: { id: project.id }, data: { status: 'gating' } });
    await runGatesJob(ctx, gate);
    const again = await prisma.gateFinding.findFirstOrThrow({ where: { projectId: project.id, rule: 'G11' } });
    expect(again).toMatchObject({ status: 'accepted', acceptReason: 'known' });
    expect((await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).status).toBe('ready');
  });
});
