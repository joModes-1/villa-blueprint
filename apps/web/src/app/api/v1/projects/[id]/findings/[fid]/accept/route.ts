import { prisma } from '@blueprint/db';
import { handle, json, parseJson } from '@/server/http';
import { requireUser } from '@/server/auth';
import { loadOwnedProject } from '@/server/projects';
import { acceptFinding, acceptSchema } from '@/server/gates';

export const POST = handle(async (req, { params }) => {
  const user = await requireUser(prisma, req);
  const project = await loadOwnedProject(prisma, params.id as string, user.id);
  const { reason } = await parseJson(req, acceptSchema);
  return json(await acceptFinding(prisma, project, params.fid as string, reason));
});
