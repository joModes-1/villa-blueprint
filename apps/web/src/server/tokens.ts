import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import type { PrismaClient } from '@blueprint/db';
import { NotFoundError, UnprocessableError, type AccessTokenItem } from '@blueprint/core';
import { sha256 } from './auth';

export const MAX_ACTIVE_TOKENS = 10;
export const createTokenSchema = z.object({ name: z.string().trim().min(1, 'Name the token.').max(60) });

type Row = { id: string; name: string; prefix: string; lastUsedAt: Date | null; createdAt: Date };

const toItem = (t: Row): AccessTokenItem => ({
  id: t.id,
  name: t.name,
  prefix: t.prefix,
  lastUsedAt: t.lastUsedAt ? t.lastUsedAt.toISOString() : null,
  createdAt: t.createdAt.toISOString(),
});

export async function listTokens(prisma: PrismaClient, userId: string): Promise<AccessTokenItem[]> {
  const rows = await prisma.apiToken.findMany({ where: { userId, revokedAt: null }, orderBy: { createdAt: 'desc' } });
  return rows.map(toItem);
}

/** The raw token is returned here and nowhere else; only its SHA-256 is stored. */
export async function createToken(
  prisma: PrismaClient,
  userId: string,
  name: string,
): Promise<{ token: string; item: AccessTokenItem }> {
  const active = await prisma.apiToken.count({ where: { userId, revokedAt: null } });
  if (active >= MAX_ACTIVE_TOKENS) {
    throw new UnprocessableError('TOKEN_LIMIT', `You can have at most ${MAX_ACTIVE_TOKENS} active access tokens. Revoke one first.`);
  }
  const token = `bp_${randomBytes(32).toString('base64url')}`;
  const row = await prisma.apiToken.create({
    data: { userId, name: name.trim(), prefix: token.slice(0, 10), tokenHash: sha256(token) },
  });
  return { token, item: toItem(row) };
}

export async function revokeToken(prisma: PrismaClient, userId: string, tokenId: string): Promise<void> {
  const row = await prisma.apiToken.findFirst({ where: { id: tokenId, userId, revokedAt: null } });
  if (!row) throw new NotFoundError('Token not found.');
  await prisma.apiToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
}
