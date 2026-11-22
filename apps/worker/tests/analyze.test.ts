import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { LEDGER_CATALOG } from '@blueprint/core';
import { analyzeProject } from '../src/jobs/analyze-project';
import { processSource } from '../src/jobs/process-source';
import { createRun } from '../src/runs';
import { makeCtx, prisma, resetDb } from './helpers';

beforeEach(async () => {
  await resetDb();
});
afterAll(async () => {
  await prisma.$disconnect();
});

async function seedProcessed(mode: 'founder' | 'expert' = 'founder') {
  const user = await prisma.user.create({ data: { email: `a${Math.random()}@x.co`, name: 'U', passwordHash: 'x' } });
  const project = await prisma.project.create({ data: { userId: user.id, name: 'P', mode, status: 'processing' } });
  await prisma.decision.createMany({ data: LEDGER_CATALOG.map((k) => ({ projectId: project.id, key: k.key })) });
  const s = await prisma.source.create({
    data: { projectId: project.id, kind: 'text', title: 'Idea', text: 'A notes app for small teams. People share notes. Admins manage members.' },
  });
  const ctx = makeCtx();
  const run = await createRun(prisma, project.id, 'process', 1);
  await processSource(ctx, { sourceId: s.id, runId: run.id });
  const analyzeCall = ctx.enqueue.mock.calls.find((c) => c[0] === 'analyze-project');
  return { ctx, project, runId: (analyzeCall?.[1] as { runId: string }).runId };
}

describe('analyze-project', () => {
  it('confirms product.one_liner from a cited fact and asks every other P0 key', async () => {
    const { ctx, project, runId } = await seedProcessed();
    await analyzeProject(ctx, { projectId: project.id, runId });
    expect((await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).status).toBe('interviewing');
    const one = await prisma.decision.findUniqueOrThrow({ where: { projectId_key: { projectId: project.id, key: 'product.one_liner' } } });
    expect(one).toMatchObject({ status: 'confirmed', rationale: 'From sources', version: 1 });
    const refs = one.sourceRefs as { factIds: string[] };
    expect(await prisma.fact.count({ where: { id: { in: refs.factIds } } })).toBe(1);
    const open = await prisma.question.findMany({ where: { projectId: project.id, status: 'open' } });
    const p0 = LEDGER_CATALOG.filter((k) => k.priority === 'P0' && k.key !== 'product.one_liner');
    expect(open.map((q) => q.key).sort()).toEqual(p0.map((k) => k.key).sort());
    expect((await prisma.pipelineRun.findUniqueOrThrow({ where: { id: runId } })).status).toBe('succeeded');
    expect(await prisma.usageEvent.count({ where: { projectId: project.id, tag: 'analyze' } })).toBe(1);
  });

  it('re-running analyze never overwrites a user answer (BR-05)', async () => {
    const { ctx, project, runId } = await seedProcessed();
    await analyzeProject(ctx, { projectId: project.id, runId });
    await prisma.decision.update({
      where: { projectId_key: { projectId: project.id, key: 'product.one_liner' } },
      data: { value: 'My own words', status: 'confirmed', sourceRefs: { questionId: 'q-1' } },
    });
    await prisma.project.update({ where: { id: project.id }, data: { status: 'processing' } });
    const run2 = await createRun(prisma, project.id, 'analyze', 1);
    await analyzeProject(ctx, { projectId: project.id, runId: run2.id });
    const row = await prisma.decision.findUniqueOrThrow({ where: { projectId_key: { projectId: project.id, key: 'product.one_liner' } } });
    expect(row.value).toBe('My own words');
    // The open questions were replaced, not duplicated.
    const keys = (await prisma.question.findMany({ where: { projectId: project.id, status: 'open' } })).map((q) => q.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
