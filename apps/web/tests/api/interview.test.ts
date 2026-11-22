import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LEDGER_CATALOG } from '@blueprint/core';
import { GET as facts } from '@/app/api/v1/projects/[id]/facts/route';
import { GET as questions } from '@/app/api/v1/projects/[id]/questions/route';
import { POST as answer } from '@/app/api/v1/projects/[id]/questions/[qid]/answer/route';
import { POST as skip } from '@/app/api/v1/projects/[id]/questions/[qid]/skip/route';
import { POST as accept } from '@/app/api/v1/projects/[id]/questions/accept-recommended/route';
import { GET as decisions } from '@/app/api/v1/projects/[id]/decisions/route';
import { PATCH as patchDecision } from '@/app/api/v1/projects/[id]/decisions/[key]/route';
import { createUserWithSession, ctx, makeReq, prisma, resetDb } from '../helpers';

vi.mock('@/server/queue', () => ({ enqueue: vi.fn(async () => undefined), getBoss: vi.fn() }));

beforeEach(async () => {
  await resetDb();
});
afterAll(async () => {
  await prisma.$disconnect();
});

async function interviewing(mode: 'founder' | 'expert' = 'founder') {
  const { userId, cookie } = await createUserWithSession();
  const project = await prisma.project.create({ data: { userId, name: 'P', mode, status: 'interviewing' } });
  await prisma.decision.createMany({ data: LEDGER_CATALOG.map((k) => ({ projectId: project.id, key: k.key })) });
  const p0 = LEDGER_CATALOG.filter((k) => k.priority === 'P0');
  await prisma.question.createMany({
    data: p0.map((k) => {
      const def = k.founderDefault || `Example answer for ${k.area}`;
      return { projectId: project.id, key: k.key, prompt: k.question, why: 'w', options: [def, `Alt ${k.area}`], recommended: def };
    }),
  });
  return { cookie, id: project.id };
}

const post = (path: string, cookie: string, body?: unknown) => makeReq(path, { method: 'POST', cookie, body });

describe('interview', () => {
  it('lists facts and questions with the catalog area', async () => {
    const { cookie, id } = await interviewing();
    const q = await questions(makeReq(`/api/v1/projects/${id}/questions`, { cookie }), ctx({ id }));
    const items = (await q.json()).items as { area: string; options: string[]; status: string }[];
    expect(items.length).toBeGreaterThan(10);
    expect(items[0]?.area).toBeTruthy();
    expect(Array.isArray(items[0]?.options)).toBe(true);
    const f = await facts(makeReq(`/api/v1/projects/${id}/facts`, { cookie }), ctx({ id }));
    expect((await f.json()).items).toEqual([]);
  });

  it('answering one question confirms its decision with the question id', async () => {
    const { cookie, id } = await interviewing();
    const q = await prisma.question.findFirstOrThrow({ where: { projectId: id, key: 'stack.backend' } });
    const res = await answer(post(`/api/v1/projects/${id}/questions/${q.id}/answer`, cookie, { answer: '  Express  ' }), ctx({ id, qid: q.id }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.question.status).toBe('answered');
    expect(body.project.status).toBe('interviewing');
    const d = await prisma.decision.findUniqueOrThrow({ where: { projectId_key: { projectId: id, key: 'stack.backend' } } });
    expect(d).toMatchObject({ value: 'Express', status: 'confirmed', rationale: 'Answered by the user', version: 1 });
    expect(d.sourceRefs).toEqual({ questionId: q.id });
  });

  it('validates the answer and 404s a foreign question id', async () => {
    const { cookie, id } = await interviewing();
    const q = await prisma.question.findFirstOrThrow({ where: { projectId: id } });
    const bad = await answer(post(`/api/v1/projects/${id}/questions/${q.id}/answer`, cookie, { answer: '' }), ctx({ id, qid: q.id }));
    expect(bad.status).toBe(400);
    const missing = await skip(post(`/api/v1/projects/${id}/questions/nope/skip`, cookie), ctx({ id, qid: 'nope' }));
    expect(missing.status).toBe(404);
  });

  it('AC-07: accept-recommended answers everything, assumes P1 keys and reaches ready_to_generate', async () => {
    const { cookie, id } = await interviewing();
    const res = await accept(post(`/api/v1/projects/${id}/questions/accept-recommended`, cookie), ctx({ id }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.answered).toBe(LEDGER_CATALOG.filter((k) => k.priority === 'P0').length);
    expect(body.project.status).toBe('ready_to_generate');
    const p1 = await prisma.decision.findUniqueOrThrow({ where: { projectId_key: { projectId: id, key: 'product.success' } } });
    expect(p1).toMatchObject({ status: 'assumed', rationale: 'Founder-mode default' });
    const dec = await decisions(makeReq(`/api/v1/projects/${id}/decisions`, { cookie }), ctx({ id }));
    const items = (await dec.json()).items as { key: string; priority: string; value: string }[];
    expect(items.map((i) => i.key)).toEqual(LEDGER_CATALOG.map((k) => k.key));
    expect(items.filter((i) => i.priority === 'P0' && i.value === '')).toEqual([]);
  });

  it('skipping the last open question finishes the interview', async () => {
    const { cookie, id } = await interviewing();
    const open = await prisma.question.findMany({ where: { projectId: id } });
    const last = open.pop()!;
    await prisma.question.updateMany({ where: { id: { in: open.map((q) => q.id) } }, data: { status: 'answered' } });
    const res = await skip(post(`/api/v1/projects/${id}/questions/${last.id}/skip`, cookie), ctx({ id, qid: last.id }));
    expect((await res.json()).project.status).toBe('ready_to_generate');
  });

  it('is 409 when the project is not interviewing', async () => {
    const { cookie, id } = await interviewing();
    await prisma.project.update({ where: { id }, data: { status: 'draft' } });
    const res = await accept(post(`/api/v1/projects/${id}/questions/accept-recommended`, cookie), ctx({ id }));
    expect(res.status).toBe(409);
  });
});

describe('PATCH decisions', () => {
  const patch = (id: string, cookie: string, key: string, body: unknown) =>
    patchDecision(makeReq(`/api/v1/projects/${id}/decisions/${key}`, { method: 'PATCH', cookie, body }), ctx({ id, key }));

  it('rejects an unknown key (400) and a confirmed decision without a value', async () => {
    const { cookie, id } = await interviewing();
    expect((await patch(id, cookie, 'nope.key', { value: 'x', status: 'confirmed' })).status).toBe(400);
    expect((await patch(id, cookie, 'stack.backend', { value: '', status: 'confirmed' })).status).toBe(400);
  });

  it('saves the value, bumps the version and returns no stale documents before generation', async () => {
    const { cookie, id } = await interviewing();
    const res = await patch(id, cookie, 'stack.backend', { value: 'Fastify', status: 'confirmed' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.staleDocuments).toEqual([]);
    expect(body.decision).toMatchObject({ key: 'stack.backend', value: 'Fastify', version: 1, area: 'Backend' });
    const again = await (await patch(id, cookie, 'stack.backend', { value: 'Hono', status: 'assumed' })).json();
    expect(again.decision.version).toBe(2);
  });

  it('is refused while processing', async () => {
    const { cookie, id } = await interviewing();
    await prisma.project.update({ where: { id }, data: { status: 'processing' } });
    expect((await patch(id, cookie, 'stack.backend', { value: 'x', status: 'confirmed' })).status).toBe(409);
  });
});
