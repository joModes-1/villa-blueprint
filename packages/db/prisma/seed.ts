import path from 'node:path';
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

config({ path: path.resolve(__dirname, '../../../.env') });

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.log('Seed skipped in production.');
    return;
  }
  const prisma = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash('demo-password-123', 12);
    await prisma.user.upsert({
      where: { email: 'demo@blueprint.local' },
      update: {},
      create: { email: 'demo@blueprint.local', name: 'Demo User', passwordHash },
    });
    console.log('Seed complete: demo@blueprint.local');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
