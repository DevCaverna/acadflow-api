import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: {
    alias: {
      '@test': fileURLToPath(new URL('./test', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['test/integration/**/*.int-spec.ts'],
    pool: 'forks',
    globals: true,
    maxWorkers: Number(process.env.TEST_WORKERS ?? 4),
  },
});
