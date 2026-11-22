import http from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createApi } from './api';
import { registerTools, type ToolLogger } from './tools';

export interface McpAppOptions {
  apiUrl: string;
  fetchImpl?: typeof fetch;
  logger?: ToolLogger;
}

function send(res: http.ServerResponse, status: number, body: unknown, type = 'application/json'): void {
  res.writeHead(status, { 'content-type': type });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

async function readBody(req: http.IncomingMessage, limit = 2_000_000): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > limit) throw new Error('Body too large');
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : undefined;
}

/** docs/31: a stateless Streamable HTTP MCP server. Every tool call goes to the REST API with the caller's token. */
export function createMcpApp(opts: McpAppOptions): http.Server {
  return http.createServer(async (req, res) => {
    const path = (req.url ?? '/').split('?')[0];
    if (path === '/health' && req.method === 'GET') return send(res, 200, 'ok', 'text/plain');
    if (path !== '/mcp') return send(res, 404, { error: 'Not found' });
    if (req.method !== 'POST') {
      res.setHeader('allow', 'POST');
      return send(res, 405, { error: 'Method not allowed' });
    }
    const auth = req.headers.authorization ?? '';
    const m = /^Bearer\s+(bp_\S+)$/i.exec(auth);
    if (!m?.[1]) {
      res.setHeader('www-authenticate', 'Bearer');
      return send(res, 401, { error: 'Send an Authorization: Bearer bp_… access token. Create one in Blueprint Settings.' });
    }
    let body: unknown;
    try {
      body = await readBody(req);
    } catch {
      return send(res, 400, { error: 'The request body must be JSON.' });
    }
    const server = new McpServer({ name: 'villa-blueprint', version: '0.1.0' });
    registerTools(server, createApi(opts.apiUrl, m[1], opts.fetchImpl ?? fetch), opts.logger);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, body);
    } catch {
      if (!res.headersSent) send(res, 500, { error: 'Internal server error' });
    }
  });
}
