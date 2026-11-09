import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const configuration = defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true },
  build: { target: 'es2022' },
  test: { globals: true, include: ['src/**/*.spec.ts'] },
});

export { configuration as default };
