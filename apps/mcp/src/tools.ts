import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ToolError, type Api } from './api';

export const MAX_RESULT_CHARS = 100_000;

export const NEXT_STEP: Record<string, string> = {
  draft: 'Add sources, then call analyze_project',
  processing: 'Wait a few seconds and call get_project_status again',
  generating: 'Wait a few seconds and call get_project_status again',
  gating: 'Wait a few seconds and call get_project_status again',
  interviewing: 'Call list_open_questions, then answer them or call accept_recommended_answers',
  ready_to_generate: 'Call generate_pack',
  stale: 'Call generate_pack to regenerate stale documents',
  blocked: 'Call list_findings; fix via set_decision + generate_pack, or accept_finding',
  ready: 'Call list_pack_files and read_pack_file to get the pack',
  failed: 'Retry in the web app (Retry button), then check again',
};

export interface ToolResult {
  [key: string]: unknown;
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}

export function asText(data: unknown): string {
  const text = typeof data === 'string' ? data : (JSON.stringify(data, null, 2) ?? 'null');
  return text.length > MAX_RESULT_CHARS ? `${text.slice(0, MAX_RESULT_CHARS - 12)}…(truncated)` : text;
}

const ok = (data: unknown): ToolResult => ({ content: [{ type: 'text', text: asText(data) }] });
const fail = (code: string, message: string): ToolResult => ({ content: [{ type: 'text', text: `${code}: ${message}` }], isError: true });

export interface ToolLogger {
  info: (obj: Record<string, unknown>, msg: string) => void;
}

const pid = z.string().min(1);
const enc = encodeURIComponent;

interface ToolDef {
  name: string;
  title: string;
  description: string;
  shape: z.ZodRawShape;
  run: (api: Api, input: Record<string, unknown>) => Promise<unknown>;
}

/** The 17 tools of docs/31, descriptions verbatim. */
export const TOOLS: ToolDef[] = [
  {
    name: 'whoami',
    title: 'Who am I',
    description: 'Show which Blueprint account this connection uses.',
    shape: {},
    run: (api) => api.call('GET', '/me'),
  },
  {
    name: 'list_projects',
    title: 'List projects',
    description: 'List my Blueprint projects with their status.',
    shape: {},
    run: (api) => api.call('GET', '/projects'),
  },
  {
    name: 'create_project',
    title: 'Create project',
    description: 'Create a Blueprint project for a new product idea. Founder mode asks fewer questions.',
    shape: { name: z.string().min(1).max(80), mode: z.enum(['founder', 'expert']).optional() },
    run: (api, i) => api.call('POST', '/projects', { name: i.name, ...(i.mode ? { mode: i.mode } : {}) }),
  },
  {
    name: 'add_text_source',
    title: 'Add text source',
    description:
      'Add material about the idea: a brainstorm conversation, notes, requirements, or a design description. To share a Figma design, first read it with your Figma tools, then send the screens, components, visible texts and design tokens as markdown, with a title starting "Figma: ". Send long conversations whole; do not summarize them.',
    shape: {
      projectId: pid,
      title: z.string().min(1).max(120),
      text: z.string().min(1).max(200_000),
      kind: z.enum(['text', 'markdown']).default('markdown'),
    },
    run: (api, i) => api.call('POST', `/projects/${enc(String(i.projectId))}/sources`, { kind: i.kind ?? 'markdown', title: i.title, text: i.text }),
  },
  {
    name: 'add_figma_source',
    title: 'Add Figma source',
    description:
      'Import a Figma file directly with a Figma personal access token. The token is used once and never stored. Prefer `add_text_source` when you can read Figma yourself.',
    shape: { projectId: pid, url: z.string().min(1), figmaToken: z.string().min(1) },
    run: (api, i) => api.call('POST', `/projects/${enc(String(i.projectId))}/sources`, { kind: 'figma', url: i.url, token: i.figmaToken }),
  },
  {
    name: 'analyze_project',
    title: 'Analyze project',
    description:
      'Extract facts from all new sources and find the decisions that are still open. Runs in the background: poll `get_project_status`.',
    shape: { projectId: pid },
    run: (api, i) => api.call('POST', `/projects/${enc(String(i.projectId))}/analyze`),
  },
  {
    name: 'get_project_status',
    title: 'Get project status',
    description: 'Get the project status, counts, background progress, and the suggested next step.',
    shape: { projectId: pid },
    run: async (api, i) => {
      const id = enc(String(i.projectId));
      const [p, r] = await Promise.all([
        api.call<{ project: { status: string }; counts: unknown }>('GET', `/projects/${id}`),
        api.call<{ run: unknown }>('GET', `/projects/${id}/runs/latest`),
      ]);
      return { project: p.project, counts: p.counts, latestRun: r.run, nextStep: NEXT_STEP[p.project.status] ?? 'Check the web app' };
    },
  },
  {
    name: 'list_open_questions',
    title: 'List open questions',
    description: 'List the questions Blueprint still needs answered, with options and a recommended answer.',
    shape: { projectId: pid },
    run: async (api, i) => {
      const r = await api.call<{ items: { status: string }[] }>('GET', `/projects/${enc(String(i.projectId))}/questions`);
      return { items: r.items.filter((q) => q.status === 'open') };
    },
  },
  {
    name: 'answer_question',
    title: 'Answer question',
    description: 'Answer one open question.',
    shape: { projectId: pid, questionId: pid, answer: z.string().min(1).max(2000) },
    run: (api, i) => api.call('POST', `/projects/${enc(String(i.projectId))}/questions/${enc(String(i.questionId))}/answer`, { answer: i.answer }),
  },
  {
    name: 'accept_recommended_answers',
    title: 'Accept recommended answers',
    description: 'Accept the recommended answer for every open question.',
    shape: { projectId: pid },
    run: (api, i) => api.call('POST', `/projects/${enc(String(i.projectId))}/questions/accept-recommended`),
  },
  {
    name: 'get_ledger',
    title: 'Get ledger',
    description: 'Show every product decision: value, status and priority.',
    shape: { projectId: pid },
    run: (api, i) => api.call('GET', `/projects/${enc(String(i.projectId))}/decisions`),
  },
  {
    name: 'set_decision',
    title: 'Set decision',
    description: 'Change a decision. Documents that depend on it become stale and need regenerating.',
    shape: { projectId: pid, key: z.string().min(1), value: z.string().max(2000), status: z.enum(['confirmed', 'assumed', 'deferred']) },
    run: (api, i) => api.call('PATCH', `/projects/${enc(String(i.projectId))}/decisions/${enc(String(i.key))}`, { value: i.value, status: i.status }),
  },
  {
    name: 'generate_pack',
    title: 'Generate pack',
    description:
      'Generate (or regenerate stale parts of) the build pack. Runs in the background: poll `get_project_status`.',
    shape: { projectId: pid },
    run: (api, i) => api.call('POST', `/projects/${enc(String(i.projectId))}/generate`),
  },
  {
    name: 'list_findings',
    title: 'List findings',
    description:
      'List quality-gate findings. Blockers must be fixed (by changing decisions and regenerating) or accepted before the pack can be used.',
    shape: { projectId: pid },
    run: (api, i) => api.call('GET', `/projects/${enc(String(i.projectId))}/findings`),
  },
  {
    name: 'accept_finding',
    title: 'Accept finding',
    description: 'Accept a finding with a reason.',
    shape: { projectId: pid, findingId: pid, reason: z.string().min(3).max(500) },
    run: (api, i) => api.call('POST', `/projects/${enc(String(i.projectId))}/findings/${enc(String(i.findingId))}/accept`, { reason: i.reason }),
  },
  {
    name: 'list_pack_files',
    title: 'List pack files',
    description: 'List the files of the generated pack with their status.',
    shape: { projectId: pid },
    run: (api, i) => api.call('GET', `/projects/${enc(String(i.projectId))}/documents`),
  },
  {
    name: 'read_pack_file',
    title: 'Read pack file',
    description:
      'Read one pack file. To build the product: read every file from `list_pack_files`, write each to the same path in an empty repository, then follow `START-HERE.md`.',
    shape: { projectId: pid, path: z.string().min(1) },
    run: async (api, i) => {
      const r = await api.call<{ content: string }>('GET', `/projects/${enc(String(i.projectId))}/documents/content?path=${enc(String(i.path))}`);
      return r.content; // raw file text, so a client can write it straight to disk
    },
  },
];

export function registerTools(server: McpServer, api: Api, logger?: ToolLogger): void {
  for (const tool of TOOLS) {
    server.registerTool(tool.name, { title: tool.title, description: tool.description, inputSchema: tool.shape }, async (input: Record<string, unknown>) => {
      const started = Date.now();
      let result: ToolResult;
      try {
        result = ok(await tool.run(api, input));
      } catch (err) {
        result = err instanceof ToolError ? fail(err.code, err.message) : fail('INTERNAL', 'Unexpected error in the Blueprint MCP server.');
      }
      logger?.info({ tool: tool.name, ms: Date.now() - started, ok: !result.isError }, 'tool call');
      return result;
    });
  }
}
