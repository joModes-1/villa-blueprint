export const QUEUES = ['process-source', 'analyze-project', 'schedule-generation', 'generate-doc', 'run-gates'] as const;
export type QueueName = (typeof QUEUES)[number];

/** docs/27: every queue retries twice, 10 s apart. Default expiry 15 minutes; see JOB_EXPIRY for longer queues. */
export const JOB_OPTIONS = { retryLimit: 2, retryDelay: 10, expireInSeconds: 900 } as const;

/**
 * How long a job may run before pg-boss treats it as dead and starts it again. A source is read in many
 * reasoning-model calls (one 350 KB file took 30+ calls at minutes each), so 15 minutes killed it mid-way,
 * and every restart began again. process-source now checkpoints per batch, and gets hours, not minutes.
 */
export const JOB_EXPIRY: Record<QueueName, number> = {
  'process-source': 6 * 3600,
  'analyze-project': 3600,
  'schedule-generation': 900,
  'generate-doc': 1800,
  'run-gates': 3600,
};

export function jobOptions(name: QueueName): { retryLimit: number; retryDelay: number; expireInSeconds: number } {
  return { ...JOB_OPTIONS, expireInSeconds: JOB_EXPIRY[name] };
}

export interface JobPayloads {
  'process-source': { sourceId: string; runId: string };
  'analyze-project': { projectId: string; runId: string };
  'schedule-generation': { projectId: string; runId: string };
  'generate-doc': { documentId: string; runId: string };
  'run-gates': { projectId: string; runId: string };
}

export const SOURCE_LIMITS = {
  maxSources: 20,
  maxFileBytes: 10 * 1024 * 1024,
  maxTextChars: 200_000,
} as const;
