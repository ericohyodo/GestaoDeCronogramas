import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@contratos': fileURLToPath(new URL('./contratos', import.meta.url)),
    },
  },
  test: {
    include: ['testes/**/*.test.ts'],
    environment: 'node',
  },
});
