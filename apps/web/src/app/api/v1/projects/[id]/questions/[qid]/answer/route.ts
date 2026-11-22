import { z } from 'zod';
import { prisma } from '@blueprint/db';
import { handle, json, parseJson } from '@/server/http';
import { requireUser } from '@/server/auth';
import { loadOwnedProject } from '@/server/projects';
import { answerQuestion } from '@/server/interview';

const schema = z.object({ answer: z.string().trim().min(1, 'Enter an answer.').max(2000) });

export const POST = handle(async (req, { params }) => {
  const user = await requireUser(prisma, req);
  const project = await loadOwnedProject(prisma, params.id as string, user.id);
  const { answer } = await parseJson(req, schema);
  return json(await answerQuestion(prisma, project, params.qid as string, answer));
});
