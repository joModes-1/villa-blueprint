import PgBoss from 'pg-boss';
import { jobOptions, QUEUES, type JobPayloads, type QueueName } from '@blueprint/core';

const g = globalThis as unknown as { __blueprintBoss?: Promise<PgBoss> };

/** pg-boss wants a plain connection string: drop Prisma-only query parameters such as `schema`. */
export function boss_connection_string(url: string): string {
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

/** The web process only *sends* jobs. One lazily started PgBoss instance per process. */
export function getBoss(): Promise<PgBoss> {
  g.__blueprintBoss ??= (async () => {
    const boss = new PgBoss(boss_connection_string(process.env.DATABASE_URL ?? ''));
    boss.on('error', () => {
      /* connection errors are surfaced by the next send */
    });
    await boss.start();
    for (const name of QUEUES) await boss.createQueue(name);
    return boss;
  })().catch((err) => {
    g.__blueprintBoss = undefined;
    throw err;
  });
  return g.__blueprintBoss;
}

export async function enqueue<Q extends QueueName>(name: Q, data: JobPayloads[Q]): Promise<void> {
  const boss = await getBoss();
  await boss.send(name, data, jobOptions(name));
}
