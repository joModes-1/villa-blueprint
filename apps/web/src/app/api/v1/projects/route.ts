import { z } from 'zod';
import { prisma } from '@blueprint/db';
import { handle, json, parseJson } from '@/server/http';
import { requireUser } from '@/server/auth';
import { createProject, listProjects } from '@/server/projects';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  name: z.string().trim().min(1, 'Enter a project name.').max(80),
  mode: z.enum(['founder', 'expert']).optional(),
});

export const GET = handle(async (req) => {
  const user = await requireUser(prisma, req);
  return json({ items: await listProjects(prisma, user.id) });
});

export const POST = handle(async (req) => {
  const user = await requireUser(prisma, req);
  const input = await parseJson(req, createSchema);
  return json({ project: await createProject(prisma, user.id, input) }, 201);
});
