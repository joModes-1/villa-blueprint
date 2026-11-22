import { prisma } from '@blueprint/db';
import { handle, json } from '@/server/http';
import { requireUser } from '@/server/auth';
import { loadOwnedProject } from '@/server/projects';
import { listFindings } from '@/server/gates';

export const dynamic = 'force-dynamic';

export const GET = handle(async (req, { params }) => {
  const user = await requireUser(prisma, req);
  const project = await loadOwnedProject(prisma, params.id as string, user.id);
  return json({ items: await listFindings(prisma, project) });
});
