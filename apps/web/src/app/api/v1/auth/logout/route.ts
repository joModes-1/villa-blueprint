import { prisma } from '@blueprint/db';
import { handle } from '@/server/http';
import { clearSessionCookie, logout, requireUser } from '@/server/auth';

export const POST = handle(async (req) => {
  await requireUser(prisma, req, { cookieOnly: true });
  await logout(prisma, req);
  const res = new Response(null, { status: 204 });
  clearSessionCookie(res);
  return res;
});
