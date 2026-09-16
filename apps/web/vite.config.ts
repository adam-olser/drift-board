import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('../../shared', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/graphql': { target: 'http://localhost:4000', ws: true },
      '/graphiql': { target: 'http://localhost:4000' },
    },
  },
});
