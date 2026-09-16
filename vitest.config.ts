import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['shared/**/*.test.ts', 'apps/**/src/**/*.test.ts'],
    passWithNoTests: true,
  },
  resolve: { alias: { '@shared': new URL('./shared', import.meta.url).pathname } },
});
