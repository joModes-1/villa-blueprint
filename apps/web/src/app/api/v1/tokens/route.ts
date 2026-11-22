import { prisma } from '@blueprint/db';
import { handle, json, parseJson } from '@/server/http';
import { requireUser } from '@/server/auth';
import { createToken, createTokenSchema, listTokens } from '@/server/tokens';

export const dynamic = 'force-dynamic';

// Token management accepts only a browser session: a bearer token cannot manage tokens.
export const GET = handle(async (req) => {
  const user = await requireUser(prisma, req, { cookieOnly: true });
  return json({ items: await listTokens(prisma, user.id) });
});

export const POST = handle(async (req) => {
  const user = await requireUser(prisma, req, { cookieOnly: true });
  const { name } = await parseJson(req, createTokenSchema);
  return json(await createToken(prisma, user.id, name), 201);
});
