import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LEDGER_CATALOG, PACK_SPEC } from '@blueprint/core';
import { GET as estimate } from '@/app/api/v1/projects/[id]/estimate/route';
import { POST as generate } from '@/app/api/v1/projects/[id]/generate/route';
import { GET as documents } from '@/app/api/v1/projects/[id]/documents/route';
import { GET as docContent } from '@/app/api/v1/projects/[id]/documents/content/route';
import { PATCH as patchDecision } from '@/app/api/v1/projects/[id]/decisions/[key]/route';
import { enqueue } from '@/server/queue';
import { computeHashes } from '@blueprint/core';
import { createUserWithSession, ctx, makeReq, prisma, resetDb } from '../helpers';

vi.mock('@/server/queue', () => ({ enqueue: vi.fn(async () => undefined), getBoss: vi.fn() }));

beforeEach(async () => {
  await resetDb();
  vi.mocked(enqueue).mockClear();
});
afterAll(async () => {
  await prisma.$disconnect();
});

async function setup(fill = true) {
  const { userId, cookie } = await createUserWithSession();
  const project = await prisma.project.create({ data: { userId, name: 'P', status: 'ready_to_generate' } });
  await prisma.decision.createMany({
    data: LEDGER_CATALOG.map((k) => ({
      projectId: project.id,
      key: k.key,
      value: fill ? k.founderDefault || `Example for ${k.area}` : '',
      status: fill ? ('confirmed' as const) : ('deferred' as const),
    })),
  });
  return { cookie, id: project.id, userId };
}

describe('estimate and generate', () => {
  it('estimate returns positive numbers', async () => {
    const { cookie, id } = await setup();
    const body = await (await estimate(makeReq(`/api/v1/projects/${id}/estimate`, { cookie }), ctx({ id }))).json();
    expect(body.aiCalls).toBeGreaterThan(20);
    expect(body.tokens).toBeGreaterThan(100_000);
  });

  it('AC-08: an empty P0 key is 422 LEDGER_INCOMPLETE with the missing keys', async () => {
    const { cookie, id } = await setup(false);
    const res = await generate(makeReq(`/api/v1/projects/${id}/generate`, { method: 'POST', cookie }), ctx({ id }));
    expect(res.status).toBe(422);
    const err = (await res.json()).error;
    expect(err.code).toBe('LEDGER_INCOMPLETE');
    expect(err.details.some((d: { key: string; area: string }) => d.key === 'product.one_liner' && d.area === 'Product')).toBe(true);
    expect(await prisma.pipelineRun.count()).toBe(0);
  });

  it('creates a document per spec path, a run, moves to generating and enqueues the scheduler', async () => {
    const { cookie, id } = await setup();
    const res = await generate(makeReq(`/api/v1/projects/${id}/generate`, { method: 'POST', cookie }), ctx({ id }));
    expect(res.status).toBe(202);
    const { run } = await res.json();
    expect(run).toMatchObject({ stage: 'generate', total: PACK_SPEC.length });
    expect((await prisma.project.findUniqueOrThrow({ where: { id } })).status).toBe('generating');
    expect(await prisma.document.count({ where: { projectId: id, status: 'pending' } })).toBe(PACK_SPEC.length);
    expect(enqueue).toHaveBeenCalledWith('schedule-generation', { projectId: id, runId: run.id });
    const again = await generate(makeReq(`/api/v1/projects/${id}/generate`, { method: 'POST', cookie }), ctx({ id }));
    expect(again.status).toBe(409);
  });

  it('BUDGET_EXCEEDED when used tokens plus the estimate exceed the budget', async () => {
    const { cookie, id, userId } = await setup();
    await prisma.usageEvent.create({ data: { userId, projectId: id, tag: 't', model: 'm', tokensIn: 3_000_000, tokensOut: 0, costUsd: 0 } });
    const res = await generate(makeReq(`/api/v1/projects/${id}/generate`, { method: 'POST', cookie }), ctx({ id }));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe('BUDGET_EXCEEDED');
  });

  it('lists documents without internal/ and serves content by path', async () => {
    const { cookie, id } = await setup();
    await generate(makeReq(`/api/v1/projects/${id}/generate`, { method: 'POST', cookie }), ctx({ id }));
    await prisma.document.update({ where: { projectId_path: { projectId: id, path: 'docs/00-index.md' } }, data: { content: '# Index', status: 'done' } });
    const list = (await (await documents(makeReq(`/api/v1/projects/${id}/documents`, { cookie }), ctx({ id }))).json()).items as { path: string }[];
    expect(list.some((d) => d.path.startsWith('internal/'))).toBe(false);
    expect(list[0]?.path).toBe('docs/00-index.md');
    const one = await docContent(makeReq(`/api/v1/projects/${id}/documents/content?path=docs/00-index.md`, { cookie }), ctx({ id }));
    expect(await one.json()).toMatchObject({ path: 'docs/00-index.md', content: '# Index', status: 'done' });
    expect((await docContent(makeReq(`/api/v1/projects/${id}/documents/content?path=internal/task-plan.json`, { cookie }), ctx({ id }))).status).toBe(404);
    expect((await docContent(makeReq(`/api/v1/projects/${id}/documents/content`, { cookie }), ctx({ id }))).status).toBe(400);
  });

  it('AC-11: a PATCH of stack.backend marks exactly the dependent documents stale, and regenerate runs only those', async () => {
    const { cookie, id } = await setup();
    const rows = await prisma.decision.findMany({ where: { projectId: id }, select: { key: true, value: true, status: true } });
    const hashes = computeHashes(PACK_SPEC, rows);
    await prisma.document.createMany({
      data: PACK_SPEC.map((s) => ({ projectId: id, path: s.path, title: s.title, writer: s.writer, status: 'done' as const, content: '# x', inputsHash: hashes.get(s.path) ?? '' })),
    });
    await prisma.project.update({ where: { id }, data: { status: 'ready' } });
    const res = await patchDecision(
      makeReq(`/api/v1/projects/${id}/decisions/stack.backend`, { method: 'PATCH', cookie, body: { value: 'Express', status: 'confirmed' } }),
      ctx({ id, key: 'stack.backend' }),
    );
    const body = await res.json();
    const stale = body.staleDocuments as string[];
    expect(stale).toContain('docs/07-system-architecture.md');
    expect(stale).toContain('docs/08-technology-stack-and-adrs.md');
    expect(stale).not.toContain('docs/01-executive-summary.md');
    expect(body.project.status).toBe('stale');
    const staleCount = await prisma.document.count({ where: { projectId: id, status: 'stale' } });
    const regen = await generate(makeReq(`/api/v1/projects/${id}/generate`, { method: 'POST', cookie }), ctx({ id }));
    expect(regen.status).toBe(202);
    expect((await regen.json()).run.total).toBe(staleCount);
  });
});
