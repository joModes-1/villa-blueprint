import { prisma } from '@blueprint/db';
import { handle, json } from '@/server/http';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => {
  await prisma.$queryRaw`SELECT 1`;
  return json({ status: 'ok', db: true });
});
