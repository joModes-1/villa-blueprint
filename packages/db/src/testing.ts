import type { PrismaClient } from '@prisma/client';

const TABLES = [
  'usage_events',
  'gate_findings',
  'pipeline_runs',
  'documents',
  'decisions',
  'questions',
  'facts',
  'sources',
  'projects',
  'login_attempts',
  'sessions',
  'api_tokens',
  'users',
];

/** Truncates every app table. Refuses to run unless DATABASE_URL points at a *_test database. */
export async function resetTestDb(prisma: PrismaClient): Promise<void> {
  const url = process.env.DATABASE_URL ?? '';
  if (!url.includes('_test')) {
    throw new Error('resetTestDb refused: DATABASE_URL does not contain "_test".');
  }
  const list = TABLES.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}
