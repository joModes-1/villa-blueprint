import { prisma, resetTestDb } from '@blueprint/db';
import { SESSION_COOKIE } from '@/server/auth';

export const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

export { prisma };

export async function resetDb(): Promise<void> {
  await resetTestDb(prisma);
}

export interface ReqOpts {
  method?: string;
  body?: unknown;
  cookie?: string;
  headers?: Record<string, string>;
  origin?: string | null;
  bearer?: string;
}

export function makeReq(path: string, opts: ReqOpts = {}): Request {
  const method = opts.method ?? 'GET';
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.origin !== null && method !== 'GET') headers.origin = opts.origin ?? APP_URL;
  if (opts.cookie) headers.cookie = opts.cookie;
  if (opts.bearer) headers.authorization = `Bearer ${opts.bearer}`;
  let body: string | undefined;
  if (opts.body !== undefined) {
    body = JSON.stringify(opts.body);
    headers['content-type'] = 'application/json';
  }
  return new Request(`${APP_URL}${path}`, { method, headers, body });
}

export function cookieFrom(res: Response): string {
  const raw = res.headers.get('set-cookie') ?? '';
  const first = raw.split(';')[0] ?? '';
  return first;
}

export function ctx(params: Record<string, string>): { params: Promise<Record<string, string>> } {
  return { params: Promise.resolve(params) };
}

/** Creates a user directly and returns a ready session cookie. */
export async function createUserWithSession(
  email = 'owner@example.com',
  name = 'Owner',
): Promise<{ userId: string; cookie: string }> {
  const { createHash, randomBytes } = await import('node:crypto');
  const user = await prisma.user.create({ data: { email, name, passwordHash: 'x' } });
  const token = randomBytes(32).toString('base64url');
  await prisma.session.create({
    data: {
      tokenHash: createHash('sha256').update(token).digest('hex'),
      userId: user.id,
      expiresAt: new Date(Date.now() + 86_400_000),
    },
  });
  return { userId: user.id, cookie: `${SESSION_COOKIE}=${token}` };
}
