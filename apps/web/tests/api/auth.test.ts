import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { POST as signup } from '@/app/api/v1/auth/signup/route';
import { POST as login } from '@/app/api/v1/auth/login/route';
import { POST as logout } from '@/app/api/v1/auth/logout/route';
import { GET as me } from '@/app/api/v1/me/route';
import { GET as health } from '@/app/api/v1/health/route';
import { cookieFrom, makeReq, prisma, resetDb } from '../helpers';

beforeEach(async () => {
  await resetDb();
});
afterAll(async () => {
  await prisma.$disconnect();
});

const good = { name: 'Ada', email: 'Ada@Example.com ', password: 'correct-horse-1' };

async function doSignup(body: unknown = good): Promise<Response> {
  return signup(makeReq('/api/v1/auth/signup', { method: 'POST', body }));
}

describe('signup', () => {
  it('creates the user, lower-cases the email and sets an httpOnly cookie', async () => {
    const res = await doSignup();
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.user.email).toBe('ada@example.com');
    expect(body.user.passwordHash).toBeUndefined();
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('bp_session=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(res.headers.get('x-request-id')).toMatch(/^req_[0-9a-f]{12}$/);
    expect(await prisma.session.count()).toBe(1);
  });

  it('returns 409 EMAIL_TAKEN for a duplicate email', async () => {
    await doSignup();
    const res = await doSignup({ ...good, email: 'ada@example.com' });
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe('EMAIL_TAKEN');
  });

  it('returns 400 with details for a short password', async () => {
    const res = await doSignup({ ...good, password: 'short' });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details[0].field).toBe('password');
    expect(body.error.requestId).toMatch(/^req_/);
  });
});

describe('login', () => {
  const attempt = (email: string, password: string, ip = '1.2.3.4'): Promise<Response> =>
    login(
      makeReq('/api/v1/auth/login', {
        method: 'POST',
        body: { email, password },
        headers: { 'x-forwarded-for': ip },
      }),
    );

  it('logs in with valid credentials', async () => {
    await doSignup();
    const res = await attempt('ada@example.com', good.password);
    expect(res.status).toBe(200);
    expect((await res.json()).user.name).toBe('Ada');
    expect(res.headers.get('set-cookie')).toContain('bp_session=');
  });

  it('returns identical bodies for a wrong password and an unknown email', async () => {
    await doSignup();
    const wrong = await attempt('ada@example.com', 'nope-nope-nope');
    const unknown = await attempt('ghost@example.com', 'nope-nope-nope');
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    const a = (await wrong.json()).error;
    const b = (await unknown.json()).error;
    expect(a.code).toBe('INVALID_CREDENTIALS');
    expect(a.message).toBe(b.message);
    expect(a.code).toBe(b.code);
  });

  it('rate-limits the 11th failure and clears attempts on success', async () => {
    await doSignup();
    for (let i = 0; i < 10; i++) {
      const res = await attempt('ada@example.com', 'wrong-password-x');
      expect(res.status).toBe(401);
    }
    const blocked = await attempt('ada@example.com', 'wrong-password-x');
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).error.code).toBe('RATE_LIMITED');

    await prisma.loginAttempt.deleteMany({});
    for (let i = 0; i < 3; i++) await attempt('ada@example.com', 'wrong-password-x');
    const ok = await attempt('ada@example.com', good.password);
    expect(ok.status).toBe(200);
    expect(await prisma.loginAttempt.count()).toBe(0);
  });
});

describe('me and logout', () => {
  it('returns the user for a valid cookie', async () => {
    const cookie = cookieFrom(await doSignup());
    const res = await me(makeReq('/api/v1/me', { cookie }));
    expect(res.status).toBe(200);
    expect((await res.json()).user.email).toBe('ada@example.com');
  });

  it('returns 401 without a cookie', async () => {
    const res = await me(makeReq('/api/v1/me'));
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe('UNAUTHENTICATED');
  });

  it('returns 401 for an expired session and deletes it', async () => {
    const cookie = cookieFrom(await doSignup());
    await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    const res = await me(makeReq('/api/v1/me', { cookie }));
    expect(res.status).toBe(401);
    expect(await prisma.session.count()).toBe(0);
  });

  it('logout deletes the session and clears the cookie', async () => {
    const cookie = cookieFrom(await doSignup());
    const res = await logout(makeReq('/api/v1/auth/logout', { method: 'POST', cookie }));
    expect(res.status).toBe(204);
    expect(res.headers.get('set-cookie')).toContain('Max-Age=0');
    expect(await prisma.session.count()).toBe(0);
  });
});

describe('origin check and health', () => {
  it('rejects a mutation without Origin', async () => {
    const res = await signup(makeReq('/api/v1/auth/signup', { method: 'POST', body: good, origin: null }));
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe('BAD_ORIGIN');
  });

  it('rejects a mutation with a foreign Origin', async () => {
    const res = await signup(
      makeReq('/api/v1/auth/signup', { method: 'POST', body: good, origin: 'https://evil.example' }),
    );
    expect(res.status).toBe(403);
  });

  it('reports health', async () => {
    const res = await health(makeReq('/api/v1/health'));
    expect(await res.json()).toEqual({ status: 'ok', db: true });
  });
});
