import { prisma } from '@blueprint/db';
import { handle, json } from '@/server/http';
import { requireUser } from '@/server/auth';

export const dynamic = 'force-dynamic';

export const GET = handle(async (req) => {
  const user = await requireUser(prisma, req);
  return json({ user });
});
