import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createMcpApp } from '../src/server';
import { NEXT_STEP, TOOLS, asText, MAX_RESULT_CHARS } from '../src/tools';

interface Seen {
  method: string;
  url: string;
  auth: string | undefined;
  body: unknown;
}

const seen: Seen[] = [];
const logs: Record<string, unknown>[] = [];
let stubStatus = 'draft';
let api: http.Server;
let mcp: http.Server;
let mcpUrl = '';

function jsonReply(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

beforeAll(async () => {
  api = http.createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const raw = Buffer.concat(chunks).toString('utf8');
    const url = req.url ?? '';
    seen.push({ method: req.method ?? '', url, auth: req.headers.authorization, body: raw ? JSON.parse(raw) : undefined });
    if (url.includes('/missing')) return jsonReply(res, 404, { error: { code: 'NOT_FOUND', message: 'Project not found.', requestId: 'r' } });
    if (url === '/api/v1/projects/p1' && req.method === 'GET') return jsonReply(res, 200, { project: { id: 'p1', status: stubStatus }, counts: { sources: 1 }, latestRun: null });
    if (url === '/api/v1/projects/p1/runs/latest') return jsonReply(res, 200, { run: { stage: 'process', done: 1, total: 2 } });
    if (url === '/api/v1/projects/p1/questions') return jsonReply(res, 200, { items: [{ id: 'q1', status: 'open' }, { id: 'q2', status: 'answered' }] });
    if (url.startsWith('/api/v1/projects/p1/documents/content')) return jsonReply(res, 200, { path: 'START-HERE.md', content: '# START HERE\nraw text' });
    if (url.startsWith('/api/v1/projects/big/documents/content')) return jsonReply(res, 200, { content: 'x'.repeat(150_000) });
    return jsonReply(res, 200, { ok: true, echoed: url });
  });
  await new Promise<void>((r) => api.listen(0, r));
  const apiUrl = `http://127.0.0.1:${(api.address() as AddressInfo).port}`;
  mcp = createMcpApp({ apiUrl, logger: { info: (o) => void logs.push(o) } });
  await new Promise<void>((r) => mcp.listen(0, r));
  mcpUrl = `http://127.0.0.1:${(mcp.address() as AddressInfo).port}/mcp`;
});

afterAll(async () => {
  await new Promise((r) => mcp.close(r));
  await new Promise((r) => api.close(r));
});

async function connect(token = 'bp_testtoken'): Promise<Client> {
  const client = new Client({ name: 'test', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(mcpUrl), { requestInit: { headers: { Authorization: `Bearer ${token}` } } }));
  return client;
}

const text = (r: unknown): string => ((r as { content: { text: string }[] }).content[0] as { text: string }).text;

describe('mcp server', () => {
  it('lists exactly the 17 tools of docs/31, with their verbatim descriptions', async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(
      ['whoami', 'list_projects', 'create_project', 'add_text_source', 'add_figma_source', 'analyze_project', 'get_project_status', 'list_open_questions', 'answer_question', 'accept_recommended_answers', 'get_ledger', 'set_decision', 'generate_pack', 'list_findings', 'accept_finding', 'list_pack_files', 'read_pack_file'].sort(),
    );
    expect(tools).toHaveLength(17);
    const byName = new Map(tools.map((t) => [t.name, t]));
    expect(byName.get('whoami')?.description).toBe('Show which Blueprint account this connection uses.');
    expect(byName.get('add_text_source')?.description).toContain('with a title starting "Figma: ". Send long conversations whole; do not summarize them.');
    expect(byName.get('read_pack_file')?.description).toContain('then follow `START-HERE.md`.');
    expect(TOOLS.map((t) => t.name)).toHaveLength(17);
    await client.close();
  });

  it('every tool calls the right method and path and forwards the bearer header', async () => {
    const client = await connect('bp_abc123');
    const cases: [string, Record<string, unknown>, string, string, unknown?][] = [
      ['whoami', {}, 'GET', '/api/v1/me'],
      ['list_projects', {}, 'GET', '/api/v1/projects'],
      ['create_project', { name: 'X', mode: 'expert' }, 'POST', '/api/v1/projects', { name: 'X', mode: 'expert' }],
      ['add_text_source', { projectId: 'p1', title: 'Chat', text: 'hello' }, 'POST', '/api/v1/projects/p1/sources', { kind: 'markdown', title: 'Chat', text: 'hello' }],
      ['add_figma_source', { projectId: 'p1', url: 'https://figma.com/design/a/b', figmaToken: 'tok' }, 'POST', '/api/v1/projects/p1/sources', { kind: 'figma', url: 'https://figma.com/design/a/b', token: 'tok' }],
      ['analyze_project', { projectId: 'p1' }, 'POST', '/api/v1/projects/p1/analyze'],
      ['answer_question', { projectId: 'p1', questionId: 'q1', answer: 'A' }, 'POST', '/api/v1/projects/p1/questions/q1/answer', { answer: 'A' }],
      ['accept_recommended_answers', { projectId: 'p1' }, 'POST', '/api/v1/projects/p1/questions/accept-recommended'],
      ['get_ledger', { projectId: 'p1' }, 'GET', '/api/v1/projects/p1/decisions'],
      ['set_decision', { projectId: 'p1', key: 'stack.backend', value: 'Go', status: 'confirmed' }, 'PATCH', '/api/v1/projects/p1/decisions/stack.backend', { value: 'Go', status: 'confirmed' }],
      ['generate_pack', { projectId: 'p1' }, 'POST', '/api/v1/projects/p1/generate'],
      ['list_findings', { projectId: 'p1' }, 'GET', '/api/v1/projects/p1/findings'],
      ['accept_finding', { projectId: 'p1', findingId: 'f1', reason: 'fine' }, 'POST', '/api/v1/projects/p1/findings/f1/accept', { reason: 'fine' }],
      ['list_pack_files', { projectId: 'p1' }, 'GET', '/api/v1/projects/p1/documents'],
      ['read_pack_file', { projectId: 'p1', path: 'START-HERE.md' }, 'GET', '/api/v1/projects/p1/documents/content?path=START-HERE.md'],
    ];
    for (const [name, args, method, url, body] of cases) {
      seen.length = 0;
      const res = await client.callTool({ name, arguments: args });
      expect(res.isError, `${name}: ${text(res)}`).toBeFalsy();
      const hit = seen.find((s) => s.method === method && s.url === url);
      expect(hit, `${name} -> ${method} ${url}; saw ${JSON.stringify(seen)}`).toBeDefined();
      expect(hit?.auth).toBe('Bearer bp_abc123');
      if (body !== undefined) expect(hit?.body).toEqual(body);
    }
    await client.close();
  });

  it('read_pack_file returns the raw file text', async () => {
    const client = await connect();
    expect(text(await client.callTool({ name: 'read_pack_file', arguments: { projectId: 'p1', path: 'START-HERE.md' } }))).toBe('# START HERE\nraw text');
    await client.close();
  });

  it('list_open_questions returns only open questions', async () => {
    const client = await connect();
    const out = JSON.parse(text(await client.callTool({ name: 'list_open_questions', arguments: { projectId: 'p1' } })));
    expect(out.items).toEqual([{ id: 'q1', status: 'open' }]);
    await client.close();
  });

  it('get_project_status merges project, counts, latest run and the nextStep for every status', async () => {
    const client = await connect();
    for (const [status, step] of Object.entries(NEXT_STEP)) {
      stubStatus = status;
      const out = JSON.parse(text(await client.callTool({ name: 'get_project_status', arguments: { projectId: 'p1' } })));
      expect(out.project.status).toBe(status);
      expect(out.counts).toEqual({ sources: 1 });
      expect(out.latestRun).toEqual({ stage: 'process', done: 1, total: 2 });
      expect(out.nextStep).toBe(step);
    }
    expect(NEXT_STEP.draft).toBe('Add sources, then call analyze_project');
    expect(NEXT_STEP.ready).toBe('Call list_pack_files and read_pack_file to get the pack');
    await client.close();
  });

  it('an API 404 becomes isError with "NOT_FOUND: …"', async () => {
    const client = await connect();
    const res = await client.callTool({ name: 'get_ledger', arguments: { projectId: 'missing' } });
    expect(res.isError).toBe(true);
    expect(text(res)).toBe('NOT_FOUND: Project not found.');
    await client.close();
  });

  it('an unreachable API becomes API_UNREACHABLE', async () => {
    const dead = createMcpApp({ apiUrl: 'http://127.0.0.1:1' });
    await new Promise<void>((r) => dead.listen(0, r));
    const client = new Client({ name: 't', version: '1' });
    await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${(dead.address() as AddressInfo).port}/mcp`), { requestInit: { headers: { Authorization: 'Bearer bp_x' } } }));
    const res = await client.callTool({ name: 'whoami', arguments: {} });
    expect(res.isError).toBe(true);
    expect(text(res)).toMatch(/^API_UNREACHABLE: /);
    await client.close();
    await new Promise((r) => dead.close(r));
  });

  it('rejects invalid tool input', async () => {
    const client = await connect();
    const res = await client.callTool({ name: 'create_project', arguments: { name: '' } }).catch((e: Error) => ({ isError: true, content: [{ text: e.message }] }));
    expect(res.isError).toBe(true);
    await client.close();
  });

  it('caps large results at 100,000 characters with a marker', async () => {
    expect(asText('x'.repeat(150_000)).length).toBe(MAX_RESULT_CHARS);
    expect(asText('x'.repeat(150_000)).endsWith('…(truncated)')).toBe(true);
    expect(asText({ a: 1 })).toBe('{\n  "a": 1\n}');
    const client = await connect();
    const out = text(await client.callTool({ name: 'read_pack_file', arguments: { projectId: 'big', path: 'x.md' } }));
    expect(out.length).toBe(MAX_RESULT_CHARS);
    await client.close();
  });

  it('answers 401 without a bearer token, 405 for GET/DELETE /mcp, and ok on /health', async () => {
    const noAuth = await fetch(mcpUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    expect(noAuth.status).toBe(401);
    const wrong = await fetch(mcpUrl, { method: 'POST', headers: { authorization: 'Bearer nope', 'content-type': 'application/json' }, body: '{}' });
    expect(wrong.status).toBe(401);
    expect((await fetch(mcpUrl, { method: 'GET' })).status).toBe(405);
    expect((await fetch(mcpUrl, { method: 'DELETE' })).status).toBe(405);
    const health = await fetch(mcpUrl.replace('/mcp', '/health'));
    expect(await health.text()).toBe('ok');
    expect((await fetch(mcpUrl.replace('/mcp', '/nope'))).status).toBe(404);
    const bad = await fetch(mcpUrl, { method: 'POST', headers: { authorization: 'Bearer bp_x', 'content-type': 'application/json' }, body: '{not json' });
    expect(bad.status).toBe(400);
  });

  it('logs one line per tool call with only tool, ms and ok', async () => {
    logs.length = 0;
    const client = await connect('bp_secretsecret');
    await client.callTool({ name: 'whoami', arguments: {} });
    await client.callTool({ name: 'get_ledger', arguments: { projectId: 'missing' } });
    await client.close();
    expect(logs).toHaveLength(2);
    expect(logs.map((l) => Object.keys(l).sort())).toEqual([['ms', 'ok', 'tool'], ['ms', 'ok', 'tool']]);
    expect(logs.map((l) => l.ok)).toEqual([true, false]);
    expect(JSON.stringify(logs)).not.toContain('secretsecret');
  });
});
