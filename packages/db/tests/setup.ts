import path from 'node:path';
import { config } from 'dotenv';

config({ path: path.resolve(__dirname, '../../../.env') });
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;
process.env.AI_PROVIDER = 'mock';
process.env.APP_URL = process.env.APP_URL ?? 'http://localhost:3000';
