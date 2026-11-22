import { z } from 'zod';
import { prisma } from '@blueprint/db';
import { handle, json, parseJson } from '@/server/http';
import { requireUser } from '@/server/auth';
import { getProject, renameOrSetMode, softDelete } from '@/server/projects';

export const dynamic = 'force-dynamic';

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    mode: z.enum(['founder', 'expert']).optional(),
  })
  .refine((v) => v.name !== undefined || v.mode !== undefined, { message: 'Provide a name or a mode.' });

export const GET = handle(async (req, { params }) => {
  const user = await requireUser(prisma, req);
  return json(await getProject(prisma, user.id, params.id as string));
});

export const PATCH = handle(async (req, { params }) => {
  const user = await requireUser(prisma, req);
  const input = await parseJson(req, patchSchema);
  return json({ project: await renameOrSetMode(prisma, user.id, params.id as string, input) });
});

export const DELETE = handle(async (req, { params }) => {
  const user = await requireUser(prisma, req);
  await softDelete(prisma, user.id, params.id as string);
  return new Response(null, { status: 204 });
});
