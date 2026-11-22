import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { PrismaClient, User } from '@blueprint/db';
import {
  ConflictError,
  InvalidCredentialsError,
  RateLimitedError,
  UnauthenticatedError,
} from '@blueprint/core';
import { readCookie } from './http';
import { getEnv } from './env';

export const SESSION_COOKIE = 'bp_session';
const SESSION_DAYS = 30;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;
const BCRYPT_COST = 12;
const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60 * 1000;
const TOKEN_TOUCH_MS = 5 * 60 * 1000;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export const signupSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(10, 'Use at least 10 characters.').max(200),
});
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'Enter your email.'),
  password: z.string().min(1, 'Enter your password.').max(200),
});

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

function toAuthUser(u: Pick<User, 'id' | 'email' | 'name'>): AuthUser {
  return { id: u.id, email: u.email, name: u.name };
}

let dummyHash: string | undefined;
function getDummyHash(): string {
  dummyHash ??= bcrypt.hashSync('not-a-real-password', BCRYPT_COST);
  return dummyHash;
}

async function createSession(prisma: PrismaClient, userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await prisma.session.create({
    data: { tokenHash: sha256(token), userId, expiresAt: new Date(Date.now() + SESSION_MS) },
  });
  return token;
}

export async function signup(
  prisma: PrismaClient,
  input: z.infer<typeof signupSchema>,
): Promise<{ user: AuthUser; token: string }> {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ConflictError('EMAIL_TAKEN', 'An account with this email already exists.');
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  let user: User;
  try {
    user = await prisma.user.create({ data: { email, name: input.name.trim(), passwordHash } });
  } catch {
    throw new ConflictError('EMAIL_TAKEN', 'An account with this email already exists.');
  }
  const token = await createSession(prisma, user.id);
  return { user: toAuthUser(user), token };
}

export async function login(
  prisma: PrismaClient,
  input: z.infer<typeof loginSchema>,
  ip: string,
): Promise<{ user: AuthUser; token: string }> {
  const email = input.email.trim().toLowerCase();
  const key = `${email}|${ip}`;
  const recent = await prisma.loginAttempt.count({
    where: { key, createdAt: { gt: new Date(Date.now() - WINDOW_MS) } },
  });
  if (recent >= MAX_FAILURES) throw new RateLimitedError();

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await bcrypt.compare(input.password, user ? user.passwordHash : getDummyHash());
  if (!user || !ok) {
    await prisma.loginAttempt.create({ data: { key } });
    throw new InvalidCredentialsError();
  }
  await prisma.loginAttempt.deleteMany({ where: { key } });
  const token = await createSession(prisma, user.id);
  return { user: toAuthUser(user), token };
}

export async function logout(prisma: PrismaClient, req: Request): Promise<void> {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
}

export async function getSessionUser(prisma: PrismaClient, req: Request): Promise<AuthUser | null> {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  return toAuthUser(session.user);
}

async function getBearerUser(prisma: PrismaClient, req: Request): Promise<AuthUser | null> {
  const header = req.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(bp_\S+)$/i.exec(header);
  if (!match?.[1]) return null;
  const row = await prisma.apiToken.findUnique({
    where: { tokenHash: sha256(match[1]) },
    include: { user: true },
  });
  if (!row || row.revokedAt) return null;
  if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > TOKEN_TOUCH_MS) {
    await prisma.apiToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } });
  }
  return toAuthUser(row.user);
}

/** Resolves the caller. Cookie session first, then a personal access token unless `cookieOnly`. */
export async function requireUser(
  prisma: PrismaClient,
  req: Request,
  opts: { cookieOnly?: boolean } = {},
): Promise<AuthUser> {
  const fromCookie = await getSessionUser(prisma, req);
  if (fromCookie) return fromCookie;
  if (!opts.cookieOnly) {
    const fromToken = await getBearerUser(prisma, req);
    if (fromToken) return fromToken;
  }
  throw new UnauthenticatedError();
}

export function sessionCookie(token: string): string {
  const secure = getEnv().NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 24 * 60 * 60}${secure}`;
}

export function clearedSessionCookie(): string {
  const secure = getEnv().NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;
}

export function setSessionCookie(res: Response, token: string): void {
  res.headers.append('set-cookie', sessionCookie(token));
}

export function clearSessionCookie(res: Response): void {
  res.headers.append('set-cookie', clearedSessionCookie());
}
