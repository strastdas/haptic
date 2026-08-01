import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Standalone test config (no SvelteKit plugin): the tests exercise the plain
// TypeScript storage layer (api modules + IndexedDB), not components.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src/lib', import.meta.url)),
      $lib: fileURLToPath(new URL('./src/lib', import.meta.url))
    }
  },
  test: {
    name: 'web',
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000
  }
});
