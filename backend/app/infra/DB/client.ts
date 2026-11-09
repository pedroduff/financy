import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from './generated/client.js';

export function createDatabase(connectionString: string) {
  return new PrismaClient({
    adapter: new PrismaPg(
      new Pool({
        connectionString,
        connectionTimeoutMillis: 5000,
        max: 10,
      }),
      { disposeExternalPool: true },
    ),
  });
}

export type Database = ReturnType<typeof createDatabase>;
