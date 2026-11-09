import { defineConfig } from 'vitest/config';

const configuration = defineConfig({
  test: {
    globals: true,
    include: ['app/**/*.spec.ts'],
    exclude:
      process.env.RUN_DB_TESTS === '1' ? [] : ['**/*.integration.spec.ts'],
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});

export { configuration as default };
