import { prisma } from '@blueprint/db';
import { handle } from '@/server/http';
import { requireUser } from '@/server/auth';
import { loadOwnedProject } from '@/server/projects';
import { deleteSource } from '@/server/sources';

export const DELETE = handle(async (req, { params }) => {
  const user = await requireUser(prisma, req);
  const project = await loadOwnedProject(prisma, params.id as string, user.id);
  await deleteSource(prisma, project, params.sourceId as string);
  return new Response(null, { status: 204 });
});
