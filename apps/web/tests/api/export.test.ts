import JSZip from 'jszip';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PACK_SPEC } from '@blueprint/core';
import { GET as findings } from '@/app/api/v1/projects/[id]/findings/route';
import { POST as accept } from '@/app/api/v1/projects/[id]/findings/[fid]/accept/route';
import { GET as exportGet } from '@/app/api/v1/projects/[id]/export/route';
import { GET as usageGet } from '@/app/api/v1/projects/[id]/usage/route';
import { createUserWithSession, ctx, makeReq, prisma, resetDb } from '../helpers';

beforeEach(async () => {
  await resetDb();
});
afterAll(async () => {
  await prisma.$disconnect();
});

async function setup(status: 'blocked' | 'ready' = 'blocked') {
  const { userId, cookie } = await createUserWithSession();
  const project = await prisma.project.create({ data: { userId, name: 'My Notes App', status } });
  const taskPaths = ['docs/build/tasks/task-001-project-setup.md', 'docs/build/tasks/task-002-database.md'];
  await prisma.document.createMany({
    data: [
      ...PACK_SPEC.map((s) => ({ projectId: project.id, path: s.path, title: s.title, writer: s.writer, status: 'done' as const, content: `# ${s.title}` })),
      ...taskPaths.map((p) => ({ projectId: project.id, path: p, title: p, writer: 'code', status: 'done' as const, content: '# task' })),
    ],
  });
  return { userId, cookie, id: project.id };
}

describe('findings', () => {
  it('lists blockers first; accepting the last open blocker moves blocked to ready (AC-12)', async () => {
    const { cookie, id } = await setup();
    const w = await prisma.gateFinding.create({ data: { projectId: id, rule: 'G10', severity: 'warning', message: 'w' } });
    const b = await prisma.gateFinding.create({ data: { projectId: id, rule: 'G11', severity: 'blocker', documentPath: 'docs/08.md', message: 'b' } });
    const list = (await (await findings(makeReq(`/api/v1/projects/${id}/findings`, { cookie }), ctx({ id }))).json()).items as { id: string }[];
    expect(list.map((f) => f.id)).toEqual([b.id, w.id]);
    const bad = await accept(makeReq(`/api/v1/projects/${id}/findings/${b.id}/accept`, { method: 'POST', cookie, body: { reason: 'x' } }), ctx({ id, fid: b.id }));
    expect(bad.status).toBe(400);
    const ok = await accept(makeReq(`/api/v1/projects/${id}/findings/${b.id}/accept`, { method: 'POST', cookie, body: { reason: 'Known and fine' } }), ctx({ id, fid: b.id }));
    const body = await ok.json();
    expect(body.finding).toMatchObject({ status: 'accepted', acceptReason: 'Known and fine' });
    expect(body.project.status).toBe('ready');
    const missing = await accept(makeReq(`/api/v1/projects/${id}/findings/nope/accept`, { method: 'POST', cookie, body: { reason: 'abc' } }), ctx({ id, fid: 'nope' }));
    expect(missing.status).toBe(404);
  });
});

describe('export and usage', () => {
  it('is 422 EXPORT_BLOCKED while a blocker is open', async () => {
    const { cookie, id } = await setup();
    await prisma.gateFinding.create({ data: { projectId: id, rule: 'G11', severity: 'blocker', message: 'b' } });
    const res = await exportGet(makeReq(`/api/v1/projects/${id}/export`, { cookie }), ctx({ id }));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe('EXPORT_BLOCKED');
  });

  it('AC-10: a ready project downloads a zip with the full layout and no internal/', async () => {
    const { cookie, id } = await setup('ready');
    const res = await exportGet(makeReq(`/api/v1/projects/${id}/export`, { cookie }), ctx({ id }));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/zip');
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="my-notes-app.zip"');
    const zip = await JSZip.loadAsync(Buffer.from(await res.arrayBuffer()));
    const names = Object.keys(zip.files);
    expect(names.some((n) => n.includes('internal/'))).toBe(false);
    for (const n of ['START-HERE.md', 'AGENTS.md', 'CLAUDE.md', 'docs/build/TASKS_INDEX.md', 'docs/build/tasks/task-001-project-setup.md']) {
      expect(names).toContain(`my-notes-app/${n}`);
    }
    expect(names.filter((n) => /^my-notes-app\/docs\/\d{2}-/.test(n))).toHaveLength(27);
    expect(names.filter((n) => n.startsWith('my-notes-app/docs/build/') && !n.includes('/tasks/'))).toHaveLength(3);
  });

  it('a blocked project with every blocker accepted may export', async () => {
    const { cookie, id } = await setup();
    await prisma.gateFinding.create({ data: { projectId: id, rule: 'G11', severity: 'blocker', message: 'b', status: 'accepted', acceptReason: 'ok' } });
    expect((await exportGet(makeReq(`/api/v1/projects/${id}/export`, { cookie }), ctx({ id }))).status).toBe(200);
  });

  it('usage totals match the inserted events, grouped by tag prefix', async () => {
    const { userId, cookie, id } = await setup();
    const ev = (tag: string, i: number, o: number, c: number) => ({ userId, projectId: id, tag, model: 'm', tokensIn: i, tokensOut: o, costUsd: c });
    await prisma.usageEvent.createMany({ data: [ev('extract', 10, 5, 0.1), ev('doc:docs/01.md', 100, 50, 0.5), ev('doc:docs/02.md', 200, 70, 0.25)] });
    const body = await (await usageGet(makeReq(`/api/v1/projects/${id}/usage`, { cookie }), ctx({ id }))).json();
    expect(body).toMatchObject({ tokensIn: 310, tokensOut: 125 });
    expect(body.costUsd).toBeCloseTo(0.85);
    expect(body.byTag.doc).toMatchObject({ calls: 2, tokensIn: 300 });
    expect(body.byTag.extract.calls).toBe(1);
  });

  it('another user gets 404 for export, usage and findings', async () => {
    const { id } = await setup('ready');
    const other = await createUserWithSession('o@example.com');
    for (const h of [exportGet, usageGet, findings]) {
      expect((await h(makeReq(`/api/v1/projects/${id}/x`, { cookie: other.cookie }), ctx({ id }))).status).toBe(404);
    }
  });
});
