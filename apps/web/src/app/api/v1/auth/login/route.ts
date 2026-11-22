import { prisma } from '@blueprint/db';
import { handle, json, parseJson } from '@/server/http';
import { getClientIp, login, loginSchema, setSessionCookie } from '@/server/auth';

export const POST = handle(async (req) => {
  const input = await parseJson(req, loginSchema);
  const { user, token } = await login(prisma, input, getClientIp(req));
  const res = json({ user });
  setSessionCookie(res, token);
  return res;
});
