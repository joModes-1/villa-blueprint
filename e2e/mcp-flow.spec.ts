import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { expect, test } from '@playwright/test';

const ORIGIN = `http://localhost:${process.env.E2E_WEB_PORT ?? '3000'}`;

const text = (r: unknown): string => ((r as { content: { text: string }[] }).content[0] as { text: string }).text;

/** AC-18: drive the whole flow through the real MCP server with the SDK client, using tools only. */
test('MCP: idea in, pack out', async ({ request }) => {
  // A browser session (cookie) is needed once, to create the token.
  const email = `mcp-${Date.now()}@example.com`;
  const signup = await request.post('/api/v1/auth/signup', {
    headers: { origin: ORIGIN },
    data: { name: 'MCP Tester', email, password: 'mcp-Password-12345' },
  });
  expect(signup.status()).toBe(201);
  const cookie = (signup.headers()['set-cookie'] ?? '').split(';')[0] as string;
  const created = await request.post('/api/v1/tokens', { headers: { origin: ORIGIN, cookie }, data: { name: 'e2e' } });
  expect(created.status()).toBe(201);
  const { token } = (await created.json()) as { token: string };

  const client = new Client({ name: 'e2e', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(`http://localhost:${process.env.E2E_MCP_PORT ?? '3102'}/mcp`), { requestInit: { headers: { Authorization: `Bearer ${token}` } } }));
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const res = await client.callTool({ name, arguments: args });
    expect(res.isError, `${name}: ${text(res)}`).toBeFalsy();
    return text(res);
  };

  const project = JSON.parse(await call('create_project', { name: 'MCP Notes' })).project as { id: string };
  await call('add_text_source', {
    projectId: project.id,
    title: 'Brainstorm',
    text: 'A notes app for teams. Users sign up with email. Notes can be tagged. Admins manage members.',
  });
  await call('analyze_project', { projectId: project.id });

  const waitFor = async (status: string, seconds: number) => {
    const deadline = Date.now() + seconds * 1000;
    for (;;) {
      const s = JSON.parse(await call('get_project_status', { projectId: project.id })) as { project: { status: string }; nextStep: string };
      if (s.project.status === status) return s;
      if (s.project.status === 'failed') throw new Error('The run failed');
      if (Date.now() > deadline) throw new Error(`Timed out waiting for ${status}; last status ${s.project.status}`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  };

  const interviewing = await waitFor('interviewing', 90);
  expect(interviewing.nextStep).toContain('list_open_questions');
  await call('accept_recommended_answers', { projectId: project.id });
  await call('generate_pack', { projectId: project.id });
  const ready = await waitFor('ready', 90);
  expect(ready.nextStep).toContain('read_pack_file');

  const files = JSON.parse(await call('list_pack_files', { projectId: project.id })).items as { path: string; status: string }[];
  expect(files.map((f) => f.path)).toContain('START-HERE.md');
  expect(files.every((f) => f.status === 'done')).toBe(true);
  const start = await call('read_pack_file', { projectId: project.id, path: 'START-HERE.md' });
  expect(start).toContain('# START HERE');
  expect(start).toContain('Prompt 1');
  await client.close();
});
