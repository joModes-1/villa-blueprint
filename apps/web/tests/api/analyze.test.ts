import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as analyze } from '@/app/api/v1/projects/[id]/analyze/route';
import { GET as latest } from '@/app/api/v1/projects/[id]/runs/latest/route';
import { POST as retry } from '@/app/api/v1/projects/[id]/retry/route';
import { enqueue } from '@/server/queue';
import { createUserWithSession, ctx, makeReq, prisma, resetDb } from '../helpers';

vi.mock('@/server/queue', () => ({ enqueue: vi.fn(async () => undefined), getBoss: vi.fn() }));

beforeEach(async () => {
  await resetDb();
  vi.mocked(enqueue).mockClear();
});
afterAll(async () => {
  await prisma.$disconnect();
});

async function setup() {
  const { userId, cookie } = await createUserWithSession();
  const project = await prisma.project.create({ data: { userId, name: 'P' } });
  return { cookie, id: project.id };
}

describe('analyze, runs/latest and retry', () => {
  it('analyze with 0 sources is 409', async () => {
    const { cookie, id } = await setup();
    const res = await analyze(makeReq(`/api/v1/projects/${id}/analyze`, { method: 'POST', cookie }), ctx({ id }));
    expect(res.status).toBe(409);
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('analyze returns 202 with a run, moves to processing and enqueues one job per pending source', async () => {
    const { cookie, id } = await setup();
    await prisma.source.createMany({
      data: [
        { projectId: id, kind: 'text', title: 'a', text: 'x' },
        { projectId: id, kind: 'text', title: 'b', text: 'y' },
        { projectId: id, kind: 'text', title: 'c', text: 'z', status: 'parsed' },
      ],
    });
    const res = await analyze(makeReq(`/api/v1/projects/${id}/analyze`, { method: 'POST', cookie }), ctx({ id }));
    expect(res.status).toBe(202);
    const { run } = await res.json();
    expect(run).toMatchObject({ stage: 'process', status: 'running', total: 2, done: 0 });
    expect((await prisma.project.findUniqueOrThrow({ where: { id } })).status).toBe('processing');
    expect(enqueue).toHaveBeenCalledTimes(2);
    const l = await latest(makeReq(`/api/v1/projects/${id}/runs/latest`, { cookie }), ctx({ id }));
    expect((await l.json()).run.id).toBe(run.id);
    const again = await analyze(makeReq(`/api/v1/projects/${id}/analyze`, { method: 'POST', cookie }), ctx({ id }));
    expect(again.status).toBe(409);
  });

  it('runs/latest is null with no runs', async () => {
    const { cookie, id } = await setup();
    const l = await latest(makeReq(`/api/v1/projects/${id}/runs/latest`, { cookie }), ctx({ id }));
    expect((await l.json()).run).toBeNull();
  });

  it('retry re-enqueues failed sources of a failed process run', async () => {
    const { cookie, id } = await setup();
    await prisma.source.create({ data: { projectId: id, kind: 'pdf', title: 'bad', status: 'failed', error: 'PARSE_FAILED' } });
    await prisma.pipelineRun.create({ data: { projectId: id, stage: 'process', status: 'failed', total: 1, error: 'x' } });
    await prisma.project.update({ where: { id }, data: { status: 'failed' } });
    const res = await retry(makeReq(`/api/v1/projects/${id}/retry`, { method: 'POST', cookie }), ctx({ id }));
    expect(res.status).toBe(202);
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect((await prisma.project.findUniqueOrThrow({ where: { id } })).status).toBe('processing');
    expect((await prisma.source.findFirstOrThrow({ where: { projectId: id } })).status).toBe('pending');
  });

  it('retry is 409 when nothing failed', async () => {
    const { cookie, id } = await setup();
    const res = await retry(makeReq(`/api/v1/projects/${id}/retry`, { method: 'POST', cookie }), ctx({ id }));
    expect(res.status).toBe(409);
  });

  it('another user gets 404', async () => {
    const { id } = await setup();
    const other = await createUserWithSession('o@example.com');
    const res = await analyze(makeReq(`/api/v1/projects/${id}/analyze`, { method: 'POST', cookie: other.cookie }), ctx({ id }));
    expect(res.status).toBe(404);
  });
});
