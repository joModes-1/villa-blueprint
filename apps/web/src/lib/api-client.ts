export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  form?: FormData;
}

export function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  const here = window.location.pathname + window.location.search;
  if (window.location.pathname.startsWith('/login') || window.location.pathname.startsWith('/signup')) return;
  window.location.assign(`/login?next=${encodeURIComponent(here)}`);
}

/** Typed fetch wrapper for /api/v1: same-origin cookies, JSON bodies, ApiError on failure, 401 → /login. */
export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, { method: opts.method ?? 'GET', headers, body, credentials: 'same-origin' });
  } catch {
    throw new ApiError('NETWORK', 'Could not reach the server. Check your connection and try again.', 0);
  }
  if (res.status === 204) return undefined as T;
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
    if (res.status === 401 && err?.code === 'UNAUTHENTICATED') redirectToLogin();
    throw new ApiError(err?.code ?? 'INTERNAL', err?.message ?? 'Something went wrong. Please try again.', res.status, err?.details);
  }
  return data as T;
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.';
}

/** Maps a VALIDATION_ERROR's details to `{ field: message }`. */
export function fieldErrors(err: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (err instanceof ApiError && Array.isArray(err.details)) {
    for (const d of err.details as { field?: string; message?: string }[]) {
      if (d.field && d.message && !out[d.field]) out[d.field] = d.message;
    }
  }
  return out;
}
