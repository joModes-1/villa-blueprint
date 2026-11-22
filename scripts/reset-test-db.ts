import path from 'node:path';
import { config } from 'dotenv';

config({ path: path.resolve(__dirname, '../.env') });
// Point the shared Prisma client at the test database before it is created.
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;

async function main(): Promise<void> {
  const { prisma, resetTestDb } = await import('@blueprint/db');
  try {
    await resetTestDb(prisma);
    // pg-boss keeps its jobs in its own schema; clear leftovers from earlier runs.
    const schemas = await prisma.$queryRaw<{ schema_name: string }[]>`SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'pgboss'`;
    if (schemas.length > 0) await prisma.$executeRawUnsafe('TRUNCATE pgboss.job CASCADE');
    console.log('test database reset');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
