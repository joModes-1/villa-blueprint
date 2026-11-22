import { vi } from 'vitest';

export interface Call {
  method: string;
  path: string;
  body: unknown;
}

type Handler = (call: Call) => { status?: number; body?: unknown };

/** Stubs global fetch. Routes are keyed "METHOD /path" (without /api/v1 and without a query). */
export function mockFetch(routes: Record<string, Handler>): { calls: Call[] } {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const path = String(url).replace('/api/v1', '').split('?')[0] as string;
      const method = init?.method ?? 'GET';
      let body: unknown;
      if (typeof init?.body === 'string') body = JSON.parse(init.body);
      const call = { method, path, body };
      calls.push(call);
      const h = routes[`${method} ${path}`];
      if (!h) return new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: `no stub for ${method} ${path}` } }), { status: 404 });
      const out = h(call);
      if (out.status === 204) return new Response(null, { status: 204 });
      return new Response(JSON.stringify(out.body ?? {}), { status: out.status ?? 200 });
    }),
  );
  return { calls };
}
