import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const configuration = defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://app:app@localhost:5432/app',
  },
});

export { configuration as default };
