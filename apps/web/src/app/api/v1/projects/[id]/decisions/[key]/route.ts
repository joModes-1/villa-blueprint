import { prisma } from '@blueprint/db';
import { handle, json, parseJson } from '@/server/http';
import { requireUser } from '@/server/auth';
import { loadOwnedProject } from '@/server/projects';
import { patchDecision, patchDecisionSchema } from '@/server/ledger';

export const PATCH = handle(async (req, { params }) => {
  const user = await requireUser(prisma, req);
  const project = await loadOwnedProject(prisma, params.id as string, user.id);
  const input = await parseJson(req, patchDecisionSchema);
  return json(await patchDecision(prisma, project, params.key as string, input));
});
