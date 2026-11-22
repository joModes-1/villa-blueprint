import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createMockClient, LEDGER_CATALOG, PACK_SPEC, type AiCall, type AiClient, type JobPayloads, type QueueName } from '@blueprint/core';
import { generateDoc } from '../src/jobs/generate-doc';
import { scheduleGeneration } from '../src/jobs/schedule-generation';
import { createRun } from '../src/runs';
import { makeCtx, prisma, resetDb } from './helpers';

beforeEach(async () => {
  await resetDb();
});
afterAll(async () => {
  await prisma.$disconnect();
});

export async function seedGenerating() {
  const user = await prisma.user.create({ data: { email: `g${Math.random()}@x.co`, name: 'U', passwordHash: 'x' } });
  const project = await prisma.project.create({ data: { userId: user.id, name: 'Notes App', status: 'generating' } });
  await prisma.decision.createMany({
    data: LEDGER_CATALOG.map((k) => ({
      projectId: project.id,
      key: k.key,
      value: k.founderDefault || `Example answer for ${k.area}`,
      status: k.priority === 'P0' ? ('confirmed' as const) : ('assumed' as const),
      rationale: 'test',
    })),
  });
  await prisma.document.createMany({
    data: PACK_SPEC.map((s) => ({ projectId: project.id, path: s.path, title: s.title, writer: s.writer, status: 'pending' as const })),
  });
  const run = await createRun(prisma, project.id, 'generate', PACK_SPEC.length);
  return { project, run };
}

type Job = { name: QueueName; data: JobPayloads[QueueName] };

/** Runs queued jobs in memory until none are left (no pg-boss polling). */
export async function drain(ctx: ReturnType<typeof makeCtx>, first: Job[]): Promise<Job[]> {
  const queue = [...first];
  const seen: Job[] = [];
  let guard = 0;
  ctx.enqueue.mockImplementation(async (name: QueueName, data: JobPayloads[QueueName]) => {
    queue.push({ name, data });
  });
  while (queue.length > 0) {
    if (guard++ > 500) throw new Error('queue did not drain');
    const job = queue.shift() as Job;
    seen.push(job);
    if (job.name === 'schedule-generation') await scheduleGeneration(ctx, job.data as JobPayloads['schedule-generation']);
    else if (job.name === 'generate-doc') await generateDoc(ctx, job.data as JobPayloads['generate-doc']);
  }
  return seen;
}

describe('generation loop (mock AI)', () => {
  it('produces every spec file and 8 task files, ends in gating and enqueues run-gates', async () => {
    const { project, run } = await seedGenerating();
    const ctx = makeCtx();
    const jobs = await drain(ctx, [{ name: 'schedule-generation', data: { projectId: project.id, runId: run.id } }]);
    const docs = await prisma.document.findMany({ where: { projectId: project.id } });
    expect(docs.filter((d) => d.status !== 'done')).toEqual([]);
    expect(docs).toHaveLength(PACK_SPEC.length + 8);
    expect(docs.filter((d) => d.path.startsWith('docs/build/tasks/'))).toHaveLength(8);
    expect(docs.every((d) => d.content.length > 0 && d.inputsHash.length === 64)).toBe(true);
    expect((await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).status).toBe('gating');
    const r = await prisma.pipelineRun.findUniqueOrThrow({ where: { id: run.id } });
    expect(r).toMatchObject({ status: 'succeeded' });
    expect(r.done).toBe(r.total);
    expect(jobs.filter((j) => j.name === 'run-gates')).toHaveLength(1);
    const start = docs.find((d) => d.path === 'START-HERE.md')?.content ?? '';
    expect(start).toContain('task-001');
    expect(docs.find((d) => d.path === 'docs/00-index.md')?.content).toContain('| Area | Confirmed decision |');
    expect(await prisma.usageEvent.count({ where: { projectId: project.id } })).toBeGreaterThan(20);
  });

  it('retries a document that omits a heading once, then succeeds', async () => {
    const { project, run } = await seedGenerating();
    const mock = createMockClient();
    let calls = 0;
    const ai: AiClient = {
      async complete(call: AiCall) {
        const res = await mock.complete(call);
        if (call.tag === 'doc:docs/01-executive-summary.md' && calls++ === 0) {
          return { ...res, text: res.text.replace('## Problem', '## Something else') };
        }
        return res;
      },
    };
    const ctx = makeCtx({ ai });
    await drain(ctx, [{ name: 'schedule-generation', data: { projectId: project.id, runId: run.id } }]);
    expect(calls).toBe(2);
    expect((await prisma.document.findFirstOrThrow({ where: { projectId: project.id, path: 'docs/01-executive-summary.md' } })).status).toBe('done');
    expect((await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).status).toBe('gating');
  });

  it('keeps a document with a missing heading after three tries, notes it, and lets the run finish (G01 reports it)', async () => {
    const { project, run } = await seedGenerating();
    const mock = createMockClient();
    const ai: AiClient = {
      async complete(call: AiCall) {
        const res = await mock.complete(call);
        if (call.tag === 'doc:docs/01-executive-summary.md') return { ...res, text: res.text.replace('## Problem', '## Other') };
        return res;
      },
    };
    const ctx = makeCtx({ ai });
    await drain(ctx, [{ name: 'schedule-generation', data: { projectId: project.id, runId: run.id } }]);
    const doc = await prisma.document.findFirstOrThrow({ where: { projectId: project.id, path: 'docs/01-executive-summary.md' } });
    expect(doc.status).toBe('done');
    expect(doc.error).toContain('## Problem');
    expect((await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).status).toBe('gating');
  });

  it('two schedulers at once enqueue each document only once', async () => {
    const { project, run } = await seedGenerating();
    const ctx = makeCtx();
    await Promise.all([
      scheduleGeneration(ctx, { projectId: project.id, runId: run.id }),
      scheduleGeneration(ctx, { projectId: project.id, runId: run.id }),
    ]);
    const ids = ctx.enqueue.mock.calls.filter((c) => c[0] === 'generate-doc').map((c) => (c[1] as { documentId: string }).documentId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(0);
  });

  it('a budget of 1 token fails the run with BUDGET_EXCEEDED', async () => {
    const { project, run } = await seedGenerating();
    await prisma.usageEvent.create({
      data: { userId: project.userId, projectId: project.id, tag: 'x', model: 'm', tokensIn: 5, tokensOut: 5, costUsd: 0 },
    });
    const ctx = makeCtx({ maxTokens: 1 });
    const { runJob } = await import('../src/jobs/wrap');
    await scheduleGeneration(ctx, { projectId: project.id, runId: run.id });
    const gen = ctx.enqueue.mock.calls.find((c) => c[0] === 'generate-doc');
    await runJob(ctx, 'generate-doc', { id: 'j', data: gen?.[1] as JobPayloads['generate-doc'] }, generateDoc);
    const r = await prisma.pipelineRun.findUniqueOrThrow({ where: { id: run.id } });
    expect(r.status).toBe('failed');
    expect(r.error).toContain('Token budget');
  });
});
