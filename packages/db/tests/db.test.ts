import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { resetTestDb } from '../src/testing';

const prisma = new PrismaClient();

beforeEach(async () => {
  await resetTestDb(prisma);
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe('database', () => {
  it('creates a user, a project and a decision', async () => {
    const user = await prisma.user.create({ data: { email: 'a@b.co', name: 'A', passwordHash: 'x' } });
    const project = await prisma.project.create({ data: { userId: user.id, name: 'P' } });
    const decision = await prisma.decision.create({ data: { projectId: project.id, key: 'k', value: 'v' } });
    expect(decision.status).toBe('deferred');
    expect(decision.version).toBe(0);
  });

  it('rejects a duplicate (projectId, key)', async () => {
    const user = await prisma.user.create({ data: { email: 'a@b.co', name: 'A', passwordHash: 'x' } });
    const project = await prisma.project.create({ data: { userId: user.id, name: 'P' } });
    await prisma.decision.create({ data: { projectId: project.id, key: 'k' } });
    await expect(prisma.decision.create({ data: { projectId: project.id, key: 'k' } })).rejects.toThrow();
  });

  it('resetTestDb empties tables and refuses a non-test URL', async () => {
    await prisma.user.create({ data: { email: 'a@b.co', name: 'A', passwordHash: 'x' } });
    await resetTestDb(prisma);
    expect(await prisma.user.count()).toBe(0);

    const saved = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgresql://x:y@localhost:5432/blueprint';
    await expect(resetTestDb(prisma)).rejects.toThrow(/refused/);
    process.env.DATABASE_URL = saved;
  });
});
