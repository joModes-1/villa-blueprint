import { prisma } from '@blueprint/db';
import { handle } from '@/server/http';
import { requireUser } from '@/server/auth';
import { revokeToken } from '@/server/tokens';

export const DELETE = handle(async (req, { params }) => {
  const user = await requireUser(prisma, req, { cookieOnly: true });
  await revokeToken(prisma, user.id, params.tokenId as string);
  return new Response(null, { status: 204 });
});
