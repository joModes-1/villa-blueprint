import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { GET as listGet, POST as createPost } from '@/app/api/v1/tokens/route';
import { DELETE as revoke } from '@/app/api/v1/tokens/[tokenId]/route';
import { GET as me } from '@/app/api/v1/me/route';
import { POST as projectPost, GET as projectsGet } from '@/app/api/v1/projects/route';
import { createUserWithSession, ctx, makeReq, prisma, resetDb } from '../helpers';

beforeEach(async () => {
  await resetDb();
});
afterAll(async () => {
  await prisma.$disconnect();
});

async function create(cookie: string, name = 'Claude Code') {
  const res = await createPost(makeReq('/api/v1/tokens', { method: 'POST', cookie, body: { name } }));
  return { res, body: res.status === 201 ? await res.clone().json() : await res.clone().json() };
}

describe('access tokens', () => {
  it('creates a token, shows it once, and stores only its hash', async () => {
    const { cookie, userId } = await createUserWithSession();
    const { res, body } = await create(cookie);
    expect(res.status).toBe(201);
    expect(body.token).toMatch(/^bp_[A-Za-z0-9_-]{43}$/);
    expect(body.item).toMatchObject({ name: 'Claude Code', prefix: body.token.slice(0, 10), lastUsedAt: null });
    const row = await prisma.apiToken.findFirstOrThrow({ where: { userId } });
    expect(row.tokenHash).toHaveLength(64);
    expect(JSON.stringify(row)).not.toContain(body.token);
    const list = await (await listGet(makeReq('/api/v1/tokens', { cookie }))).json();
    expect(list.items).toHaveLength(1);
    expect(JSON.stringify(list)).not.toContain(body.token);
  });

  it('a bearer token authenticates GET /me and records lastUsedAt', async () => {
    const { cookie } = await createUserWithSession();
    const { body } = await create(cookie);
    const res = await me(makeReq('/api/v1/me', { bearer: body.token }));
    expect(res.status).toBe(200);
    expect((await res.json()).user.email).toBe('owner@example.com');
    expect((await prisma.apiToken.findFirstOrThrow()).lastUsedAt).not.toBeNull();
  });

  it('a revoked token gets 401', async () => {
    const { cookie } = await createUserWithSession();
    const { body } = await create(cookie);
    const del = await revoke(makeReq(`/api/v1/tokens/${body.item.id}`, { method: 'DELETE', cookie }), ctx({ tokenId: body.item.id }));
    expect(del.status).toBe(204);
    expect((await me(makeReq('/api/v1/me', { bearer: body.token }))).status).toBe(401);
    expect((await listGet(makeReq('/api/v1/tokens', { cookie }))).status).toBe(200);
    expect(((await (await listGet(makeReq('/api/v1/tokens', { cookie }))).json()).items)).toHaveLength(0);
    const again = await revoke(makeReq(`/api/v1/tokens/${body.item.id}`, { method: 'DELETE', cookie }), ctx({ tokenId: body.item.id }));
    expect(again.status).toBe(404);
  });

  it('an unknown or malformed bearer is 401', async () => {
    expect((await me(makeReq('/api/v1/me', { bearer: 'bp_nonsense' }))).status).toBe(401);
    expect((await me(makeReq('/api/v1/me', { bearer: 'other' }))).status).toBe(401);
  });

  it('the 11th active token is 422 TOKEN_LIMIT', async () => {
    const { cookie } = await createUserWithSession();
    for (let i = 0; i < 10; i++) expect((await create(cookie, `t${i}`)).res.status).toBe(201);
    const { res, body } = await create(cookie, 'eleventh');
    expect(res.status).toBe(422);
    expect(body.error.code).toBe('TOKEN_LIMIT');
  });

  it('token endpoints reject bearer auth', async () => {
    const { cookie } = await createUserWithSession();
    const { body } = await create(cookie);
    expect((await listGet(makeReq('/api/v1/tokens', { bearer: body.token }))).status).toBe(401);
    expect((await createPost(makeReq('/api/v1/tokens', { method: 'POST', bearer: body.token, body: { name: 'x' } }))).status).toBe(401);
    const del = await revoke(makeReq(`/api/v1/tokens/${body.item.id}`, { method: 'DELETE', bearer: body.token }), ctx({ tokenId: body.item.id }));
    expect(del.status).toBe(401);
  });

  it("another user cannot revoke my token (404)", async () => {
    const a = await createUserWithSession('a@example.com');
    const b = await createUserWithSession('b@example.com');
    const { body } = await create(a.cookie);
    const del = await revoke(makeReq(`/api/v1/tokens/${body.item.id}`, { method: 'DELETE', cookie: b.cookie }), ctx({ tokenId: body.item.id }));
    expect(del.status).toBe(404);
  });

  it('AC-17: a bearer POST without Origin works; a cookie POST without Origin is still 403', async () => {
    const { cookie } = await createUserWithSession();
    const { body } = await create(cookie);
    const viaBearer = await projectPost(makeReq('/api/v1/projects', { method: 'POST', bearer: body.token, origin: null, body: { name: 'From MCP' } }));
    expect(viaBearer.status).toBe(201);
    const list = await (await projectsGet(makeReq('/api/v1/projects', { bearer: body.token }))).json();
    expect(list.items[0].name).toBe('From MCP');
    const viaCookie = await projectPost(makeReq('/api/v1/projects', { method: 'POST', cookie, origin: null, body: { name: 'x' } }));
    expect(viaCookie.status).toBe(403);
    expect((await viaCookie.json()).error.code).toBe('BAD_ORIGIN');
    // A request that carries both a cookie and a bearer still needs the Origin check.
    const both = await projectPost(makeReq('/api/v1/projects', { method: 'POST', cookie, bearer: body.token, origin: null, body: { name: 'x' } }));
    expect(both.status).toBe(403);
  });
});
