import { randomBytes } from 'node:crypto';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import { AppError, BadOriginError, ValidationError } from '@blueprint/core';
import { getEnv } from './env';
import { logger } from './logger';

export interface RouteContext {
  params: Promise<Record<string, string>>;
}

export interface HandlerArgs {
  requestId: string;
  params: Record<string, string>;
}

const MUTATIONS = new Set(['POST', 'PATCH', 'DELETE', 'PUT']);

export function newRequestId(): string {
  return `req_${randomBytes(6).toString('hex')}`;
}

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

/** Bearer-only requests (no cookie) skip the check: CSRF needs a cookie. */
export function assertOrigin(req: Request): void {
  if (!MUTATIONS.has(req.method)) return;
  const hasBearer = (req.headers.get('authorization') ?? '').toLowerCase().startsWith('bearer ');
  if (hasBearer && !req.headers.get('cookie')) return;
  const expected = getEnv().APP_URL.replace(/\/+$/, '');
  const origin = (req.headers.get('origin') ?? '').replace(/\/+$/, '');
  if (!origin || origin !== expected) throw new BadOriginError();
}

export async function parseJson<S extends ZodTypeAny>(req: Request, schema: S): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError('Request body must be valid JSON.');
  }
  return schema.parse(body);
}

function zodDetails(err: ZodError): { field: string; message: string }[] {
  return err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
}

export function errorResponse(
  err: unknown,
  requestId: string,
): { response: Response; code: string; status: number } {
  let code = 'INTERNAL';
  let status = 500;
  let message = 'Something went wrong. Please try again.';
  let details: unknown;
  if (err instanceof ZodError) {
    code = 'VALIDATION_ERROR';
    status = 400;
    message = 'One or more fields are invalid.';
    details = zodDetails(err);
  } else if (err instanceof AppError) {
    code = err.code;
    status = err.status;
    message = err.message;
    details = err.details;
  }
  const body = { error: { code, message, ...(details !== undefined ? { details } : {}), requestId } };
  const response = Response.json(body, { status, headers: { 'x-request-id': requestId } });
  return { response, code, status };
}

export type Handler = (req: Request, args: HandlerArgs) => Promise<Response>;

/**
 * Overloaded so Next.js sees a required second argument (its route type check), while tests may omit it for
 * routes without path parameters. The last overload is the one Next.js reads.
 */
export interface RouteHandler {
  (req: Request): Promise<Response>;
  (req: Request, ctx: RouteContext): Promise<Response>;
}

export function handle(fn: Handler): RouteHandler {
  return (async (req: Request, ctx?: RouteContext) => {
    const requestId = newRequestId();
    const started = Date.now();
    const path = new URL(req.url).pathname;
    let status = 500;
    let code: string | undefined;
    try {
      assertOrigin(req);
      const params = ctx ? await ctx.params : {};
      const res = await fn(req, { requestId, params });
      status = res.status;
      if (!res.headers.has('x-request-id')) res.headers.set('x-request-id', requestId);
      return res;
    } catch (err) {
      const out = errorResponse(err, requestId);
      status = out.status;
      code = out.code;
      if (status === 500) {
        logger.error({ requestId, err: err instanceof Error ? err.stack : String(err) }, 'unhandled error');
      }
      return out.response;
    } finally {
      logger.info(
        { requestId, method: req.method, path, status, ms: Date.now() - started, ...(code ? { code } : {}) },
        'request',
      );
    }
  }) as RouteHandler;
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}
