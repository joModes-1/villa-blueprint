import path from 'node:path';
import { config as loadDotenv } from 'dotenv';
import pino from 'pino';
import { z } from 'zod';
import { createMcpApp } from './server';

loadDotenv({ path: path.resolve(__dirname, '../../../.env') });

const env = z
  .object({
    MCP_PORT: z.coerce.number().int().min(0).default(3102),
    API_URL: z.string().url().default('http://localhost:3000'),
    LOG_LEVEL: z.string().default('info'),
  })
  .parse(process.env);

const logger = pino({ level: env.LOG_LEVEL, redact: { paths: ['token', 'authorization', 'headers.authorization'], censor: '[Redacted]' } });
const server = createMcpApp({ apiUrl: env.API_URL, logger });

server.listen(env.MCP_PORT, () => logger.info({ port: env.MCP_PORT, apiUrl: env.API_URL }, 'mcp ready'));

const shutdown = (signal: string): void => {
  logger.info({ signal }, 'mcp stopping');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
