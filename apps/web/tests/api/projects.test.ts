import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LEDGER_CATALOG } from '@blueprint/core';
import { GET as listGet, POST as listPost } from '@/app/api/v1/projects/route';
import { DELETE as projDelete, GET as projGet, PATCH as projPatch } from '@/app/api/v1/projects/[id]/route';
import { GET as srcList, POST as srcPost } from '@/app/api/v1/projects/[id]/sources/route';
import { DELETE as srcDelete } from '@/app/api/v1/projects/[id]/sources/[sourceId]/route';
import { createUserWithSession, ctx, makeReq, prisma, resetDb } from '../helpers';

vi.mock('@/server/queue', () => ({ enqueue: vi.fn(async () => undefined), getBoss: vi.fn() }));

beforeEach(async () => {
  await resetDb();
});
afterAll(async () => {
  await prisma.$disconnect();
});

async function newProject(cookie: string, name = 'Notes App'): Promise<string> {
  const res = await listPost(makeReq('/api/v1/projects', { method: 'POST', cookie, body: { name } }));
  expect(res.status).toBe(201);
  return (await res.json()).project.id as string;
}

describe('projects', () => {
  it('requires authentication', async () => {
    expect((await listGet(makeReq('/api/v1/projects'))).status).toBe(401);
    expect((await listPost(makeReq('/api/v1/projects', { method: 'POST', body: { name: 'x' } }))).status).toBe(401);
  });

  it('creates exactly one decision per catalog key', async () => {
    const { cookie } = await createUserWithSession();
    const id = await newProject(cookie);
    const rows = await prisma.decision.findMany({ where: { projectId: id } });
    expect(rows).toHaveLength(LEDGER_CATALOG.length);
    expect(new Set(rows.map((r) => r.key))).toEqual(new Set(LEDGER_CATALOG.map((k) => k.key)));
    expect(rows.every((r) => r.status === 'deferred' && r.value === '')).toBe(true);
  });

  it('validates the name', async () => {
    const { cookie } = await createUserWithSession();
    const res = await listPost(makeReq('/api/v1/projects', { method: 'POST', cookie, body: { name: '   ' } }));
    expect(res.status).toBe(400);
  });

  it('lists only your own projects, newest first', async () => {
    const a = await createUserWithSession('a@example.com');
    const b = await createUserWithSession('b@example.com');
    await newProject(a.cookie, 'A1');
    await newProject(a.cookie, 'A2');
    await newProject(b.cookie, 'B1');
    const res = await listGet(makeReq('/api/v1/projects', { cookie: a.cookie }));
    const items = (await res.json()).items as { name: string; counts: { documents: number } }[];
    expect(items.map((i) => i.name)).toEqual(['A2', 'A1']);
    expect(items[0]?.counts).toEqual({ documents: 0, openBlockers: 0 });
  });

  it('returns counts and the latest run on GET', async () => {
    const { cookie } = await createUserWithSession();
    const id = await newProject(cookie);
    const res = await projGet(makeReq(`/api/v1/projects/${id}`, { cookie }), ctx({ id }));
    const body = await res.json();
    expect(body.project.status).toBe('draft');
    expect(body.counts).toEqual({ sources: 0, facts: 0, openQuestions: 0, documents: 0, openBlockers: 0 });
    expect(body.latestRun).toBeNull();
  });

  it('PATCH renames, and only allows a mode change in draft or interviewing', async () => {
    const { cookie } = await createUserWithSession();
    const id = await newProject(cookie);
    const ok = await projPatch(makeReq(`/api/v1/projects/${id}`, { method: 'PATCH', cookie, body: { name: 'Renamed', mode: 'expert' } }), ctx({ id }));
    expect(ok.status).toBe(200);
    expect((await ok.json()).project).toMatchObject({ name: 'Renamed', mode: 'expert' });
    await prisma.project.update({ where: { id }, data: { status: 'ready' } });
    const bad = await projPatch(makeReq(`/api/v1/projects/${id}`, { method: 'PATCH', cookie, body: { mode: 'founder' } }), ctx({ id }));
    expect(bad.status).toBe(409);
    expect((await bad.json()).error.code).toBe('INVALID_STATE');
    const empty = await projPatch(makeReq(`/api/v1/projects/${id}`, { method: 'PATCH', cookie, body: {} }), ctx({ id }));
    expect(empty.status).toBe(400);
  });

  it('DELETE soft-deletes; the project then disappears', async () => {
    const { cookie } = await createUserWithSession();
    const id = await newProject(cookie);
    const res = await projDelete(makeReq(`/api/v1/projects/${id}`, { method: 'DELETE', cookie }), ctx({ id }));
    expect(res.status).toBe(204);
    expect((await prisma.project.findUnique({ where: { id } }))?.deletedAt).not.toBeNull();
    expect((await projGet(makeReq(`/api/v1/projects/${id}`, { cookie }), ctx({ id }))).status).toBe(404);
  });

  it('AC-03: another user gets 404 on every project route, and nothing changes', async () => {
    const a = await createUserWithSession('a@example.com');
    const b = await createUserWithSession('b@example.com');
    const id = await newProject(a.cookie);
    const c = ctx({ id });
    const statuses = [
      (await projGet(makeReq(`/api/v1/projects/${id}`, { cookie: b.cookie }), c)).status,
      (await projPatch(makeReq(`/api/v1/projects/${id}`, { method: 'PATCH', cookie: b.cookie, body: { name: 'x' } }), c)).status,
      (await projDelete(makeReq(`/api/v1/projects/${id}`, { method: 'DELETE', cookie: b.cookie }), c)).status,
      (await srcList(makeReq(`/api/v1/projects/${id}/sources`, { cookie: b.cookie }), c)).status,
      (await srcPost(makeReq(`/api/v1/projects/${id}/sources`, { method: 'POST', cookie: b.cookie, body: { kind: 'text', title: 't', text: 'hello' } }), c)).status,
      (await srcDelete(makeReq(`/api/v1/projects/${id}/sources/x`, { method: 'DELETE', cookie: b.cookie }), ctx({ id, sourceId: 'x' }))).status,
    ];
    expect(statuses).toEqual([404, 404, 404, 404, 404, 404]);
    const p = await prisma.project.findUnique({ where: { id } });
    expect(p?.name).toBe('Notes App');
    expect(p?.deletedAt).toBeNull();
    expect(await prisma.source.count()).toBe(0);
  });
});

describe('sources', () => {
  const addText = (cookie: string, id: string, text = 'A notes app for small teams.') =>
    srcPost(makeReq(`/api/v1/projects/${id}/sources`, { method: 'POST', cookie, body: { kind: 'text', title: 'Idea', text } }), ctx({ id }));

  function multipart(id: string, cookie: string, file: File, title?: string): Request {
    const form = new FormData();
    form.set('file', file);
    if (title) form.set('title', title);
    const req = new Request(`http://localhost:3000/api/v1/projects/${id}/sources`, {
      method: 'POST',
      headers: { origin: process.env.APP_URL ?? 'http://localhost:3000', cookie },
      body: form,
    });
    return req;
  }

  it('adds a pasted text source as pending, with a preview', async () => {
    const { cookie } = await createUserWithSession();
    const id = await newProject(cookie);
    const res = await addText(cookie, id, 'x'.repeat(900));
    expect(res.status).toBe(201);
    const { source } = await res.json();
    expect(source).toMatchObject({ kind: 'text', status: 'pending', title: 'Idea' });
    expect(source.preview).toHaveLength(500);
    expect(source.raw).toBeUndefined();
    const list = await (await srcList(makeReq(`/api/v1/projects/${id}/sources`, { cookie }), ctx({ id }))).json();
    expect(list.items).toHaveLength(1);
  });

  it('adds .md (as markdown), .pdf, and a .json chat export via multipart', async () => {
    const { cookie } = await createUserWithSession();
    const id = await newProject(cookie);
    const md = await srcPost(multipart(id, cookie, new File(['# Title\r\nBody'], 'notes.md', { type: 'text/markdown' })), ctx({ id }));
    expect(md.status).toBe(201);
    expect((await md.json()).source).toMatchObject({ kind: 'markdown', originalName: 'notes.md', title: 'notes.md' });
    const pdf = await srcPost(multipart(id, cookie, new File([new Uint8Array([37, 80, 68, 70])], 'spec.pdf'), 'The spec'), ctx({ id }));
    expect((await pdf.json()).source).toMatchObject({ kind: 'pdf', title: 'The spec' });
    const json = await srcPost(multipart(id, cookie, new File(['[]'], 'conversations.json')), ctx({ id }));
    expect((await json.json()).source.kind).toBe('chat_export');
    const rows = await prisma.source.findMany({ where: { projectId: id }, orderBy: { createdAt: 'asc' } });
    expect(rows[0]?.raw).toBeNull(); // plain text is stored as text
    expect(rows[0]?.text).toBe('# Title\nBody');
    expect(rows[1]?.raw?.length).toBe(4); // binary kinds keep raw bytes until parsed
  });

  it('rejects an unsupported extension with 400', async () => {
    const { cookie } = await createUserWithSession();
    const id = await newProject(cookie);
    const res = await srcPost(multipart(id, cookie, new File(['x'], 'photo.png')), ctx({ id }));
    expect(res.status).toBe(400);
    expect(JSON.stringify((await res.json()).error)).toContain('Unsupported file type');
  });

  it('rejects a file over 10 MB with 413, and a Content-Length over the cap before reading', async () => {
    const { cookie } = await createUserWithSession();
    const id = await newProject(cookie);
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.pdf');
    const res = await srcPost(multipart(id, cookie, big), ctx({ id }));
    expect(res.status).toBe(413);
    expect((await res.json()).error.code).toBe('FILE_TOO_LARGE');
    const early = new Request(`http://localhost:3000/api/v1/projects/${id}/sources`, {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', cookie, 'content-type': 'multipart/form-data; boundary=x', 'content-length': String(50 * 1024 * 1024) },
      body: 'x',
    });
    expect((await srcPost(early, ctx({ id }))).status).toBe(413);
    expect(await prisma.source.count()).toBe(0);
  });

  it('AC-05: the 21st source returns 422 SOURCE_LIMIT', async () => {
    const { cookie } = await createUserWithSession();
    const id = await newProject(cookie);
    await prisma.source.createMany({
      data: Array.from({ length: 20 }, (_, i) => ({ projectId: id, kind: 'text' as const, title: `s${i}`, text: 'x' })),
    });
    const res = await addText(cookie, id);
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe('SOURCE_LIMIT');
  });

  it('refuses to add or delete sources while generating (409 INVALID_STATE)', async () => {
    const { cookie } = await createUserWithSession();
    const id = await newProject(cookie);
    const created = await (await addText(cookie, id)).json();
    await prisma.project.update({ where: { id }, data: { status: 'generating' } });
    const add = await addText(cookie, id);
    expect(add.status).toBe(409);
    expect((await add.json()).error.code).toBe('INVALID_STATE');
    const del = await srcDelete(makeReq(`/api/v1/projects/${id}/sources/${created.source.id}`, { method: 'DELETE', cookie }), ctx({ id, sourceId: created.source.id }));
    expect(del.status).toBe(409);
  });

  it('deletes a source and its facts', async () => {
    const { cookie } = await createUserWithSession();
    const id = await newProject(cookie);
    const { source } = await (await addText(cookie, id)).json();
    await prisma.fact.create({ data: { projectId: id, sourceId: source.id, category: 'business', statement: 's', quote: 'q', confidence: 'high' } });
    const res = await srcDelete(makeReq(`/api/v1/projects/${id}/sources/${source.id}`, { method: 'DELETE', cookie }), ctx({ id, sourceId: source.id }));
    expect(res.status).toBe(204);
    expect(await prisma.source.count()).toBe(0);
    expect(await prisma.fact.count()).toBe(0);
    const again = await srcDelete(makeReq(`/api/v1/projects/${id}/sources/${source.id}`, { method: 'DELETE', cookie }), ctx({ id, sourceId: source.id }));
    expect(again.status).toBe(404);
  });
});

describe('figma sources', () => {
  const TOKEN = 'figd_SECRET_TOKEN_VALUE_123';
  const fileTree = {
    name: 'Notes Design',
    document: {
      type: 'DOCUMENT',
      children: [
        {
          type: 'CANVAS',
          name: 'Page 1',
          children: [
            { type: 'FRAME', name: 'Home', children: [{ type: 'TEXT', characters: 'Welcome back' }] },
          ],
        },
      ],
    },
    styles: { s1: { name: 'Brand/Primary' } },
  };

  function figmaReq(id: string, cookie: string): Request {
    return makeReq(`/api/v1/projects/${id}/sources`, {
      method: 'POST',
      cookie,
      body: { kind: 'figma', url: 'https://www.figma.com/design/AbC123/Notes', token: TOKEN },
    });
  }

  it('saves the fetched text and stores the token nowhere', async () => {
    const { cookie } = await createUserWithSession();
    const id = await newProject(cookie);
    const stub = vi.fn(async (_url: unknown, init?: RequestInit) => {
      expect((init?.headers as Record<string, string>)['X-Figma-Token']).toBe(TOKEN);
      return new Response(JSON.stringify(fileTree), { status: 200 });
    });
    vi.stubGlobal('fetch', stub);
    try {
      const res = await srcPost(figmaReq(id, cookie), ctx({ id }));
      expect(res.status).toBe(201);
      const { source } = await res.json();
      expect(source.title).toBe('Figma: Notes Design');
      expect(stub).toHaveBeenCalledOnce();
      expect(String(stub.mock.calls[0]?.[0])).toContain('/v1/files/AbC123?depth=4');
    } finally {
      vi.unstubAllGlobals();
    }
    const row = await prisma.source.findFirstOrThrow({ where: { projectId: id } });
    expect(row.kind).toBe('figma');
    expect(row.raw).toBeNull();
    expect(row.text).toContain('### Screen: Home');
    expect(row.text).toContain('- Welcome back');
    expect(JSON.stringify(row)).not.toContain(TOKEN);
    const everything = await prisma.$queryRawUnsafe<{ t: string }[]>(
      "SELECT row_to_json(s)::text AS t FROM sources s UNION ALL SELECT row_to_json(p)::text FROM projects p",
    );
    expect(everything.some((r) => r.t.includes(TOKEN))).toBe(false);
    const { enqueue } = await import('@/server/queue');
    expect(vi.mocked(enqueue)).not.toHaveBeenCalled();
  });

  it('maps a Figma 403 to 422 FIGMA_TOKEN_INVALID and saves nothing', async () => {
    const { cookie } = await createUserWithSession();
    const id = await newProject(cookie);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 403 })));
    try {
      const res = await srcPost(figmaReq(id, cookie), ctx({ id }));
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error.code).toBe('FIGMA_TOKEN_INVALID');
      expect(JSON.stringify(body)).not.toContain(TOKEN);
    } finally {
      vi.unstubAllGlobals();
    }
    expect(await prisma.source.count()).toBe(0);
  });

  it('rejects an invalid Figma URL with FIGMA_URL_INVALID', async () => {
    const { cookie } = await createUserWithSession();
    const id = await newProject(cookie);
    const res = await srcPost(
      makeReq(`/api/v1/projects/${id}/sources`, { method: 'POST', cookie, body: { kind: 'figma', url: 'https://example.com/x', token: TOKEN } }),
      ctx({ id }),
    );
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe('FIGMA_URL_INVALID');
  });
});
