import { ValidationError } from '@blueprint/core';
import { prisma } from '@blueprint/db';
import { handle, json } from '@/server/http';
import { requireUser } from '@/server/auth';
import { loadOwnedProject } from '@/server/projects';
import { getDocumentContent } from '@/server/generation';

export const dynamic = 'force-dynamic';

export const GET = handle(async (req, { params }) => {
  const user = await requireUser(prisma, req);
  const project = await loadOwnedProject(prisma, params.id as string, user.id);
  const path = new URL(req.url).searchParams.get('path');
  if (!path) throw new ValidationError('A path is required.', [{ field: 'path', message: 'Provide ?path=…' }]);
  return json(await getDocumentContent(prisma, project, path));
});
