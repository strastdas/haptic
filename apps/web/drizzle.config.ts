import { defineConfig } from 'drizzle-kit';

// Used only at development time to generate SQL migrations into
// src/lib/database/migrations; the browser applies them via the runner in
// src/lib/database/migrations/index.ts (no live database connection here).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/database/schema.ts',
  out: './src/lib/database/migrations'
});
