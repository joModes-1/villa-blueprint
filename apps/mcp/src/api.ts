export class ToolError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ToolError';
    this.code = code;
  }
}

export type ApiCall = <T = unknown>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown) => Promise<T>;

export interface Api {
  call: ApiCall;
}

/** Thin client of the Blueprint REST API. It forwards the caller's bearer token and holds no state. */
export function createApi(baseUrl: string, bearer: string, fetchImpl: typeof fetch = fetch): Api {
  const root = baseUrl.replace(/\/+$/, '');
  const call: ApiCall = async <T>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> => {
    let res: Response;
    try {
      res = await fetchImpl(`${root}/api/v1${path}`, {
        method,
        headers: {
          authorization: `Bearer ${bearer}`,
          ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new ToolError('API_UNREACHABLE', `Could not reach the Blueprint API${err instanceof Error ? ` (${err.message})` : ''}.`);
    }
    if (res.status === 204) return undefined as T;
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      /* non-JSON body */
    }
    if (!res.ok) {
      const e = (data as { error?: { code?: string; message?: string } } | null)?.error;
      throw new ToolError(e?.code ?? 'INTERNAL', e?.message ?? `The API answered HTTP ${res.status}.`);
    }
    return data as T;
  };
  return { call };
}
