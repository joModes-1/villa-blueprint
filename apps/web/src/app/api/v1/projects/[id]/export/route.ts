import { prisma } from '@blueprint/db';
import { handle } from '@/server/http';
import { requireUser } from '@/server/auth';
import { loadOwnedProject } from '@/server/projects';
import { exportPack } from '@/server/export';

export const dynamic = 'force-dynamic';

export const GET = handle(async (req, { params }) => {
  const user = await requireUser(prisma, req);
  const project = await loadOwnedProject(prisma, params.id as string, user.id);
  const { filename, bytes } = await exportPack(prisma, project);
  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="${filename}"`,
      'content-length': String(bytes.length),
    },
  });
});
