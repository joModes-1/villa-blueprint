import path from 'node:path';
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Load the repository-root .env (Prisma only looks next to the schema by default).
config({ path: path.resolve(__dirname, '../../.env') });

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
});
