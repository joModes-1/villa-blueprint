import { prisma } from '@blueprint/db';
import { handle, parseJson } from '@/server/http';
import { setSessionCookie, signup, signupSchema } from '@/server/auth';

export const POST = handle(async (req) => {
  const input = await parseJson(req, signupSchema);
  const { user, token } = await signup(prisma, input);
  const res = Response.json({ user }, { status: 201 });
  setSessionCookie(res, token);
  return res;
});
