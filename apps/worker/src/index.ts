import http from 'node:http';
import PgBoss from 'pg-boss';
import { prisma } from '@blueprint/db';
import { jobOptions, QUEUES, type JobPayloads, type QueueName } from '@blueprint/core';
import { createContext, type WorkerContext } from './context';
import { loadEnv } from './env';
import { analyzeProject } from './jobs/analyze-project';
import { generateDoc } from './jobs/generate-doc';
import { processSource } from './jobs/process-source';
import { runGatesJob } from './jobs/run-gates';
import { scheduleGeneration } from './jobs/schedule-generation';
import { runJob, type JobLike } from './jobs/wrap';

type Handler<Q extends QueueName> = (ctx: WorkerContext, payload: JobPayloads[Q]) => Promise<void>;

/** Handlers by queue. Later tasks register the remaining queues here. */
export const HANDLERS: { [Q in QueueName]?: Handler<Q> } = {
  'process-source': processSource,
  'analyze-project': analyzeProject,
  'schedule-generation': scheduleGeneration,
  'generate-doc': generateDoc,
  'run-gates': runGatesJob,
};

function connectionString(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete('schema');
    u.searchParams.delete('connection_limit');
    u.searchParams.delete('pgbouncer');
    return u.toString();
  } catch {
    return url;
  }
}

async function main(): Promise<void> {
  const env = loadEnv();
  const boss = new PgBoss(connectionString(env.DATABASE_URL));
  boss.on('error', (err) => console.error('pg-boss error:', err.message));
  await boss.start();
  for (const name of QUEUES) await boss.createQueue(name);

  const ctx = createContext(env, {
    enqueue: async (name, data) => {
      await boss.send(name, data, jobOptions(name));
    },
  });

  const concurrency: Record<QueueName, number> = {
    'process-source': 3,
    'analyze-project': 2,
    'schedule-generation': 4,
    'generate-doc': env.GENERATION_CONCURRENCY,
    'run-gates': 2,
  };

  for (const name of QUEUES) {
    const handler = HANDLERS[name] as Handler<QueueName> | undefined;
    if (!handler) continue;
    // pg-boss 10 has no localConcurrency option: N workers on one queue give the same parallelism.
    for (let i = 0; i < concurrency[name]; i++) {
    await boss.work<JobPayloads[QueueName]>(
      name,
      { batchSize: 1, pollingIntervalSeconds: 1, includeMetadata: true },
      async (jobs) => {
        for (const job of jobs) {
          await runJob(ctx, name, job as unknown as JobLike<JobPayloads[QueueName] & { runId: string }>, handler as Handler<QueueName>);
        }
      },
    );
    }
  }

  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('ok');
      return;
    }
    res.writeHead(404).end();
  });
  server.listen(env.WORKER_HEALTH_PORT);

  ctx.logger.info({ port: env.WORKER_HEALTH_PORT, provider: env.AI_PROVIDER }, 'worker ready');

  let stopping = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (stopping) return;
    stopping = true;
    ctx.logger.info({ signal }, 'worker stopping');
    server.close();
    await boss.stop({ graceful: true, timeout: 30_000 });
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
