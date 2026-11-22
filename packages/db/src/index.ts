import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { __blueprintPrisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.__blueprintPrisma ??
  new PrismaClient({ log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'] });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__blueprintPrisma = prisma;
}

export * from '@prisma/client';
export { resetTestDb } from './testing';
