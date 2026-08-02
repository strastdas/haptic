import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/core/vitest.config.ts',
      'apps/web/vitest.config.ts',
      'apps/api/vitest.config.ts'
    ],
    coverage: {
      provider: 'v8',
      include: ['packages/core/src/**', 'apps/web/src/lib/**']
    }
  }
});
